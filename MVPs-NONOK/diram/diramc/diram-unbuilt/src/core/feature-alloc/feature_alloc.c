// src/core/feature_alloc.c - Enhanced allocation with error indexing
#include "diram/core/feature-alloc/feature_alloc.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdarg.h>
#include <unistd.h>
#include <errno.h>

// Global error index instance
static diram_error_index_t g_error_index = {
    .errors = NULL,
    .error_count = 0,
    .error_capacity = 0,
    .mutex = PTHREAD_MUTEX_INITIALIZER,
    .error_log = NULL
};

// Global feature configuration
static diram_feature_config_t g_feature_config = {
    .enable_guard_pages = 1,
    .enable_canary_values = 1,
    .enable_aslr = 1,
    .zero_trust_mode = 1,
    .telemetry_level = 2,
    .max_error_index_size = 10000
};

// Error Index Implementation
int diram_error_index_init(void) {
    pthread_mutex_lock(&g_error_index.mutex);
    
    if (g_error_index.errors != NULL) {
        pthread_mutex_unlock(&g_error_index.mutex);
        return 0; // Already initialized
    }
    
    g_error_index.error_capacity = 1024;
    g_error_index.errors = calloc(g_error_index.error_capacity, 
                                  sizeof(diram_error_context_t));
    if (!g_error_index.errors) {
        pthread_mutex_unlock(&g_error_index.mutex);
        return -1;
    }
    
    // Open error log
    g_error_index.error_log = fopen("logs/diram_errors.log", "a");
    if (g_error_index.error_log) {
        setvbuf(g_error_index.error_log, NULL, _IOLBF, 0);
        fprintf(g_error_index.error_log, 
                "# DIRAM Error Index Log - PID:%d\n", getpid());
    }
    
    pthread_mutex_unlock(&g_error_index.mutex);
    return 0;
}

void diram_error_index_shutdown(void) {
    pthread_mutex_lock(&g_error_index.mutex);
    
    if (g_error_index.errors) {
        free(g_error_index.errors);
        g_error_index.errors = NULL;
    }
    
    if (g_error_index.error_log) {
        fclose(g_error_index.error_log);
        g_error_index.error_log = NULL;
    }
    
    g_error_index.error_count = 0;
    g_error_index.error_capacity = 0;
    
    pthread_mutex_unlock(&g_error_index.mutex);
}

void diram_error_record(diram_error_code_t code, const char* fmt, ...) {
    pthread_mutex_lock(&g_error_index.mutex);
    
    // Ensure space in error index
    if (g_error_index.error_count >= g_error_index.error_capacity) {
        // Rotate errors - remove oldest 25%
        size_t keep_count = (g_error_index.error_capacity * 3) / 4;
        memmove(g_error_index.errors, 
                g_error_index.errors + (g_error_index.error_capacity - keep_count),
                keep_count * sizeof(diram_error_context_t));
        g_error_index.error_count = keep_count;
    }
    
    // Record new error
    diram_error_context_t* ctx = &g_error_index.errors[g_error_index.error_count++];
    ctx->code = code;
    ctx->timestamp = time(NULL);
    ctx->pid = getpid();
    
    // Format message
    va_list args;
    va_start(args, fmt);
    vsnprintf(ctx->context, sizeof(ctx->context), fmt, args);
    va_end(args);
    
    // Determine severity
    if (code >= DIRAM_ERR_BOUNDARY_VIOLATION && code <= DIRAM_ERR_GOVERNANCE_FAIL) {
        ctx->severity = 3; // Critical
    } else if (code >= DIRAM_ERR_PID_MISMATCH) {
        ctx->severity = 2; // Error
    } else {
        ctx->severity = 1; // Warning
    }
    
    // Log to file
    if (g_error_index.error_log) {
        fprintf(g_error_index.error_log, 
                "%lu|%d|0x%04X|%d|%s\n",
                ctx->timestamp, ctx->pid, ctx->code, 
                ctx->severity, ctx->context);
        fflush(g_error_index.error_log);
    }
    
    pthread_mutex_unlock(&g_error_index.mutex);
}

// Memory Space Management
diram_memory_space_t* diram_space_create(const char* name, size_t limit) {
    diram_memory_space_t* space = calloc(1, sizeof(diram_memory_space_t));
    if (!space) {
        DIRAM_ERROR(DIRAM_ERR_MEMORY_EXHAUSTED, 
                    "Failed to create memory space '%s'", name);
        return NULL;
    }
    
    strncpy(space->space_name, name, sizeof(space->space_name) - 1);
    space->limit_bytes = limit;
    space->used_bytes = 0;
    space->allocation_count = 0;
    space->owner_pid = getpid();
    space->isolation_active = 1;
    pthread_mutex_init(&space->lock, NULL);
    
    return space;
}

void diram_space_destroy(diram_memory_space_t* space) {
    if (!space) return;
    
    pthread_mutex_destroy(&space->lock);
    memset(space, 0, sizeof(*space));
    free(space);
}

int diram_space_check_limit(diram_memory_space_t* space, size_t requested) {
    if (!space) return -1;
    
    pthread_mutex_lock(&space->lock);
    int result = (space->used_bytes + requested <= space->limit_bytes) ? 0 : -1;
    pthread_mutex_unlock(&space->lock);
    
    if (result < 0) {
        DIRAM_ERROR(DIRAM_ERR_MEMORY_EXHAUSTED,
                    "Space '%s' limit exceeded: %zu + %zu > %zu",
                    space->space_name, space->used_bytes, 
                    requested, space->limit_bytes);
    }
    
    return result;
}

// Enhanced Allocation Implementation
diram_enhanced_allocation_t* diram_alloc_enhanced(size_t size, 
                                                   const char* tag,
                                                   diram_memory_space_t* space) {
    // Check space limits first
    if (space && diram_space_check_limit(space, size) < 0) {
        return NULL;
    }
    
    // Allocate with base functionality
    diram_allocation_t* base_alloc = diram_alloc_traced(size, tag);
    if (!base_alloc) {
        DIRAM_ERROR(DIRAM_ERR_HEAP_CONSTRAINT, 
                    "Base allocation failed for size %zu", size);
        return NULL;
    }
    
    // Create enhanced wrapper
    diram_enhanced_allocation_t* enhanced = 
        calloc(1, sizeof(diram_enhanced_allocation_t));
    if (!enhanced) {
        diram_free_traced(base_alloc);
        return NULL;
    }
    
    // Copy base allocation
    memcpy(&enhanced->base, base_alloc, sizeof(diram_allocation_t));
    free(base_alloc); // Free the temporary base struct
    
    // Initialize enhanced fields
    enhanced->last_error = DIRAM_ERR_NONE;
    enhanced->error_count = 0;
    enhanced->space = space;
    enhanced->flags = 0;
    
    // Apply zero-trust features if enabled
    if (g_feature_config.zero_trust_mode) {
        enhanced->flags |= 0x01; // Mark as zero-trust enabled
        
        // In production, would add guard pages here
        if (g_feature_config.enable_guard_pages) {
            enhanced->flags |= 0x02;
        }
        
        // Add canary values
        if (g_feature_config.enable_canary_values) {
            enhanced->flags |= 0x04;
            // Write canary pattern at allocation boundaries
            uint64_t* canary_start = (uint64_t*)enhanced->base.base_addr;
            uint64_t* canary_end = (uint64_t*)((char*)enhanced->base.base_addr + 
                                               size - sizeof(uint64_t));
            *canary_start = DIRAM_GUARD_PATTERN;
            *canary_end = DIRAM_GUARD_PATTERN;
        }
    }
    
    // Update space accounting
    if (space) {
        pthread_mutex_lock(&space->lock);
        space->used_bytes += size;
        space->allocation_count++;
        pthread_mutex_unlock(&space->lock);
    }
    
    // Emit telemetry event
    diram_telemetry_event_t event = {
        .event_id = (uint64_t)enhanced,
        .layer = 2, // Opcode-bound
        .error_code = DIRAM_ERR_NONE,
        .address = enhanced->base.base_addr,
        .size = size,
        .operation = "ALLOC_ENHANCED"
    };
    memcpy(event.receipt, enhanced->base.sha256_receipt, 
           sizeof(event.receipt) - 1);
    event.receipt[sizeof(event.receipt) - 1] = '\0';
    diram_telemetry_emit(&event);
    
    return enhanced;
}

void diram_free_enhanced(diram_enhanced_allocation_t* alloc) {
    if (!alloc) return;
    
    // Verify canary values if enabled
    if (alloc->flags & 0x04) {
        uint64_t* canary_start = (uint64_t*)alloc->base.base_addr;
        uint64_t* canary_end = (uint64_t*)((char*)alloc->base.base_addr + 
                                          alloc->base.size - sizeof(uint64_t));
        
        if (*canary_start != DIRAM_GUARD_PATTERN || 
            *canary_end != DIRAM_GUARD_PATTERN) {
            DIRAM_ERROR(DIRAM_ERR_BOUNDARY_VIOLATION,
                        "Canary corruption detected at %p", 
                        alloc->base.base_addr);
        }
    }
    
    // Update space accounting
    if (alloc->space) {
        pthread_mutex_lock(&alloc->space->lock);
        alloc->space->used_bytes -= alloc->base.size;
        alloc->space->allocation_count--;
        pthread_mutex_unlock(&alloc->space->lock);
    }
    
    // Emit telemetry
    diram_telemetry_event_t event = {
        .event_id = (uint64_t)alloc,
        .layer = 2,
        .error_code = DIRAM_ERR_NONE,
        .address = alloc->base.base_addr,
        .size = alloc->base.size,
        .operation = "FREE_ENHANCED"
    };
    diram_telemetry_emit(&event);
    
    // Free base allocation
    diram_free_traced(&alloc->base);
    
    // Clear and free enhanced structure
    memset(alloc, 0, sizeof(*alloc));
    free(alloc);
}

// Governance Implementation
static diram_governance_stats_t g_governance_stats = {
    .epsilon_current = 0.0,
    .epsilon_limit = 0.6,
    .violations = 0,
    .enforcements = 0
};

int diram_governance_check(void) {
    // Simplified governance check
    // In production, would integrate with Sinphasé policy engine
    if (g_governance_stats.epsilon_current > g_governance_stats.epsilon_limit) {
        g_governance_stats.violations++;
        DIRAM_ERROR(DIRAM_ERR_GOVERNANCE_FAIL,
                    "Governance violation: ε(%.2f) > %.2f",
                    g_governance_stats.epsilon_current,
                    g_governance_stats.epsilon_limit);
        return -1;
    }
    
    g_governance_stats.enforcements++;
    return 0;
}

const diram_governance_stats_t* diram_governance_get_stats(void) {
    return &g_governance_stats;
}

// Telemetry stubs (would connect to actual telemetry system)
static int g_telemetry_initialized = 0;

int diram_telemetry_init(const char* endpoint) {
    (void)endpoint;
    g_telemetry_initialized = 1;
    return 0;
}

void diram_telemetry_shutdown(void) {
    g_telemetry_initialized = 0;
}

void diram_telemetry_emit(diram_telemetry_event_t* event) {
    if (!g_telemetry_initialized || !event) return;
    
    // In production, would send to telemetry endpoint
    // For now, log to stderr if verbose
    if (g_feature_config.telemetry_level >= 2) {
        fprintf(stderr, "[TELEMETRY] L%d|%s|%p|%zu|%s\n",
                event->layer, event->operation, 
                event->address, event->size, event->receipt);
    }
}

int diram_telemetry_flush(void) {
    // In production, would flush telemetry buffer
    return 0;
}