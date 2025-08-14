// src/core/hotwire/asm_visitor.c
// DIRAM Assembly Target Visitor - Zero-Overhead AST to x86_64 Translation
// OBINexus Aegis Project

#include "diram/core/hotwire/hotwire.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// x86_64 Register Mapping
static const char* REG_ACCUM = "rax";    // Accumulator
static const char* REG_BASE = "rbx";     // Base pointer
static const char* REG_COUNT = "rcx";    // Counter
static const char* REG_DATA = "rdx";     // Data
static const char* REG_SOURCE = "rsi";   // Source index
static const char* REG_DEST = "rdi";     // Destination index
static const char* REG_STACK = "rsp";    // Stack pointer
static const char* REG_FRAME = "rbp";    // Frame pointer

// Assembly Visitor Implementation
typedef struct {
    diram_ast_visitor_t base;          // Base visitor interface
    diram_hotwire_context_t* context;  // Hotwire context
    uint32_t stack_offset;             // Current stack offset
    bool in_allocation;                // Currently processing allocation
} diram_asm_visitor_t;

// Forward declarations
static void* visit_allocation_asm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_opcode_asm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_constraint_asm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_policy_asm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_feature_toggle_asm(diram_ast_visitor_t* self, diram_ast_node_t* node);
static void* visit_memory_region_asm(diram_ast_visitor_t* self, diram_ast_node_t* node);

// Allocation Node -> Assembly Translation
static void* visit_allocation_asm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_asm_visitor_t* visitor = (diram_asm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    // Check if cryptographic receipts feature is enabled
    if (!diram_hotwire_check_feature(ctx, "cryptographic_receipts")) {
        diram_hotwire_emit_asm_directive(ctx, "; Cryptographic receipts disabled");
        return NULL;
    }
    
    // Generate allocation code
    diram_hotwire_emit_asm_directive(ctx, "\n; Allocation Node");
    diram_hotwire_emit_asm_directive(ctx, "; Size: %zu, Tag: %s", 
                                     node->data.allocation.size,
                                     node->data.allocation.tag);
    
    // Load allocation size into register
    char size_str[32];
    snprintf(size_str, sizeof(size_str), "%zu", node->data.allocation.size);
    diram_hotwire_emit_asm_instruction(ctx, ASM_MV, REG_DEST, size_str);
    
    // Call DIRAM allocation function
    diram_hotwire_emit_asm_instruction(ctx, ASM_CALL, "diram_alloc_traced", NULL);
    
    // Store result (address in RAX)
    if (node->data.allocation.address != 0) {
        char addr_str[32];
        snprintf(addr_str, sizeof(addr_str), "0x%lx", node->data.allocation.address);
        diram_hotwire_emit_asm_instruction(ctx, ASM_STORE, REG_ACCUM, addr_str);
    }
    
    // Generate SHA-256 receipt if feature enabled
    if (strlen(node->data.allocation.sha256_receipt) > 0) {
        diram_hotwire_emit_asm_directive(ctx, "; SHA-256: %s", 
                                         node->data.allocation.sha256_receipt);
    }
    
    return NULL;
}

// Opcode Node -> Assembly Translation
static void* visit_opcode_asm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_asm_visitor_t* visitor = (diram_asm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    diram_hotwire_emit_asm_directive(ctx, "\n; Opcode: %s (0x%02X)",
                                     node->data.opcode.name,
                                     node->data.opcode.code);
    
    // Translate based on opcode
    switch (node->data.opcode.code) {
        case 0x01: // ALLOC
            diram_hotwire_emit_asm_label(ctx, ".alloc_handler");
            // Process operands
            for (uint8_t i = 0; i < node->data.opcode.operand_count; i++) {
                diram_ast_accept(node->data.opcode.operands[i], self);
            }
            break;
            
        case 0x02: // FREE
            diram_hotwire_emit_asm_label(ctx, ".free_handler");
            diram_hotwire_emit_asm_instruction(ctx, ASM_CALL, "diram_free_traced", NULL);
            break;
            
        case 0x03: // TRACE
            diram_hotwire_emit_asm_label(ctx, ".trace_handler");
            diram_hotwire_emit_asm_instruction(ctx, ASM_CALL, "diram_trace_enable", NULL);
            break;
            
        default:
            diram_hotwire_emit_asm_instruction(ctx, ASM_TRAP, NULL, NULL);
            break;
    }
    
    return NULL;
}

// Constraint Node -> Assembly Translation
static void* visit_constraint_asm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_asm_visitor_t* visitor = (diram_asm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    diram_hotwire_emit_asm_directive(ctx, "\n; Constraint: %s", node->data.constraint.name);
    diram_hotwire_emit_asm_directive(ctx, "; Epsilon: %.2f, Max Events: %u",
                                     node->data.constraint.epsilon_value,
                                     node->data.constraint.max_heap_events);
    
    // Generate constraint checking code
    char events_str[32];
    snprintf(events_str, sizeof(events_str), "%u", node->data.constraint.max_heap_events);
    
    diram_hotwire_emit_asm_instruction(ctx, ASM_MV, REG_COUNT, events_str);
    diram_hotwire_emit_asm_instruction(ctx, ASM_CALL, "diram_check_constraint", NULL);
    diram_hotwire_emit_asm_instruction(ctx, ASM_JZ, ".constraint_violation", NULL);
    
    return NULL;
}

// Policy Node -> Assembly Translation
static void* visit_policy_asm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_asm_visitor_t* visitor = (diram_asm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    diram_hotwire_emit_asm_directive(ctx, "\n; Policy: %s (%s)",
                                     node->data.policy.name,
                                     node->data.policy.type);
    
    if (strcmp(node->data.policy.type, "security") == 0) {
        // Generate security policy enforcement
        diram_hotwire_emit_asm_label(ctx, ".security_policy");
        
        for (size_t i = 0; i < node->data.policy.rule_count; i++) {
            diram_hotwire_emit_asm_directive(ctx, "; Rule: %s", 
                                             node->data.policy.rules[i]);
        }
        
        if (node->data.policy.enforced) {
            diram_hotwire_emit_asm_instruction(ctx, ASM_CALL, "diram_enforce_policy", NULL);
        }
    }
    
    return NULL;
}

// Feature Toggle -> Assembly Translation
static void* visit_feature_toggle_asm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_asm_visitor_t* visitor = (diram_asm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    // Register feature with hotwire
    diram_hotwire_register_feature(ctx, node->data.feature.name, 
                                   node->data.feature.enabled);
    
    diram_hotwire_emit_asm_directive(ctx, "\n; Feature Toggle: %s = %s",
                                     node->data.feature.name,
                                     node->data.feature.enabled ? "ON" : "OFF");
    
    if (node->data.feature.enabled) {
        // Generate feature activation code
        char label[64];
        snprintf(label, sizeof(label), ".feature_%s", node->data.feature.name);
        diram_hotwire_emit_asm_label(ctx, label);
        
        // Conditional jump based on feature state
        diram_hotwire_emit_asm_instruction(ctx, ASM_CALL, "diram_feature_enabled", NULL);
        diram_hotwire_emit_asm_instruction(ctx, ASM_JZ, ".feature_disabled", NULL);
    }
    
    return NULL;
}

// Memory Region -> Assembly Translation
static void* visit_memory_region_asm(diram_ast_visitor_t* self, diram_ast_node_t* node) {
    diram_asm_visitor_t* visitor = (diram_asm_visitor_t*)self;
    diram_hotwire_context_t* ctx = visitor->context;
    
    diram_hotwire_emit_asm_directive(ctx, "\n; Memory Region: %s", 
                                     node->data.memory_region.name);
    diram_hotwire_emit_asm_directive(ctx, "; Base: 0x%lx, Size: %zu",
                                     node->data.memory_region.base_address,
                                     node->data.memory_region.size);
    
    // Generate memory region definition
    diram_hotwire_emit_asm_directive(ctx, ".section .data");
    diram_hotwire_emit_asm_directive(ctx, ".align 8");
    diram_hotwire_emit_asm_directive(ctx, "%s_base: .quad 0x%lx",
                                     node->data.memory_region.name,
                                     node->data.memory_region.base_address);
    diram_hotwire_emit_asm_directive(ctx, "%s_size: .quad %zu",
                                     node->data.memory_region.name,
                                     node->data.memory_region.size);
    
    // Protection flags
    const char* protection = "";
    if (node->data.memory_region.protection_flags & 4) protection = "r";
    if (node->data.memory_region.protection_flags & 2) protection = "w";
    if (node->data.memory_region.protection_flags & 1) protection = "x";
    
    diram_hotwire_emit_asm_directive(ctx, "; Protection: %s", protection);
    
    return NULL;
}

// Create Assembly Visitor
diram_ast_visitor_t* diram_hotwire_create_asm_visitor(diram_hotwire_context_t* context) {
    diram_asm_visitor_t* visitor = calloc(1, sizeof(diram_asm_visitor_t));
    if (!visitor) return NULL;
    
    // Initialize base visitor interface
    visitor->base.visit_allocation = visit_allocation_asm;
    visitor->base.visit_opcode = visit_opcode_asm;
    visitor->base.visit_constraint = visit_constraint_asm;
    visitor->base.visit_policy = visit_policy_asm;
    visitor->base.visit_feature_toggle = visit_feature_toggle_asm;
    visitor->base.visit_memory_region = visit_memory_region_asm;
    
    // Default handlers for other node types
    visitor->base.visit_root = NULL;
    visitor->base.visit_operand = NULL;
    visitor->base.visit_build_target = NULL;
    
    visitor->context = context;
    visitor->stack_offset = 0;
    visitor->in_allocation = false;
    
    // Emit assembly header
    diram_hotwire_emit_asm_directive(context, "; DIRAM Assembly Output");
    diram_hotwire_emit_asm_directive(context, "; Generated by Hotwire Transformer");
    diram_hotwire_emit_asm_directive(context, "; Target: x86_64");
    diram_hotwire_emit_asm_directive(context, "");
    diram_hotwire_emit_asm_directive(context, ".intel_syntax noprefix");
    diram_hotwire_emit_asm_directive(context, ".text");
    diram_hotwire_emit_asm_directive(context, ".global _start");
    diram_hotwire_emit_asm_directive(context, "");
    
    return &visitor->base;
}
