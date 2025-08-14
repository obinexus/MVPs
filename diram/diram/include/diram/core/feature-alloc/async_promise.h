// src/core/feature-alloc/async_promise.c
#include "diram/core/feature-alloc/async_promise.h"
#include <unistd.h>    // For getpid()
#include <errno.h>     // For errno, ENOMEM
#include <string.h>    // For memcpy, strerror
#include <stdlib.h>    // For calloc
#include <pthread.h>   // For pthreads
#include <time.h>      // For time, clock_gettime

// Forward declaration - critical for compilation order
static void* async_allocation_worker(void* arg);

// Internal structures - integrated directly for security
typedef struct {
    size_t predicted_size;
    uint32_t access_pattern;
    uint64_t last_access;
    double confidence_score;
} diram_lookahead_entry_t;

// Global lookahead cache - static for translation unit isolation
static struct {
    diram_lookahead_entry_t* entries;
    size_t capacity;
    pthread_rwlock_t lock;
} g_lookahead_cache = {0};

// Context structure for async workers
typedef struct {
    char* tag;
    diram_memory_space_t* space;
} diram_async_context_t;

// Predictive allocation with lookahead
diram_async_promise_t* diram_alloc_with_lookahead(
    size_t size,
    const char* tag,
    diram_memory_space_t* space,
    uint32_t access_pattern_hint
) {
    // Create promise
    diram_async_promise_t* promise = calloc(1, sizeof(diram_async_promise_t));
    if (!promise) {
        return NULL;
    }
    
    // Initialize promise receipt
    promise->receipt.promise_id = (uint64_t)promise;
    promise->receipt.creation_timestamp = time(NULL);
    promise->receipt.state = PROMISE_STATE_PENDING;
    promise->receipt.creator_pid = getpid();
    promise->receipt.creator_thread = pthread_self();
    
    pthread_mutex_init(&promise->state_mutex, NULL);
    pthread_cond_init(&promise->state_cond, NULL);
    
    // Store context for async worker
    diram_async_context_t* ctx = calloc(1, sizeof(diram_async_context_t));
    if (ctx) {
        ctx->tag = tag ? strdup(tag) : NULL;
        ctx->space = space;
        promise->callback_context = ctx;
    }
    
    // Check lookahead cache for predictive hints
    pthread_rwlock_rdlock(&g_lookahead_cache.lock);
    size_t predicted_size = size;
    for (size_t i = 0; i < g_lookahead_cache.capacity; i++) {
        if (g_lookahead_cache.entries[i].access_pattern == access_pattern_hint) {
            if (g_lookahead_cache.entries[i].confidence_score > 0.7) {
                predicted_size = g_lookahead_cache.entries[i].predicted_size;
            }
            break;
        }
    }
    pthread_rwlock_unlock(&g_lookahead_cache.lock);
    
    promise->lookahead_size = predicted_size;
    promise->cache_priority = access_pattern_hint;
    
    // Spawn async allocation thread
    pthread_t alloc_thread;
    pthread_create(&alloc_thread, NULL, async_allocation_worker, promise);
    pthread_detach(alloc_thread);
    
    return promise;
}

// Worker thread for async allocation
static void* async_allocation_worker(void* arg) {
    diram_async_promise_t* promise = (diram_async_promise_t*)arg;
    
    // Extract context if available
    const char* tag = "async_alloc";
    diram_memory_space_t* space = NULL;
    
    if (promise->callback_context) {
        diram_async_context_t* ctx = (diram_async_context_t*)promise->callback_context;
        if (ctx->tag) tag = ctx->tag;
        space = ctx->space;
    }
    
    // Perform async allocation with potential failures
    diram_enhanced_allocation_t* alloc = diram_alloc_enhanced(
        promise->lookahead_size,
        tag,
        space
    );
    
    if (alloc) {
        // Generate receipt
        memcpy(promise->receipt.allocation_receipt, 
               alloc->base.sha256_receipt,
               DIRAM_SHA256_HEX_LEN);
        
        diram_promise_resolve(promise, alloc);
    } else {
        // Determine rejection reason based on errno
        diram_reject_reason_t reason = REJECT_REASON_MEMORY_EXHAUSTED;
        if (errno == ENOMEM) {
            reason = REJECT_REASON_FATAL_ERROR;
        }
        
        diram_promise_reject(promise, reason, strerror(errno));
    }
    
    // Cleanup context
    if (promise->callback_context) {
        diram_async_context_t* ctx = (diram_async_context_t*)promise->callback_context;
        if (ctx->tag) free(ctx->tag);
        free(ctx);
        promise->callback_context = NULL;
    }
    
    return NULL;
}

// Promise lifecycle implementations
int diram_promise_await(diram_async_promise_t* promise, uint64_t timeout_ms) {
    if (!promise) return -1;
    
    pthread_mutex_lock(&promise->state_mutex);
    
    // Calculate absolute timeout
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    ts.tv_sec += timeout_ms / 1000;
    ts.tv_nsec += (timeout_ms % 1000) * 1000000;
    if (ts.tv_nsec >= 1000000000) {
        ts.tv_sec++;
        ts.tv_nsec -= 1000000000;
    }
    
    // Wait for state change
    while (promise->receipt.state == PROMISE_STATE_PENDING) {
        if (pthread_cond_timedwait(&promise->state_cond, 
                                   &promise->state_mutex, &ts) == ETIMEDOUT) {
            promise->receipt.state = PROMISE_STATE_REJECTED;
            promise->receipt.reject_reason = REJECT_REASON_TIMEOUT;
            pthread_mutex_unlock(&promise->state_mutex);
            return -1;
        }
    }
    
    pthread_mutex_unlock(&promise->state_mutex);
    return (promise->receipt.state == PROMISE_STATE_RESOLVED) ? 0 : -1;
}

int diram_promise_resolve(diram_async_promise_t* promise, 
                         diram_enhanced_allocation_t* alloc) {
    if (!promise || !alloc) return -1;
    
    pthread_mutex_lock(&promise->state_mutex);
    
    if (promise->receipt.state != PROMISE_STATE_PENDING) {
        pthread_mutex_unlock(&promise->state_mutex);
        return -1;
    }
    
    promise->receipt.state = PROMISE_STATE_RESOLVED;
    promise->result.resolved_allocation = alloc;
    
    if (promise->on_resolve) {
        promise->on_resolve(promise, alloc);
    }
    
    pthread_cond_broadcast(&promise->state_cond);
    pthread_mutex_unlock(&promise->state_mutex);
    
    return 0;
}

int diram_promise_reject(diram_async_promise_t* promise, 
                        diram_reject_reason_t reason, 
                        const char* msg) {
    if (!promise) return -1;
    
    pthread_mutex_lock(&promise->state_mutex);
    
    if (promise->receipt.state != PROMISE_STATE_PENDING) {
        pthread_mutex_unlock(&promise->state_mutex);
        return -1;
    }
    
    promise->receipt.state = PROMISE_STATE_REJECTED;
    promise->receipt.reject_reason = reason;
    
    // Store rejection context - using errno code instead of message
    // This avoids the missing message field issue
    promise->result.rejection_context.errno_code = errno;
    
    if (promise->on_reject) {
        promise->on_reject(promise, reason, msg);
    }
    
    pthread_cond_broadcast(&promise->state_cond);
    pthread_mutex_unlock(&promise->state_mutex);
    
    return 0;
}

void diram_promise_destroy(diram_async_promise_t* promise) {
    if (!promise) return;
    
    pthread_mutex_destroy(&promise->state_mutex);
    pthread_cond_destroy(&promise->state_cond);
    
    // Cleanup any remaining context
    if (promise->callback_context) {
        diram_async_context_t* ctx = (diram_async_context_t*)promise->callback_context;
        if (ctx->tag) free(ctx->tag);
        free(ctx);
    }
    
    free(promise);
}

diram_status_t diram_promise_get_status(diram_async_promise_t* promise) {
    diram_status_t status = {DIRAM_ERR_INVALID_ARG, 0};
    
    if (!promise) return status;
    
    pthread_mutex_lock(&promise->state_mutex);
    
    switch (promise->receipt.state) {
        case PROMISE_STATE_RESOLVED:
            status.err = DIRAM_SUCCESS;
            status.ok = 1;
            break;
        case PROMISE_STATE_REJECTED:
            switch (promise->receipt.reject_reason) {
                case REJECT_REASON_MEMORY_EXHAUSTED:
                    status.err = DIRAM_ERR_MEMORY_EXHAUSTED;
                    break;
                case REJECT_REASON_TIMEOUT:
                    status.err = DIRAM_ERR_TIMEOUT;
                    break;
                case REJECT_REASON_CANCELLED:
                    status.err = DIRAM_ERR_CANCELLED;
                    break;
                case REJECT_REASON_FATAL_ERROR:
                    status.err = DIRAM_ERR_FATAL;
                    break;
                default:
                    status.err = DIRAM_ERR_UNKNOWN;
            }
            status.ok = 0;
            break;
        case PROMISE_STATE_PENDING:
            status.err = DIRAM_ERR_PENDING;
            status.ok = 0;
            break;
        default:
            status.err = DIRAM_ERR_UNKNOWN;
            status.ok = 0;
    }
    
    pthread_mutex_unlock(&promise->state_mutex);
    return status;
}

// Public async allocation API implementation
diram_async_promise_t* diram_alloc_async(
    size_t size,
    const char* tag,
    diram_memory_space_t* space,
    size_t lookahead_hint
) {
    return diram_alloc_with_lookahead(size, tag, space, (uint32_t)lookahead_hint);
}