// include/diram/core/hotwire/hotwire.h
// DIRAM Hotwire Zero-Overhead Transformation Layer
// OBINexus Aegis Project - Direct AST to Target Translation

#ifndef DIRAM_HOTWIRE_H
#define DIRAM_HOTWIRE_H

#include "../parser/ast.h"
#include <stdint.h>
#include <stdbool.h>

// Target Platform Enumeration
typedef enum {
    HOTWIRE_TARGET_NATIVE_ASM,     // x86_64 Assembly
    HOTWIRE_TARGET_WASM,           // WebAssembly
    HOTWIRE_TARGET_LLVM_IR,        // LLVM IR (future)
    HOTWIRE_TARGET_RISCV           // RISC-V Assembly (future)
} diram_hotwire_target_t;

// Feature Toggle State
typedef struct {
    const char* name;
    bool enabled;
    bool allowed;               // Policy allows this feature
    bool activated;             // Currently active
    uint32_t policy_flags;      // Zero-trust policy flags
} diram_feature_state_t;

// Hotwire Execution Table
typedef struct {
    diram_feature_state_t* features;
    size_t feature_count;
    size_t feature_capacity;
    
    // Policy enforcement callbacks
    bool (*policy_check)(const char* feature_name, uint32_t flags);
    void (*policy_violation)(const char* feature_name, const char* reason);
} diram_hotwire_table_t;

// Hotwire Transformer Context
typedef struct {
    diram_hotwire_target_t target;
    diram_hotwire_table_t* execution_table;
    
    // Output buffers
    char* output_buffer;
    size_t output_size;
    size_t output_capacity;
    
    // Target-specific configuration
    union {
        struct {
            const char* arch;      // x86_64, arm64, etc.
            bool use_intel_syntax;
            bool optimize_size;
        } asm_config;
        
        struct {
            bool use_simd;
            bool enable_threads;
            uint32_t memory_pages;
        } wasm_config;
    } config;
    
    // Transformation state
    uint32_t current_offset;
    uint32_t label_counter;
    bool in_function;
    
    // Error handling
    bool has_error;
    char error_message[256];
} diram_hotwire_context_t;

// Assembly Instruction Mnemonics
typedef enum {
    ASM_MV,      // Move
    ASM_LOAD,    // Load from memory
    ASM_STORE,   // Store to memory
    ASM_ALLOC,   // Allocate memory
    ASM_FREE,    // Free memory
    ASM_CALL,    // Function call
    ASM_RET,     // Return
    ASM_JMP,     // Jump
    ASM_JZ,      // Jump if zero
    ASM_TRAP     // Trap/exception
} diram_asm_mnemonic_t;

// Hotwire API - Zero-Overhead Transformation
diram_hotwire_context_t* diram_hotwire_create(diram_hotwire_target_t target);
void diram_hotwire_destroy(diram_hotwire_context_t* context);

// Feature Toggle Management
bool diram_hotwire_register_feature(diram_hotwire_context_t* context,
                                    const char* name, bool enabled);
bool diram_hotwire_check_feature(diram_hotwire_context_t* context,
                                 const char* name);
bool diram_hotwire_activate_feature(diram_hotwire_context_t* context,
                                    const char* name);

// Direct AST to Target Translation - No IR, No SSA
bool diram_hotwire_transform(diram_hotwire_context_t* context,
                            diram_ast_node_t* ast_root);

// Platform-Specific Visitors
diram_ast_visitor_t* diram_hotwire_create_asm_visitor(diram_hotwire_context_t* context);
diram_ast_visitor_t* diram_hotwire_create_wasm_visitor(diram_hotwire_context_t* context);

// Assembly Target Emission
void diram_hotwire_emit_asm_instruction(diram_hotwire_context_t* context,
                                        diram_asm_mnemonic_t mnemonic,
                                        const char* operand1,
                                        const char* operand2);
void diram_hotwire_emit_asm_label(diram_hotwire_context_t* context,
                                  const char* label);
void diram_hotwire_emit_asm_directive(diram_hotwire_context_t* context,
                                      const char* directive);

// WebAssembly Target Emission
void diram_hotwire_emit_wasm_instruction(diram_hotwire_context_t* context,
                                         const char* instruction);
void diram_hotwire_emit_wasm_function(diram_hotwire_context_t* context,
                                      const char* name,
                                      const char* params,
                                      const char* results);
void diram_hotwire_emit_wasm_trap(diram_hotwire_context_t* context,
                                  const char* condition);

// Policy Enforcement
bool diram_hotwire_enforce_policy(diram_hotwire_context_t* context,
                                  const char* policy_name);
void diram_hotwire_set_policy_handler(diram_hotwire_context_t* context,
                                      bool (*handler)(const char*, uint32_t));

// Output Management
const char* diram_hotwire_get_output(diram_hotwire_context_t* context);
bool diram_hotwire_write_output(diram_hotwire_context_t* context,
                                const char* filename);

// Error Handling
bool diram_hotwire_has_error(const diram_hotwire_context_t* context);
const char* diram_hotwire_get_error(const diram_hotwire_context_t* context);

// Utility Functions
const char* diram_hotwire_target_to_string(diram_hotwire_target_t target);
const char* diram_hotwire_mnemonic_to_string(diram_asm_mnemonic_t mnemonic);

#endif // DIRAM_HOTWIRE_H
