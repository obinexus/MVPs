// include/diram/core/config/config.h
// DIRAM Common Configuration System
// OBINexus Project - Unified configuration management

#ifndef DIRAM_CONFIG_H
#define DIRAM_CONFIG_H

#include <stddef.h>
#include <stdbool.h>
#include <limits.h>

#ifndef PATH_MAX
#define PATH_MAX 4096
#endif

// Configuration defaults
#define DIRAM_DEFAULT_CONFIG_FILE ".dramrc"
#define DIRAM_SYSTEM_CONFIG_FILE "/etc/diram/config.dram"
#define DIRAM_CONFIG_ENV "DIRAM_CONFIG"
#define DIRAM_DEFAULT_MEMORY_LIMIT 0  // No limit by default
#define DIRAM_DEFAULT_MAX_HEAP_EVENTS 3
#define DIRAM_DEFAULT_ENTROPY_THRESHOLD 0.05
#define DIRAM_DEFAULT_TELEMETRY_LEVEL 2

// Configuration key names
#define CFG_MEMORY_LIMIT "memory_limit"
#define CFG_MEMORY_SPACE "memory_space"
#define CFG_TRACE "trace"
#define CFG_LOG_DIR "log_dir"
#define CFG_MAX_HEAP_EVENTS "max_heap_events"
#define CFG_DETACH_TIMEOUT "detach_timeout"
#define CFG_PID_BINDING "pid_binding"
#define CFG_GUARD_PAGES "guard_pages"
#define CFG_CANARY_VALUES "canary_values"
#define CFG_ASLR_ENABLED "aslr_enabled"
#define CFG_TELEMETRY_LEVEL "telemetry_level"
#define CFG_TELEMETRY_ENDPOINT "telemetry_endpoint"
#define CFG_ZERO_TRUST "zero_trust"
#define CFG_MEMORY_AUDIT "memory_audit"

// Async configuration keys
#define CFG_ASYNC_ENABLE_PROMISES "async.enable_promises"
#define CFG_ASYNC_DEFAULT_TIMEOUT_MS "async.default_timeout_ms"
#define CFG_ASYNC_MAX_PENDING_PROMISES "async.max_pending_promises"
#define CFG_ASYNC_LOOKAHEAD_CACHE_SIZE "async.lookahead_cache_size"

// Detach configuration keys
#define CFG_DETACH_ENABLE_MODE "detach.enable_detach_mode"
#define CFG_DETACH_LOG_ASYNC_OPS "detach.log_async_operations"
#define CFG_DETACH_PERSIST_RECEIPTS "detach.persist_promise_receipts"

// Resilience configuration keys
#define CFG_RESIL_RETRY_TRANSIENT "resilience.retry_on_transient_failure"
#define CFG_RESIL_MAX_RETRY "resilience.max_retry_attempts"
#define CFG_RESIL_EXP_BACKOFF "resilience.exponential_backoff"

// Configuration Structure
typedef struct diram_config_t {
    // Basic configuration
    char config_file[PATH_MAX];
    
    // Memory configuration
    size_t memory_limit;      // Memory limit in MB
    char memory_space[64];    // Named memory space
    
    // Tracing configuration
    bool trace_enabled;
    char log_dir[PATH_MAX];
    
    // Heap constraint configuration
    int max_heap_events;
    
    // Process isolation settings
    int detach_timeout;       // Seconds
    char pid_binding[32];     // "strict" or "relaxed"
    
    // Memory protection flags
    bool guard_pages;
    bool canary_values;
    bool aslr_enabled;
    
    // Telemetry configuration
    int telemetry_level;
    char telemetry_endpoint[PATH_MAX];
    
    // Zero-trust memory policy
    bool zero_trust;
    bool memory_audit;
    
    // Async configuration (from [async] section)
    bool enable_promises;
    int default_timeout_ms;
    int max_pending_promises;
    int lookahead_cache_size;
    
    // Detach configuration (from [detach] section)
    bool enable_detach_mode;
    bool log_async_operations;
    bool persist_promise_receipts;
    
    // Resilience configuration (from [resilience] section)
    bool retry_on_transient_failure;
    int max_retry_attempts;
    bool exponential_backoff;
    
    // Runtime flags
    bool verbose;
    bool repl_mode;
    bool detach_mode;
    
} diram_config_t;

// Configuration loading hierarchy
typedef enum {
    CONFIG_SOURCE_DEFAULT,
    CONFIG_SOURCE_SYSTEM,
    CONFIG_SOURCE_USER,
    CONFIG_SOURCE_LOCAL,
    CONFIG_SOURCE_CMDLINE,
    CONFIG_SOURCE_ENV
} config_source_t;

// Global configuration instance
extern diram_config_t g_diram_config;

// Configuration API
int diram_config_init(void);
int diram_config_load_file(const char* filename, config_source_t source);
int diram_config_load_env(void);
int diram_config_set_value(const char* key, const char* value);
const char* diram_config_get_value(const char* key);
int diram_config_save(const char* filename);
void diram_config_print(void);
void diram_config_cleanup(void);
int diram_config_load_hierarchy(void);
// Configuration validation
bool diram_config_validate(void);
const char* diram_config_get_errors(void);

// Utility functions
size_t diram_config_parse_size(const char* size_str);
bool diram_config_parse_bool(const char* bool_str);

#endif // DIRAM_CONFIG_H