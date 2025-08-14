// include/diram/core/parser/parser.h
// DIRAM Single-Pass Parser State Machine
// OBINexus Aegis Project - Zero backtracking, O(n) complexity

#ifndef DIRAM_PARSER_H
#define DIRAM_PARSER_H

#include "tokenizer.h"
#include "ast.h"
#include <stdbool.h>

// Parser State Enumeration
typedef enum {
    PARSER_STATE_INIT,
    PARSER_STATE_DOCUMENT,
    PARSER_STATE_METADATA,
    PARSER_STATE_FEATURES,
    PARSER_STATE_OPCODES,
    PARSER_STATE_POLICIES,
    PARSER_STATE_MEMORY_REGIONS,
    PARSER_STATE_BUILD,
    PARSER_STATE_ERROR,
    PARSER_STATE_COMPLETE
} diram_parser_state_t;

// Parser Context for Single-Pass Translation
typedef struct {
    diram_tokenizer_t* tokenizer;      // Token source
    diram_parser_state_t state;        // Current state
    diram_ast_node_t* root;           // AST root node
    diram_ast_node_t* current_node;   // Current AST node being built
    
    // Parser configuration
    bool strict_mode;                  // Enforce strict XML compliance
    bool validate_policies;            // Validate policy constraints
    bool emit_ast_immediately;         // Emit AST nodes without buffering
    
    // Error tracking
    bool has_error;
    char error_message[512];
    uint32_t error_line;
    uint32_t error_column;
    
    // Policy enforcement
    void (*policy_violation_handler)(const char* violation);
} diram_parser_t;

// Parser API - Single-Pass, Zero IR
diram_parser_t* diram_parser_create(const char* xml_input, size_t length);
void diram_parser_destroy(diram_parser_t* parser);

// Main parsing function - O(n) complexity, no backtracking
diram_ast_node_t* diram_parser_parse(diram_parser_t* parser);

// State transitions (internal, but exposed for testing)
bool diram_parser_transition(diram_parser_t* parser, diram_parser_state_t new_state);
bool diram_parser_consume_token(diram_parser_t* parser, diram_token_t* token);

// Direct AST emission - no intermediate representation
bool diram_parser_emit_feature_toggle(diram_parser_t* parser, const char* name, bool enabled);
bool diram_parser_emit_opcode(diram_parser_t* parser, const char* name, uint8_t code);
bool diram_parser_emit_policy(diram_parser_t* parser, const char* name, const char* type);
bool diram_parser_emit_memory_region(diram_parser_t* parser, const char* name, uint64_t base, size_t size);

// Policy violation handling
void diram_parser_set_policy_handler(diram_parser_t* parser, 
                                     void (*handler)(const char*));
void diram_parser_policy_violation(diram_parser_t* parser, const char* violation);

// Error handling
bool diram_parser_has_error(const diram_parser_t* parser);
const char* diram_parser_get_error(const diram_parser_t* parser);

// Parser utilities
bool diram_parser_validate_constraint(const char* constraint);
bool diram_parser_validate_opcode(uint8_t code);
bool diram_parser_validate_memory_protection(const char* protection);

#endif // DIRAM_PARSER_H
