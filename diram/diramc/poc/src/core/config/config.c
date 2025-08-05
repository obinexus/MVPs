// src/core/config/config.c
// DIRAM Common Configuration System Implementation
// OBINexus Project - Unified configuration management

#include "diram/core/config/config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <ctype.h>
#include <sys/stat.h>

// Global configuration instance
diram_config_t g_diram_config = {0};

// Error buffer for validation
static char g_config_error_buffer[1024] = {0};

// Internal helper to get home directory
static const char* get_home_dir(void) {
    const char* home = getenv("HOME");
    if (!home) {
        home = getenv("USERPROFILE"); // Windows fallback
    }
    return home;
}

// Initialize configuration with defaults
int diram_config_init(void) {
    memset(&g_diram_config, 0, sizeof(diram_config_t));
    
    // Set defaults
    strncpy(g_diram_config.config_file, DIRAM_DEFAULT_CONFIG_FILE, PATH_MAX - 1);
    g_diram_config.memory_limit = DIRAM_DEFAULT_MEMORY_LIMIT;
    strncpy(g_diram_config.memory_space, "default", 63);
    g_diram_config.trace_enabled = false;
    strncpy(g_diram_config.log_dir, "logs", PATH_MAX - 1);
    g_diram_config.max_heap_events = DIRAM_DEFAULT_MAX_HEAP_EVENTS;
    g_diram_config.detach_timeout = 30;
    strncpy(g_diram_config.pid_binding, "strict", 31);
    g_diram_config.guard_pages = true;
    g_diram_config.canary_values = true;
    g_diram_config.aslr_enabled = true;
    g_diram_config.telemetry_level = DIRAM_DEFAULT_TELEMETRY_LEVEL;
    strncpy(g_diram_config.telemetry_endpoint, "/var/run/diram/telemetry.sock", PATH_MAX - 1);
    g_diram_config.zero_trust = true;
    g_diram_config.memory_audit = true;
    
    // Async defaults
    g_diram_config.enable_promises = true;
    g_diram_config.default_timeout_ms = 10000;
    g_diram_config.max_pending_promises = 100;
    g_diram_config.lookahead_cache_size = 1024;
    
    // Detach defaults
    g_diram_config.enable_detach_mode = true;
    g_diram_config.log_async_operations = true;
    g_diram_config.persist_promise_receipts = true;
    
    // Resilience defaults
    g_diram_config.retry_on_transient_failure = true;
    g_diram_config.max_retry_attempts = 3;
    g_diram_config.exponential_backoff = true;
    
    // Runtime flags
    g_diram_config.verbose = false;
    g_diram_config.repl_mode = false;
    g_diram_config.detach_mode = false;
    
    return 0;
}

// Parse size with unit suffixes
size_t diram_config_parse_size(const char* size_str) {
    if (!size_str || !*size_str) return 0;
    
    char* endptr;
    size_t size = strtoul(size_str, &endptr, 10);
    
    // Handle unit suffixes
    if (*endptr != '\0') {
        switch (tolower(*endptr)) {
            case 'k': size *= 1024; break;
            case 'm': size *= 1024 * 1024; break;
            case 'g': size *= 1024 * 1024 * 1024; break;
        }
    }
    
    return size;
}

// Parse boolean value
bool diram_config_parse_bool(const char* bool_str) {
    if (!bool_str) return false;
    
    // Common boolean representations
    if (strcasecmp(bool_str, "true") == 0 ||
        strcasecmp(bool_str, "yes") == 0 ||
        strcasecmp(bool_str, "1") == 0 ||
        strcasecmp(bool_str, "on") == 0 ||
        strcasecmp(bool_str, "enabled") == 0) {
        return true;
    }
    
    return false;
}

// Process a single configuration line
static int process_config_line(const char* section, const char* key, const char* value) {
    char full_key[256];
    
    // Construct full key with section prefix if in a section
    if (section[0] != '\0') {
        snprintf(full_key, sizeof(full_key), "%s.%s", section, key);
    } else {
        strncpy(full_key, key, sizeof(full_key) - 1);
        full_key[sizeof(full_key) - 1] = '\0';
    }
    
    return diram_config_set_value(full_key, value);
}

// Load configuration from file
int diram_config_load_file(const char* filename, config_source_t source) {
    FILE* fp = fopen(filename, "r");
    if (!fp) {
        if (source == CONFIG_SOURCE_CMDLINE || g_diram_config.verbose) {
            fprintf(stderr, "Config file '%s' not found: %s\n", filename, strerror(errno));
        }
        return -1;
    }
    
    char line[1024];
    char section[64] = "";
    int line_num = 0;
    int errors = 0;
    
    while (fgets(line, sizeof(line), fp)) {
        line_num++;
        
        // Remove trailing newline and whitespace
        size_t len = strlen(line);
        while (len > 0 && (line[len-1] == '\n' || line[len-1] == '\r' || 
                          line[len-1] == ' ' || line[len-1] == '\t')) {
            line[--len] = '\0';
        }
        
        // Skip empty lines and comments
        if (len == 0 || line[0] == '#') continue;
        
        // Remove leading whitespace
        char* start = line;
        while (*start == ' ' || *start == '\t') start++;
        
        // Check for section header
        if (*start == '[') {
            char* end = strchr(start, ']');
            if (end) {
                *end = '\0';
                strncpy(section, start + 1, sizeof(section) - 1);
                section[sizeof(section) - 1] = '\0';
            } else {
                fprintf(stderr, "Config parse error at line %d: unclosed section\n", line_num);
                errors++;
            }
            continue;
        }
        
        // Parse key=value pairs
        char* equals = strchr(start, '=');
        if (!equals) {
            fprintf(stderr, "Config parse error at line %d: no '=' found\n", line_num);
            errors++;
            continue;
        }
        
        *equals = '\0';
        char* key = start;
        char* value = equals + 1;
        
        // Trim whitespace from key
        char* key_end = equals - 1;
        while (key_end > key && (*key_end == ' ' || *key_end == '\t')) {
            *key_end-- = '\0';
        }
        
        // Trim whitespace from value
        while (*value == ' ' || *value == '\t') value++;
        
        // Process the configuration line
        if (process_config_line(section, key, value) < 0) {
            fprintf(stderr, "Config error at line %d: failed to set %s\n", line_num, key);
            errors++;
        }
    }
    
    fclose(fp);
    
    if (g_diram_config.verbose) {
        printf("Loaded config from %s (source: %d, errors: %d)\n", filename, source, errors);
    }
    
    return errors > 0 ? -1 : 0;
}

// Set a configuration value
int diram_config_set_value(const char* key, const char* value) {
    if (!key || !value) return -1;
    
    // Basic configuration
    if (strcmp(key, CFG_MEMORY_LIMIT) == 0) {
        g_diram_config.memory_limit = strtoul(value, NULL, 10);
    } else if (strcmp(key, CFG_MEMORY_SPACE) == 0) {
        strncpy(g_diram_config.memory_space, value, 63);
    } else if (strcmp(key, CFG_TRACE) == 0) {
        g_diram_config.trace_enabled = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_LOG_DIR) == 0) {
        strncpy(g_diram_config.log_dir, value, PATH_MAX - 1);
    } else if (strcmp(key, CFG_MAX_HEAP_EVENTS) == 0) {
        g_diram_config.max_heap_events = strtol(value, NULL, 10);
    } else if (strcmp(key, CFG_DETACH_TIMEOUT) == 0) {
        g_diram_config.detach_timeout = strtol(value, NULL, 10);
    } else if (strcmp(key, CFG_PID_BINDING) == 0) {
        strncpy(g_diram_config.pid_binding, value, 31);
    } else if (strcmp(key, CFG_GUARD_PAGES) == 0) {
        g_diram_config.guard_pages = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_CANARY_VALUES) == 0) {
        g_diram_config.canary_values = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_ASLR_ENABLED) == 0) {
        g_diram_config.aslr_enabled = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_TELEMETRY_LEVEL) == 0) {
        g_diram_config.telemetry_level = strtol(value, NULL, 10);
    } else if (strcmp(key, CFG_TELEMETRY_ENDPOINT) == 0) {
        strncpy(g_diram_config.telemetry_endpoint, value, PATH_MAX - 1);
    } else if (strcmp(key, CFG_ZERO_TRUST) == 0) {
        g_diram_config.zero_trust = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_MEMORY_AUDIT) == 0) {
        g_diram_config.memory_audit = diram_config_parse_bool(value);
    }
    // Async configuration
    else if (strcmp(key, CFG_ASYNC_ENABLE_PROMISES) == 0) {
        g_diram_config.enable_promises = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_ASYNC_DEFAULT_TIMEOUT_MS) == 0) {
        g_diram_config.default_timeout_ms = strtol(value, NULL, 10);
    } else if (strcmp(key, CFG_ASYNC_MAX_PENDING_PROMISES) == 0) {
        g_diram_config.max_pending_promises = strtol(value, NULL, 10);
    } else if (strcmp(key, CFG_ASYNC_LOOKAHEAD_CACHE_SIZE) == 0) {
        g_diram_config.lookahead_cache_size = strtol(value, NULL, 10);
    }
    // Detach configuration
    else if (strcmp(key, CFG_DETACH_ENABLE_MODE) == 0) {
        g_diram_config.enable_detach_mode = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_DETACH_LOG_ASYNC_OPS) == 0) {
        g_diram_config.log_async_operations = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_DETACH_PERSIST_RECEIPTS) == 0) {
        g_diram_config.persist_promise_receipts = diram_config_parse_bool(value);
    }
    // Resilience configuration
    else if (strcmp(key, CFG_RESIL_RETRY_TRANSIENT) == 0) {
        g_diram_config.retry_on_transient_failure = diram_config_parse_bool(value);
    } else if (strcmp(key, CFG_RESIL_MAX_RETRY) == 0) {
        g_diram_config.max_retry_attempts = strtol(value, NULL, 10);
    } else if (strcmp(key, CFG_RESIL_EXP_BACKOFF) == 0) {
        g_diram_config.exponential_backoff = diram_config_parse_bool(value);
    }
    else {
        // Unknown key - log if verbose
        if (g_diram_config.verbose) {
            fprintf(stderr, "Warning: unknown config key '%s'\n", key);
        }
        return -1;
    }
    
    return 0;
}

// Get a configuration value as string
const char* diram_config_get_value(const char* key) {
    static char value_buffer[256];
    
    if (strcmp(key, CFG_MEMORY_LIMIT) == 0) {
        snprintf(value_buffer, sizeof(value_buffer), "%zu", g_diram_config.memory_limit);
    } else if (strcmp(key, CFG_MEMORY_SPACE) == 0) {
        return g_diram_config.memory_space;
    } else if (strcmp(key, CFG_TRACE) == 0) {
        return g_diram_config.trace_enabled ? "true" : "false";
    } else if (strcmp(key, CFG_LOG_DIR) == 0) {
        return g_diram_config.log_dir;
    } else {
        return NULL;
    }
    
    return value_buffer;
}

// Load configuration from environment
int diram_config_load_env(void) {
    const char* env_file = getenv(DIRAM_CONFIG_ENV);
    if (env_file) {
        return diram_config_load_file(env_file, CONFIG_SOURCE_ENV);
    }
    return 0;
}

// Load configuration hierarchy
int diram_config_load_hierarchy(void) {
    int errors = 0;
    char path[PATH_MAX];
    
    // 1. System-wide configuration
    if (diram_config_load_file(DIRAM_SYSTEM_CONFIG_FILE, CONFIG_SOURCE_SYSTEM) < 0) {
        errors++;
    }
    
    // 2. User home configuration
    const char* home = get_home_dir();
    if (home) {
        snprintf(path, sizeof(path), "%s/.dramrc", home);
        if (diram_config_load_file(path, CONFIG_SOURCE_USER) < 0) {
            errors++;
        }
    }
    
    // 3. Local directory configuration
    if (diram_config_load_file(".dramrc", CONFIG_SOURCE_LOCAL) < 0) {
        errors++;
    }
    
    // 4. Environment variable override
    if (diram_config_load_env() < 0) {
        errors++;
    }
    
    return errors;
}

// Validate configuration
bool diram_config_validate(void) {
    g_config_error_buffer[0] = '\0';
    bool valid = true;
    
    // Validate memory limit
    if (g_diram_config.memory_limit > 0 && g_diram_config.memory_limit < 16) {
        snprintf(g_config_error_buffer, sizeof(g_config_error_buffer),
                "Memory limit too small: %zu MB (minimum 16 MB)", 
                g_diram_config.memory_limit);
        valid = false;
    }
    
    // Validate heap events
    if (g_diram_config.max_heap_events < 1 || g_diram_config.max_heap_events > 10) {
        snprintf(g_config_error_buffer, sizeof(g_config_error_buffer),
                "Invalid max_heap_events: %d (must be between 1 and 10)", 
                g_diram_config.max_heap_events);
        valid = false;
    }
    
    // Validate telemetry level
    if (g_diram_config.telemetry_level < 0 || g_diram_config.telemetry_level > 3) {
        snprintf(g_config_error_buffer, sizeof(g_config_error_buffer),
                "Invalid telemetry_level: %d (must be between 0 and 3)", 
                g_diram_config.telemetry_level);
        valid = false;
    }
    
    return valid;
}

// Get validation error message
const char* diram_config_get_errors(void) {
    return g_config_error_buffer;
}

// Print current configuration
void diram_config_print(void) {
    printf("DIRAM Configuration:\n");
    printf("  Memory Configuration:\n");
    printf("    memory_limit: %zu MB\n", g_diram_config.memory_limit);
    printf("    memory_space: %s\n", g_diram_config.memory_space);
    printf("  Tracing:\n");
    printf("    trace_enabled: %s\n", g_diram_config.trace_enabled ? "yes" : "no");
    printf("    log_dir: %s\n", g_diram_config.log_dir);
    printf("  Heap Constraints:\n");
    printf("    max_heap_events: %d\n", g_diram_config.max_heap_events);
    printf("    epsilon: %.1f (ε = events/max)\n", 
           (float)g_diram_config.max_heap_events / 3.0);
    printf("  Process Isolation:\n");
    printf("    detach_timeout: %d seconds\n", g_diram_config.detach_timeout);
    printf("    pid_binding: %s\n", g_diram_config.pid_binding);
    printf("  Memory Protection:\n");
    printf("    guard_pages: %s\n", g_diram_config.guard_pages ? "enabled" : "disabled");
    printf("    canary_values: %s\n", g_diram_config.canary_values ? "enabled" : "disabled");
    printf("    aslr_enabled: %s\n", g_diram_config.aslr_enabled ? "enabled" : "disabled");
    printf("  Telemetry:\n");
    printf("    telemetry_level: %d\n", g_diram_config.telemetry_level);
    printf("    telemetry_endpoint: %s\n", g_diram_config.telemetry_endpoint);
    printf("  Zero-Trust Policy:\n");
    printf("    zero_trust: %s\n", g_diram_config.zero_trust ? "enabled" : "disabled");
    printf("    memory_audit: %s\n", g_diram_config.memory_audit ? "enabled" : "disabled");
    
    if (g_diram_config.verbose) {
        printf("  Async Configuration:\n");
        printf("    enable_promises: %s\n", g_diram_config.enable_promises ? "yes" : "no");
        printf("    default_timeout_ms: %d\n", g_diram_config.default_timeout_ms);
        printf("    max_pending_promises: %d\n", g_diram_config.max_pending_promises);
        printf("    lookahead_cache_size: %d\n", g_diram_config.lookahead_cache_size);
        printf("  Detach Mode:\n");
        printf("    enable_detach_mode: %s\n", g_diram_config.enable_detach_mode ? "yes" : "no");
        printf("    log_async_operations: %s\n", g_diram_config.log_async_operations ? "yes" : "no");
        printf("    persist_promise_receipts: %s\n", g_diram_config.persist_promise_receipts ? "yes" : "no");
        printf("  Resilience:\n");
        printf("    retry_on_transient_failure: %s\n", g_diram_config.retry_on_transient_failure ? "yes" : "no");
        printf("    max_retry_attempts: %d\n", g_diram_config.max_retry_attempts);
        printf("    exponential_backoff: %s\n", g_diram_config.exponential_backoff ? "yes" : "no");
    }
}

// Save configuration to file
int diram_config_save(const char* filename) {
    FILE* fp = fopen(filename, "w");
    if (!fp) {
        fprintf(stderr, "Failed to open config file for writing: %s\n", strerror(errno));
        return -1;
    }
    
    fprintf(fp, "# DIRAM Configuration File\n");
    fprintf(fp, "# Generated by DIRAM v%s\n\n", "1.0.0");
    
    fprintf(fp, "# Memory Configuration\n");
    fprintf(fp, "%s=%zu\n", CFG_MEMORY_LIMIT, g_diram_config.memory_limit);
    fprintf(fp, "%s=%s\n", CFG_MEMORY_SPACE, g_diram_config.memory_space);
    fprintf(fp, "\n");
    
    fprintf(fp, "# Tracing Configuration\n");
    fprintf(fp, "%s=%s\n", CFG_TRACE, g_diram_config.trace_enabled ? "true" : "false");
    fprintf(fp, "%s=%s\n", CFG_LOG_DIR, g_diram_config.log_dir);
    fprintf(fp, "\n");
    
    fprintf(fp, "# Heap Constraint Configuration\n");
    fprintf(fp, "%s=%d\n", CFG_MAX_HEAP_EVENTS, g_diram_config.max_heap_events);
    fprintf(fp, "\n");
    
    fprintf(fp, "# Process Isolation Settings\n");
    fprintf(fp, "%s=%d\n", CFG_DETACH_TIMEOUT, g_diram_config.detach_timeout);
    fprintf(fp, "%s=%s\n", CFG_PID_BINDING, g_diram_config.pid_binding);
    fprintf(fp, "\n");
    
    fprintf(fp, "# Memory Protection Flags\n");
    fprintf(fp, "%s=%s\n", CFG_GUARD_PAGES, g_diram_config.guard_pages ? "true" : "false");
    fprintf(fp, "%s=%s\n", CFG_CANARY_VALUES, g_diram_config.canary_values ? "true" : "false");
    fprintf(fp, "%s=%s\n", CFG_ASLR_ENABLED, g_diram_config.aslr_enabled ? "true" : "false");
    fprintf(fp, "\n");
    
    fprintf(fp, "# Telemetry Configuration\n");
    fprintf(fp, "%s=%d\n", CFG_TELEMETRY_LEVEL, g_diram_config.telemetry_level);
    fprintf(fp, "%s=%s\n", CFG_TELEMETRY_ENDPOINT, g_diram_config.telemetry_endpoint);
    fprintf(fp, "\n");
    
    fprintf(fp, "# Zero-Trust Memory Policy\n");
    fprintf(fp, "%s=%s\n", CFG_ZERO_TRUST, g_diram_config.zero_trust ? "true" : "false");
    fprintf(fp, "%s=%s\n", CFG_MEMORY_AUDIT, g_diram_config.memory_audit ? "true" : "false");
    fprintf(fp, "\n");
    
    fprintf(fp, "[async]\n");
    fprintf(fp, "enable_promises=%s\n", g_diram_config.enable_promises ? "true" : "false");
    fprintf(fp, "default_timeout_ms=%d\n", g_diram_config.default_timeout_ms);
    fprintf(fp, "max_pending_promises=%d\n", g_diram_config.max_pending_promises);
    fprintf(fp, "lookahead_cache_size=%d\n", g_diram_config.lookahead_cache_size);
    fprintf(fp, "\n");
    
    fprintf(fp, "[detach]\n");
    fprintf(fp, "enable_detach_mode=%s\n", g_diram_config.enable_detach_mode ? "true" : "false");
    fprintf(fp, "log_async_operations=%s\n", g_diram_config.log_async_operations ? "true" : "false");
    fprintf(fp, "persist_promise_receipts=%s\n", g_diram_config.persist_promise_receipts ? "true" : "false");
    fprintf(fp, "\n");
    
    fprintf(fp, "[resilience]\n");
    fprintf(fp, "retry_on_transient_failure=%s\n", g_diram_config.retry_on_transient_failure ? "true" : "false");
    fprintf(fp, "max_retry_attempts=%d\n", g_diram_config.max_retry_attempts);
    fprintf(fp, "exponential_backoff=%s\n", g_diram_config.exponential_backoff ? "true" : "false");
    
    fclose(fp);
    return 0;
}

// Cleanup configuration
void diram_config_cleanup(void) {
    // Currently nothing to cleanup, but placeholder for future
    // dynamic allocations
}