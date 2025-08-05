// include/diram/core/parser/tokenizer.h
// DIRAM XML Tokenizer with Three-Layer Token Architecture
// OBINexus Aegis Project

#ifndef DIRAM_TOKENIZER_H
#define DIRAM_TOKENIZER_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

// Token Type Enumeration - Semantic role of token
typedef enum {
    TOKEN_NONE = 0,
    
    // XML Structure Tokens
    TOKEN_XML_START,
    TOKEN_XML_END,
    TOKEN_ELEMENT_START,
    TOKEN_ELEMENT_END,
    TOKEN_ATTRIBUTE_NAME,
    TOKEN_ATTRIBUTE_VALUE,
    TOKEN_TEXT,
    
    // DIRAM-Specific Tokens
    TOKEN_MEMORY_REGION,
    TOKEN_OPCODE,
    TOKEN_OPERAND,
    TOKEN_POLICY_FLAG,
    TOKEN_FEATURE_TOGGLE,
    TOKEN_CONSTRAINT,
    TOKEN_NIL_TYPE,
    
    // Value Tokens
    TOKEN_INTEGER,
    TOKEN_HEX_VALUE,
    TOKEN_BOOLEAN,
    TOKEN_STRING,
    TOKEN_IDENTIFIER,
    
    // Control Tokens
    TOKEN_EOF,
    TOKEN_ERROR
} diram_token_type_t;

// Token Memory Classification - Memory space or region
typedef enum {
    MEMORY_NONE = 0,
    MEMORY_SYSTEM,          // System memory region
    MEMORY_USERSPACE,       // User-accessible memory
    MEMORY_TRACE_BUFFER,    // Trace logging buffer
    MEMORY_HEAP,            // Heap allocation space
    MEMORY_STACK,           // Stack allocation space
    MEMORY_REGISTER,        // CPU register (for assembly)
    MEMORY_CONSTANT,        // Constant/literal value
    MEMORY_VIRTUAL          // Virtual/unmapped memory
} diram_token_memory_t;

// Three-Layer Token Structure
typedef struct {
    // Layer 1: Token Type - Semantic role
    diram_token_type_t type;
    
    // Layer 2: Token Memory - Memory classification
    diram_token_memory_t memory;
    
    // Layer 3: Token Value - Actual content
    union {
        uint64_t integer_value;
        void* pointer_value;
        bool boolean_value;
        struct {
            char* data;
            size_t length;
        } string_value;
        struct {
            uint64_t base;
            size_t size;
        } memory_region;
    } value;
    
    // Metadata
    uint32_t line;
    uint32_t column;
    char* source_file;
} diram_token_t;

// Tokenizer State Machine
typedef struct {
    const char* input;          // Input XML buffer
    size_t length;              // Input length
    size_t position;            // Current position
    uint32_t line;              // Current line number
    uint32_t column;            // Current column number
    
    // State tracking
    bool in_element;
    bool in_attribute;
    bool in_text;
    
    // Error handling
    char error_buffer[256];
    bool has_error;
} diram_tokenizer_t;

// Tokenizer API
diram_tokenizer_t* diram_tokenizer_create(const char* input, size_t length);
void diram_tokenizer_destroy(diram_tokenizer_t* tokenizer);

// Single-pass tokenization
diram_token_t diram_tokenizer_next(diram_tokenizer_t* tokenizer);
bool diram_tokenizer_has_error(const diram_tokenizer_t* tokenizer);
const char* diram_tokenizer_get_error(const diram_tokenizer_t* tokenizer);

// Token utilities
const char* diram_token_type_to_string(diram_token_type_t type);
const char* diram_token_memory_to_string(diram_token_memory_t memory);
void diram_token_free(diram_token_t* token);

// XML-specific tokenization helpers
bool diram_tokenizer_is_element_name(const char* name);
bool diram_tokenizer_is_attribute_name(const char* name);
diram_token_memory_t diram_tokenizer_classify_memory(const char* region_name);

#endif // DIRAM_TOKENIZER_H
