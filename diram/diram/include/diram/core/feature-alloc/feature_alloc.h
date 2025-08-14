// include/diram/core/feature-alloc/feature_alloc.h
#ifndef DIRAM_FEATURE_ALLOC_ENHANCED_H
#define DIRAM_FEATURE_ALLOC_ENHANCED_H

#include "alloc.h"  // Base allocation types
#include <stdint.h>
#ifdef _WIN32
// Windows does not have pthreads; define stubs or include Windows threading headers as needed
#include <windows.h>
typedef HANDLE pthread_mutex_t;
#define pthread_mutex_init(m, a)   (*(m) = CreateMutex(NULL, FALSE, NULL), 0)
#define pthread_mutex_destroy(m)   (CloseHandle(*(m)), 0)
#define pthread_mutex_lock(m)      (WaitForSingleObject(*(m), INFINITE) == WAIT_OBJECT_0 ? 0 : -1)
#define pthread_mutex_unlock(m)    (ReleaseMutex(*(m)) ? 0 : -1)
#else
#include <pthread.h>
#endif
#include "alloc.h"  // Base allocation types
#include <stdint.h>
#include <stdio.h>  
#include <stdlib.h>
#include <string.h>

// Error Index Categories (Telemetry Schema Layer 2)
typedef enum {
    DIRAM_ERR_NONE = 0,
    DIRAM_ERR_HEAP_CONSTRAINT = 0x1001,    // ε(x) > 0.6 violation
    DIRAM_ERR_MEMORY_EXHAUSTED = 0x1002,   // OOM condition
    DIRAM_ERR_PID_MISMATCH = 0x1003,       // Fork safety violation
    DIRAM_ERR_BOUNDARY_VIOLATION = 0x1004, // Zero-trust boundary breach
    DIRAM_ERR_RECEIPT_INVALID = 0x1005,    // SHA-256 verification failed
    DIRAM_ERR_TRACE_FAILURE = 0x1006,      // Logging subsystem error
    DIRAM_ERR_CONFIG_INVALID = 0x1007,     // Configuration parse error
    DIRAM_ERR_ISOLATION_BREACH = 0x1008,   // Memory space violation
    DIRAM_ERR_TELEMETRY_LOST = 0x1009,     // Telemetry data loss
    DIRAM_ERR_GOVERNANCE_FAIL = 0x100A     // Sinphasé policy violation
} diram_error_code_t;

// Error Context Structure
typedef struct {
    diram_error_code_t code;
    uint64_t timestamp;
    pid_t pid;
    const char* file;
    int line;
    char context[256];
    uint8_t severity;  // 0-3: info, warning, error, critical
} diram_error_context_t;

// Memory Isolation Context
typedef struct {
    char space_name[64];
    size_t limit_bytes;
    size_t used_bytes;
    uint32_t allocation_count;
    pthread_mutex_t lock;
    int isolation_active;
    pid_t owner_pid;
} diram_memory_space_t;

// Telemetry Event Structure
typedef struct {
    uint64_t event_id;
    uint8_t layer;  // 1=system, 2=opcode-bound
    diram_error_code_t error_code;
    void* address;
    size_t size;
    char operation[32];
    char receipt[DIRAM_SHA256_HEX_LEN];
} diram_telemetry_event_t;

// Global Error Index
typedef struct {
    diram_error_context_t* errors;
    size_t error_count;
    size_t error_capacity;
    pthread_mutex_t mutex;
    FILE* error_log;
} diram_error_index_t;

// Enhanced Allocation with Error Tracking
typedef struct {
    diram_allocation_t base;  // Inherit base allocation
    diram_error_code_t last_error;
    uint32_t error_count;
    diram_memory_space_t* space;
    uint8_t flags;  // Guard pages, canary, etc.
} diram_enhanced_allocation_t;

// Error Index API
int diram_error_index_init(void);
void diram_error_index_shutdown(void);
void diram_error_record(diram_error_code_t code, const char* fmt, ...);
void diram_error_record_context(diram_error_context_t* ctx);
const diram_error_context_t* diram_error_get_last(void);
int diram_error_dump_index(const char* filename);

// Memory Space Management
diram_memory_space_t* diram_space_create(const char* name, size_t limit);
void diram_space_destroy(diram_memory_space_t* space);
int diram_space_bind_allocation(diram_memory_space_t* space, 
                                diram_enhanced_allocation_t* alloc);
int diram_space_check_limit(diram_memory_space_t* space, size_t requested);

// Enhanced Allocation API
diram_enhanced_allocation_t* diram_alloc_enhanced(size_t size, 
                                                   const char* tag,
                                                   diram_memory_space_t* space);
void diram_free_enhanced(diram_enhanced_allocation_t* alloc);
int diram_verify_receipt(diram_enhanced_allocation_t* alloc);

// Telemetry API
int diram_telemetry_init(const char* endpoint);
void diram_telemetry_shutdown(void);
void diram_telemetry_emit(diram_telemetry_event_t* event);
int diram_telemetry_flush(void);

// Configuration Integration
typedef struct {
    int enable_guard_pages;
    int enable_canary_values;
    int enable_aslr;
    int zero_trust_mode;
    int telemetry_level;
    size_t max_error_index_size;
} diram_feature_config_t;

int diram_feature_configure(const diram_feature_config_t* config);
const diram_feature_config_t* diram_feature_get_config(void);

// Macros for Error Tracking
#define DIRAM_ERROR(code, msg, ...) \
    diram_error_record(code, "[%s:%d] " msg, __FILE__, __LINE__, ##__VA_ARGS__)

#define DIRAM_CHECK(condition, error_code) \
    do { \
        if (!(condition)) { \
            DIRAM_ERROR(error_code, "Check failed: " #condition); \
            return NULL; \
        } \
    } while(0)

#define DIRAM_CHECK_SPACE(space, size) \
    DIRAM_CHECK(diram_space_check_limit(space, size) == 0, \
                DIRAM_ERR_MEMORY_EXHAUSTED)

// Zero-Trust Boundary Markers
#define DIRAM_GUARD_PATTERN 0xDEADBEEFCAFEBABEULL
#define DIRAM_CANARY_SIZE 16

// Governance Integration
typedef struct {
    double epsilon_current;  // Current ε(x) value
    double epsilon_limit;    // Maximum allowed (0.6)
    uint64_t violations;
    uint64_t enforcements;
} diram_governance_stats_t;

int diram_governance_check(void);
const diram_governance_stats_t* diram_governance_get_stats(void);

#endif // DIRAM_FEATURE_ALLOC_ENHANCED_H