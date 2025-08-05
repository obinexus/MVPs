// Internal structures for async promise implementation
#ifndef DIRAM_ASYNC_PROMISE_INTERNAL_H
#define DIRAM_ASYNC_PROMISE_INTERNAL_H

#include "async_promise.h"

// Lookahead cache structure for predictive allocation
typedef struct {
    size_t predicted_size;
    uint32_t access_pattern;
    uint64_t last_access;
    double confidence_score;
} diram_lookahead_entry_t;

// Global lookahead cache structure
typedef struct {
    diram_lookahead_entry_t* entries;
    size_t capacity;
    pthread_rwlock_t lock;
} diram_lookahead_cache_t;

// Context structure for async workers
typedef struct {
    char* tag;
    diram_memory_space_t* space;
} diram_async_context_t;

#endif // DIRAM_ASYNC_PROMISE_INTERNAL_H
