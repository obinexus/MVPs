#include <regex.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// State structure for the regex automaton
typedef struct State {
    char *pattern;
    bool is_final;
    size_t id;
} State;

// Token representation
typedef struct TokenNode {
    char *type;
    char *value;
} TokenNode;

// Create a state with a given regex pattern
State *
state_create(const char *pattern, bool is_final)
{
    State *state = malloc(sizeof(State));
    if (!state)
        return NULL;

    state->pattern = strdup(pattern);
    state->is_final = is_final;

    // Simple ID generation
    static size_t next_id = 1;
    state->id = next_id++;

    return state;
}

// Check if text matches a state's regex pattern
bool
state_matches(State *state, const char *text)
{
    if (!state || !text)
        return false;

    regex_t regex;
    int result;

    // Compile the regex pattern
    result = regcomp(&regex, state->pattern, REG_EXTENDED);
    if (result)
        return false;

    // Execute the regex match
    result = regexec(&regex, text, 0, NULL, 0);
    regfree(&regex);

    return (result == 0);
}

// Demo of LibRift's language processing capabilities
void
demonstrate_librift_tokenization()
{
    printf("LibRift Demonstration: Regex-Based Language Tokenization\n");
    printf("-----------------------------------------------------\n");

    // Define token patterns for a simple language
    State *identifier = state_create("^[a-zA-Z_]\\w*$", false);
    State *number = state_create("^\\d+$", false);
    State *operator= state_create("^[+\\-*/]$", false);

    // Test tokens to demonstrate tokenization
    const char *tokens[] = {"x", "+", "123", "*", "y", "42"};
    int token_count = sizeof(tokens) / sizeof(tokens[0]);

    printf("Tokenization Results:\n");
    for (int i = 0; i < token_count; i++) {
        const char *token = tokens[i];

        // Determine token type
        State *matching_state = NULL;
        if (state_matches(identifier, token)) {
            matching_state = identifier;
            printf("Token: %-5s | Type: Identifier\n", token);
        } else if (state_matches(number, token)) {
            matching_state = number;
            printf("Token: %-5s | Type: Number\n", token);
        } else if (state_matches(operator, token)) {
            matching_state = operator;
            printf("Token: %-5s | Type: Operator\n", token);
        } else {
            printf("Token: %-5s | Type: Unknown\n", token);
        }
    }

    // Clean up
    free(identifier->pattern);
    free(identifier);
    free(number->pattern);
    free(number);
    free(operator->pattern);
    free(operator);
}

int
main()
{
    demonstrate_librift_tokenization();
    return 0;
}