#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <regex.h>

// Structure definitions
typedef struct State {
    char* pattern;
    bool is_final;
    size_t id;
} State;

typedef struct Transition {
    State* from_state;
    char* input_pattern;
    State* to_state;
} Transition;

typedef struct RegexAutomaton {
    State** states;
    size_t state_count;
    size_t state_capacity;
    Transition** transitions;
    size_t transition_count;
    size_t transition_capacity;
    State* initial_state;
    State* current_state;
} RegexAutomaton;

typedef struct TokenNode {
    char* type;
    char* value;
} TokenNode;

typedef struct IRGenerator {
    RegexAutomaton* automaton;
    TokenNode** nodes;
    size_t node_count;
    size_t node_capacity;
} IRGenerator;

// Helper functions
static size_t next_id = 1;
static size_t generate_id(void) {
    return next_id++;
}

// State functions
State* state_create(const char* pattern, bool is_final) {
    State* state = malloc(sizeof(State));
    if (!state) return NULL;
    
    state->pattern = strdup(pattern);
    if (!state->pattern) {
        free(state);
        return NULL;
    }
    
    state->is_final = is_final;
    state->id = generate_id();
    return state;
}

void state_destroy(State* state) {
    if (!state) return;
    free(state->pattern);
    free(state);
}

bool state_matches(State* state, const char* text) {
    if (!state || !text) return false;
    
    regex_t regex;
    int result;
    
    result = regcomp(&regex, state->pattern, REG_EXTENDED);
    if (result) return false;
    
    result = regexec(&regex, text, 0, NULL, 0);
    regfree(&regex);
    
    return (result == 0);
}

// Automaton functions
RegexAutomaton* automaton_create(void) {
    RegexAutomaton* automaton = malloc(sizeof(RegexAutomaton));
    if (!automaton) return NULL;
    
    automaton->state_capacity = 10;
    automaton->states = malloc(sizeof(State*) * automaton->state_capacity);
    if (!automaton->states) {
        free(automaton);
        return NULL;
    }
    
    automaton->transition_capacity = 20;
    automaton->transitions = malloc(sizeof(Transition*) * automaton->transition_capacity);
    if (!automaton->transitions) {
        free(automaton->states);
        free(automaton);
        return NULL;
    }
    
    automaton->state_count = 0;
    automaton->transition_count = 0;
    automaton->initial_state = NULL;
    automaton->current_state = NULL;
    
    return automaton;
}

void automaton_destroy(RegexAutomaton* automaton) {
    if (!automaton) return;
    
    for (size_t i = 0; i < automaton->state_count; i++) {
        state_destroy(automaton->states[i]);
    }
    free(automaton->states);
    
    for (size_t i = 0; i < automaton->transition_count; i++) {
        free(automaton->transitions[i]->input_pattern);
        free(automaton->transitions[i]);
    }
    free(automaton->transitions);
    
    free(automaton);
}

State* automaton_add_state(RegexAutomaton* automaton, const char* pattern, bool is_final) {
    if (!automaton || !pattern) return NULL;
    
    // Check capacity
    if (automaton->state_count >= automaton->state_capacity) {
        size_t new_capacity = automaton->state_capacity * 2;
        State** new_states = realloc(automaton->states, sizeof(State*) * new_capacity);
        if (!new_states) return NULL;
        
        automaton->states = new_states;
        automaton->state_capacity = new_capacity;
    }
    
    State* state = state_create(pattern, is_final);
    if (!state) return NULL;
    
    automaton->states[automaton->state_count++] = state;
    
    if (!automaton->initial_state) {
        automaton->initial_state = state;
        automaton->current_state = state;
    }
    
    return state;
}

bool automaton_add_transition(RegexAutomaton* automaton, State* from, const char* pattern, State* to) {
    if (!automaton || !from || !pattern || !to) return false;
    
    // Check capacity
    if (automaton->transition_count >= automaton->transition_capacity) {
        size_t new_capacity = automaton->transition_capacity * 2;
        Transition** new_transitions = realloc(automaton->transitions, 
                                             sizeof(Transition*) * new_capacity);
        if (!new_transitions) return false;
        
        automaton->transitions = new_transitions;
        automaton->transition_capacity = new_capacity;
    }
    
    Transition* transition = malloc(sizeof(Transition));
    if (!transition) return false;
    
    transition->from_state = from;
    transition->input_pattern = strdup(pattern);
    if (!transition->input_pattern) {
        free(transition);
        return false;
    }
    transition->to_state = to;
    
    automaton->transitions[automaton->transition_count++] = transition;
    return true;
}

State* automaton_get_next_state(RegexAutomaton* automaton, const char* input) {
    if (!automaton || !automaton->current_state || !input) return NULL;
    
    // Try direct pattern matching first
    for (size_t i = 0; i < automaton->state_count; i++) {
        if (state_matches(automaton->states[i], input)) {
            automaton->current_state = automaton->states[i];
            return automaton->states[i];
        }
    }
    
    return NULL;
}

// IR Generator functions
IRGenerator* ir_generator_create(RegexAutomaton* automaton) {
    if (!automaton) return NULL;
    
    IRGenerator* generator = malloc(sizeof(IRGenerator));
    if (!generator) return NULL;
    
    generator->automaton = automaton;
    generator->node_capacity = 10;
    generator->nodes = malloc(sizeof(TokenNode*) * generator->node_capacity);
    if (!generator->nodes) {
        free(generator);
        return NULL;
    }
    
    generator->node_count = 0;
    return generator;
}

void ir_generator_destroy(IRGenerator* generator) {
    if (!generator) return;
    
    for (size_t i = 0; i < generator->node_count; i++) {
        free(generator->nodes[i]->type);
        free(generator->nodes[i]->value);
        free(generator->nodes[i]);
    }
    
    free(generator->nodes);
    free(generator);
}

TokenNode* ir_generator_process_token(IRGenerator* generator, const char* token) {
    if (!generator || !token) return NULL;
    
    State* next_state = automaton_get_next_state(generator->automaton, token);
    if (!next_state) return NULL;
    
    TokenNode* node = malloc(sizeof(TokenNode));
    if (!node) return NULL;
    
    node->type = strdup(next_state->pattern);
    node->value = strdup(token);
    
    if (!node->type || !node->value) {
        free(node->type);
        free(node->value);
        free(node);
        return NULL;
    }
    
    return node;
}

// Example usage
void create_simple_lexer(void) {
    RegexAutomaton* automaton = automaton_create();
    
    // Add states
    State* identifier = automaton_add_state(automaton, "^[a-zA-Z_]\\w*$", false);
    State* number = automaton_add_state(automaton, "^\\d+$", false);
    State* operator = automaton_add_state(automaton, "^[+\\-*/]$", false);
    State* whitespace = automaton_add_state(automaton, "^\\s+$", false);
    
    if (!identifier || !number || !operator || !whitespace) {
        printf("Failed to create states\n");
        automaton_destroy(automaton);
        return;
    }
    
    // Create IR generator
    IRGenerator* generator = ir_generator_create(automaton);
    if (!generator) {
        printf("Failed to create IR generator\n");
        automaton_destroy(automaton);
        return;
    }
    
    // Test tokens
    const char* tokens[] = {"x", "+", "123", "*", "y"};
    size_t token_count = sizeof(tokens) / sizeof(tokens[0]);
    
    printf("Generated IR nodes:\n");
    for (size_t i = 0; i < token_count; i++) {
        TokenNode* node = ir_generator_process_token(generator, tokens[i]);
        if (node) {
            printf("Type: %s, Value: %s\n", node->type, node->value);
            free(node->type);
            free(node->value);
            free(node);
        }
    }
    
    ir_generator_destroy(generator);
    automaton_destroy(automaton);
}

int main(void) {
    create_simple_lexer();
    return 0;
}
