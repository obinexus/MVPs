// include/diram/core/parser/ast.h
// DIRAM Abstract Syntax Tree with Visitor Pattern
// OBINexus Aegis Project - Zero-overhead transformation

#ifndef DIRAM_AST_H
#define DIRAM_AST_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

// Forward declarations
typedef struct diram_ast_node diram_ast_node_t;
typedef struct diram_ast_visitor diram_ast_visitor_t;

// AST Node Types
typedef enum {
    AST_NODE_ROOT,
    AST_NODE_ALLOCATION,
    AST_NODE_OPCODE,
    AST_NODE_CONSTRAINT,
    AST_NODE_POLICY,
    AST_NODE_FEATURE_TOGGLE,
    AST_NODE_MEMORY_REGION,
    AST_NODE_OPERAND,
    AST_NODE_BUILD_TARGET
} diram_ast_node_type_t;

// Evaluation Rule for binding to core functions
typedef struct {
    const char* function_name;      // Core system function to bind
    void* function_ptr;             // Function pointer
    uint32_t flags;                 // Binding flags
} diram_evaluation_rule_t;

// Base AST Node Structure
struct diram_ast_node {
    diram_ast_node_type_t type;
    
    // Node properties
    union {
        // Allocation Node
        struct {
            size_t size;
            const char* tag;
            uint64_t address;
            char sha256_receipt[65];
        } allocation;
        
        // Opcode Node
        struct {
            const char* name;
            uint8_t code;
            uint8_t operand_count;
            diram_ast_node_t** operands;
        } opcode;
        
        // Constraint Node
        struct {
            const char* name;
            double epsilon_value;
            uint32_t max_heap_events;
        } constraint;
        
        // Policy Node
        struct {
            const char* name;
            const char* type;
            bool enforced;
            char** rules;
            size_t rule_count;
        } policy;
        
        // Feature Toggle Node
        struct {
            const char* name;
            bool enabled;
            const char* description;
            const char* policy;
        } feature;
        
        // Memory Region Node
        struct {
            const char* name;
            uint64_t base_address;
            size_t size;
            uint8_t protection_flags;  // r=4, w=2, x=1
        } memory_region;
        
        // Operand Node
        struct {
            const char* name;
            const char* type;
            uint32_t position;
            union {
                uint64_t integer_value;
                void* pointer_value;
                const char* string_value;
            } value;
        } operand;
        
        // Build Target Node
        struct {
            const char* name;
            const char* platform;
            const char* compiler;
            const char* flags;
        } build_target;
    } data;
    
    // Tree structure
    diram_ast_node_t* parent;
    diram_ast_node_t** children;
    size_t child_count;
    size_t child_capacity;
    
    // Evaluation rule binding
    diram_evaluation_rule_t* rule;
    
    // Visitor pattern support
    void* (*accept)(struct diram_ast_node* self, diram_ast_visitor_t* visitor);
};

// Visitor Interface for Zero-Overhead Transformation
struct diram_ast_visitor {
    // Visitor methods for each node type
    void* (*visit_root)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_allocation)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_opcode)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_constraint)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_policy)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_feature_toggle)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_memory_region)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_operand)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    void* (*visit_build_target)(diram_ast_visitor_t* self, diram_ast_node_t* node);
    
    // Visitor context data
    void* context;
};

// AST Node Creation
diram_ast_node_t* diram_ast_create_node(diram_ast_node_type_t type);
void diram_ast_destroy_node(diram_ast_node_t* node);

// Tree Operations
bool diram_ast_add_child(diram_ast_node_t* parent, diram_ast_node_t* child);
bool diram_ast_remove_child(diram_ast_node_t* parent, diram_ast_node_t* child);
diram_ast_node_t* diram_ast_find_child(diram_ast_node_t* parent, 
                                        diram_ast_node_type_t type,
                                        const char* name);

// Node Factory Functions
diram_ast_node_t* diram_ast_create_allocation(size_t size, const char* tag);
diram_ast_node_t* diram_ast_create_opcode(const char* name, uint8_t code);
diram_ast_node_t* diram_ast_create_constraint(const char* name, double epsilon);
diram_ast_node_t* diram_ast_create_policy(const char* name, const char* type);
diram_ast_node_t* diram_ast_create_feature_toggle(const char* name, bool enabled);
diram_ast_node_t* diram_ast_create_memory_region(const char* name, uint64_t base, size_t size);

// Visitor Pattern Implementation
void* diram_ast_accept(diram_ast_node_t* node, diram_ast_visitor_t* visitor);

// AST Utilities
void diram_ast_print(diram_ast_node_t* node, int depth);
bool diram_ast_validate(diram_ast_node_t* node);
size_t diram_ast_count_nodes(diram_ast_node_t* root);

#endif // DIRAM_AST_H
