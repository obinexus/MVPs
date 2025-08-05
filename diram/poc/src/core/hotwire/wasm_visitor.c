// src/core/hotwire/wasm_visitor.c
// DIRAM WebAssembly Target Visitor - Zero-Overhead AST to WASM Translation
// OBINexus Aegis Project

#include "diram/core/hotwire/hotwire.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// WASM Visitor Implementation
typedef struct {
    diram_ast_visitor_t base;          // Base visitor interface
    diram_hotwire_context_t* context;  // Hotwire context
    uint32_t local_count;              // Local variable counter
    uint32_t function_index;           // Current function index
    bool in_function;                  // Currently inside function
} diram_wasm_visitor_t;

// Forward declarations
static void* visit_allocation_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_opcode_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_constraint_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_policy_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_feature_toggle_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_memory_region_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node);

// Helper to emit WASM S-expression
static void emit_wasm_sexpr(diram_hotwire_context_t* ctx, const char* format, ...) {
    char buffer[512];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    diram_hotwire_emit_wasm_instruction(ctx, buffer);
}

// Allocation Node -> WebAssembly Translation
static void* visit_allocation_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_wasm_visitor_t* visitor = (diram_wasm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    // Check feature toggle
    if (!diram_hotwire_check_feature(ctx, "cryptographic_receipts")) {
        emit_wasm_sexpr(ctx, ";; Cryptographic receipts disabled");
        return NULL;
    }
    
    emit_wasm_sexpr(ctx, ";; Allocation: size=%zu tag=%s",
                    node->data.allocation.size,
                    node->data.allocation.tag);
    
    // Generate allocation sequence
    emit_wasm_sexpr(ctx, "(i32.const %zu)", node->data.allocation.size);
    emit_wasm_sexpr(ctx, "(call $diram_alloc_traced)");
    
    // Store result if address specified
    if (node->data.allocation.address != 0) {
        emit_wasm_sexpr(ctx, "(local.set $alloc_addr)");
        
        // Generate SHA-256 receipt verification
        if (strlen(node->data.allocation.sha256_receipt) > 0) {
            emit_wasm_sexpr(ctx, ";; SHA-256: %s", node->data.allocation.sha256_receipt);
            emit_wasm_sexpr(ctx, "(local.get $alloc_addr)");
            emit_wasm_sexpr(ctx, "(call $verify_receipt)");
            emit_wasm_sexpr(ctx, "(if (i32.eqz) (then (unreachable)))");
        }
    }
    
    return NULL;
}

// Opcode Node -> WebAssembly Translation
static void* visit_opcode_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_wasm_visitor_t* visitor = (diram_wasm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    emit_wasm_sexpr(ctx, "\n;; Opcode: %s (0x%02X)",
                    node->data.opcode.name,
                    node->data.opcode.code);
    
    switch (node->data.opcode.code) {
        case 0x01: // ALLOC
            emit_wasm_sexpr(ctx, "(block $alloc_handler");
            // Process operands
            for (uint8_t i = 0; i < node->data.opcode.operand_count; i++) {
                diram_ast_accept(node->data.opcode.operands[i], self);
            }
            emit_wasm_sexpr(ctx, ")");
            break;
            
        case 0x02: // FREE
            emit_wasm_sexpr(ctx, "(block $free_handler");
            emit_wasm_sexpr(ctx, "  (call $diram_free_traced)");
            emit_wasm_sexpr(ctx, ")");
            break;
            
        case 0x03: // TRACE
            emit_wasm_sexpr(ctx, "(block $trace_handler");
            emit_wasm_sexpr(ctx, "  (call $diram_trace_enable)");
            emit_wasm_sexpr(ctx, ")");
            break;
            
        default:
            // Invalid opcode - trap
            emit_wasm_sexpr(ctx, "(unreachable)");
            break;
    }
    
    return NULL;
}

// Constraint Node -> WebAssembly Translation
static void* visit_constraint_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_wasm_visitor_t* visitor = (diram_wasm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    emit_wasm_sexpr(ctx, "\n;; Constraint: %s", node->data.constraint.name);
    emit_wasm_sexpr(ctx, ";; Epsilon: %.2f, Max Events: %u",
                    node->data.constraint.epsilon_value,
                    node->data.constraint.max_heap_events);
    
    // Generate constraint checking with trap guard
    emit_wasm_sexpr(ctx, "(block $constraint_check");
    emit_wasm_sexpr(ctx, "  (i32.const %u)", node->data.constraint.max_heap_events);
    emit_wasm_sexpr(ctx, "  (call $diram_check_constraint)");
    emit_wasm_sexpr(ctx, "  (br_if 0)");
    emit_wasm_sexpr(ctx, "  (unreachable) ;; Constraint violation");
    emit_wasm_sexpr(ctx, ")");
    
    return NULL;
}

// Policy Node -> WebAssembly Translation
static void* visit_policy_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_wasm_visitor_t* visitor = (diram_wasm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    emit_wasm_sexpr(ctx, "\n;; Policy: %s (%s)",
                    node->data.policy.name,
                    node->data.policy.type);
    
    if (strcmp(node->data.policy.type, "security") == 0) {
        emit_wasm_sexpr(ctx, "(block $security_policy");
        
        // Emit rules as comments
        for (size_t i = 0; i < node->data.policy.rule_count; i++) {
            emit_wasm_sexpr(ctx, "  ;; Rule: %s", node->data.policy.rules[i]);
        }
        
        if (node->data.policy.enforced) {
            emit_wasm_sexpr(ctx, "  (call $diram_enforce_policy)");
            emit_wasm_sexpr(ctx, "  (if (i32.eqz) (then (unreachable)))");
        }
        
        emit_wasm_sexpr(ctx, ")");
    }
    
    return NULL;
}

// Feature Toggle -> WebAssembly Translation
static void* visit_feature_toggle_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_wasm_visitor_t* visitor = (diram_wasm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    // Register feature
    diram_hotwire_register_feature(ctx, node->data.feature.name, 
                                   node->data.feature.enabled);
    
    emit_wasm_sexpr(ctx, "\n;; Feature Toggle: %s = %s",
                    node->data.feature.name,
                    node->data.feature.enabled ? "ON" : "OFF");
    
    if (node->data.feature.enabled) {
        // Generate feature check with conditional execution
        emit_wasm_sexpr(ctx, "(if (call $diram_feature_enabled_%s)",
                        node->data.feature.name);
        emit_wasm_sexpr(ctx, "  (then");
        emit_wasm_sexpr(ctx, "    ;; Feature-specific code here");
        emit_wasm_sexpr(ctx, "  )");
        emit_wasm_sexpr(ctx, ")");
    }
    
    return NULL;
}

// Memory Region -> WebAssembly Translation
static void* visit_memory_region_wasm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_wasm_visitor_t* visitor = (diram_wasm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    emit_wasm_sexpr(ctx, "\n;; Memory Region: %s", node->data.memory_region.name);
    
    // Calculate pages needed (WASM page = 64KB)
    size_t pages = (node->data.memory_region.size + 65535) / 65536;
    
    emit_wasm_sexpr(ctx, ";; Base: 0x%lx, Size: %zu bytes (%zu pages)",
                    node->data.memory_region.base_address,
                    node->data.memory_region.size,
                    pages);
    
    // Generate memory region globals
    emit_wasm_sexpr(ctx, "(global $%s_base i32 (i32.const %lu))",
                    node->data.memory_region.name,
                    node->data.memory_region.base_address);
    emit_wasm_sexpr(ctx, "(global $%s_size i32 (i32.const %zu))",
                    node->data.memory_region.name,
                    node->data.memory_region.size);
    
    // Protection flags as trap conditions
    if (!(node->data.memory_region.protection_flags & 2)) { // No write
        emit_wasm_sexpr(ctx, ";; Write protection: trap on write to %s",
                        node->data.memory_region.name);
    }
    
    return NULL;
}

// Create WebAssembly Visitor
diram_ast_visitor_t* diram_hotwire_create_wasm_visitor(diram_hotwire_context_t* context) {
    diram_wasm_visitor_t* visitor = calloc(1, sizeof(diram_wasm_visitor_t));
    if (!visitor) return NULL;
    
    // Initialize base visitor interface
    visitor->base.visit_allocation = visit_allocation_wasm;
    visitor->base.visit_opcode = visit_opcode_wasm;
    visitor->base.visit_constraint = visit_constraint_wasm;
    visitor->base.visit_policy = visit_policy_wasm;
    visitor->base.visit_feature_toggle = visit_feature_toggle_wasm;
    visitor->base.visit_memory_region = visit_memory_region_wasm;
    
    visitor->base.visit_root = NULL;
    visitor->base.visit_operand = NULL;
    visitor->base.visit_build_target = NULL;
    
    visitor->context = context;
    visitor->local_count = 0;
    visitor->function_index = 0;
    visitor->in_function = false;
    
    // Emit WASM module header
    emit_wasm_sexpr(context, "(module");
    emit_wasm_sexpr(context, "  ;; DIRAM WebAssembly Module");
    emit_wasm_sexpr(context, "  ;; Generated by Hotwire Transformer");
    emit_wasm_sexpr(context, "");
    
    // Import required functions
    emit_wasm_sexpr(context, "  ;; Imports");
    emit_wasm_sexpr(context, "  (import \"diram\" \"alloc_traced\" (func $diram_alloc_traced (param i32) (result i32)))");
    emit_wasm_sexpr(context, "  (import \"diram\" \"free_traced\" (func $diram_free_traced (param i32)))");
    emit_wasm_sexpr(context, "  (import \"diram\" \"trace_enable\" (func $diram_trace_enable))");
    emit_wasm_sexpr(context, "  (import \"diram\" \"check_constraint\" (func $diram_check_constraint (param i32) (result i32)))");
    emit_wasm_sexpr(context, "  (import \"diram\" \"enforce_policy\" (func $diram_enforce_policy (result i32)))");
    emit_wasm_sexpr(context, "  (import \"diram\" \"verify_receipt\" (func $verify_receipt (param i32) (result i32)))");
    emit_wasm_sexpr(context, "");
    
    // Memory declaration
    emit_wasm_sexpr(context, "  ;; Memory");
    emit_wasm_sexpr(context, "  (memory (export \"memory\") %u)", 
                    context->config.wasm_config.memory_pages);
    emit_wasm_sexpr(context, "");
    
    return &visitor->base;
}
