// core/feature-alloc/alloc.h
#ifndef DIRAM_FEATURE_ALLOC_H
#define DIRAM_FEATURE_ALLOC_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>
#if defined(_WIN32) || defined(_WIN64)
// Windows does not support pthreads natively; define stubs or include Windows equivalents if needed
#include <windows.h>
typedef HANDLE pthread_mutex_t;
#define pthread_mutex_init(m, a)    (*(m) = CreateMutex(NULL, FALSE, NULL), 0)
#define pthread_mutex_destroy(m)    (CloseHandle(*(m)), 0)
#define pthread_mutex_lock(m)       (WaitForSingleObject(*(m), INFINITE) == WAIT_OBJECT_0 ? 0 : -1)
#define pthread_mutex_unlock(m)     (ReleaseMutex(*(m)) ? 0 : -1)
#else
#include <pthread.h>
#endif
#define DIRAM_MAX_HEAP_EVENTS 3
#define DIRAM_SHA256_HEX_LEN 65
#define DIRAM_TRACE_LOG_PATH "logs/alloc_trace.log"

typedef struct {
    void* base_addr;
    size_t size;
    uint64_t timestamp;
    char sha256_receipt[DIRAM_SHA256_HEX_LEN];
    uint8_t heap_events;
    pid_t binding_pid;  // PID binding for fork compliance
} diram_allocation_t;

// Thread-local heap event counter for constraint enforcement
typedef struct {
    uint8_t event_count;
    uint64_t command_epoch;
} diram_heap_context_t;

// Core allocation API
diram_allocation_t* diram_alloc_traced(size_t size, const char* tag);
void diram_free_traced(diram_allocation_t* alloc);

// Trace management
int diram_init_trace_log(void);
void diram_close_trace_log(void);

// SHA-256 receipt generation
void diram_compute_receipt(diram_allocation_t* alloc, const char* tag);

#endif // DIRAM_FEATURE_ALLOC_H


