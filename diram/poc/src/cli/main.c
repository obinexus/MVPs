// src/cli/main.c - DIRAM CLI with detach mode and configuration support
// OBINexus Project - Directed Instruction RAM

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <getopt.h>
#include <signal.h>
#if defined(_WIN32) || defined(_WIN64)
#include <windows.h>
#else
#include <sys/wait.h>
#include <sys/stat.h>
#endif
#include <fcntl.h>
#include <errno.h>
#include <limits.h>
#include <ctype.h>
#include <dirent.h>
#include "diram/core/feature-alloc/alloc.h"
#include "diram/core/feature-alloc/feature_alloc.h"
#include "diram/core/config/config.h"

#ifndef PATH_MAX
#define PATH_MAX 4096
#endif

#define DIRAM_VERSION "1.0.0"
#define DIRAM_CONFIG_ENV "DIRAM_CONFIG"
#define DIRAM_DEFAULT_CONFIG ".dramrc"

// Global configuration
static diram_config_t g_config = {
    .config_file = "",
    .detach_mode = 0,
    .trace_enabled = 0,
    .repl_mode = 0,
    .memory_limit = 0,
    .memory_space = "default",
    .log_dir = "logs",
    .verbose = 0
};



// Global structures for REPL state management
typedef struct {
    diram_allocation_t* alloc;
    char tag[64];
    void* address;
} repl_allocation_t;

#define MAX_REPL_ALLOCATIONS 1024
static repl_allocation_t g_repl_allocations[MAX_REPL_ALLOCATIONS];
static int g_repl_allocation_count = 0;
static diram_memory_space_t* g_repl_memory_space = NULL;

// Helper function to parse size with unit suffixes
static size_t parse_size(const char* size_str) {
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

// Helper function to find allocation by address
static int find_allocation_by_address(void* addr) {
    for (int i = 0; i < g_repl_allocation_count; i++) {
        if (g_repl_allocations[i].alloc && 
            g_repl_allocations[i].alloc->base_addr == addr) {
            return i;
        }
    }
    return -1;
}

// REPL command implementations
static void repl_cmd_alloc(const char* args) {
    char size_str[32] = {0};
    char tag[64] = {0};
    
    int parsed = sscanf(args, "%31s %63s", size_str, tag);
    if (parsed < 1) {
        printf("Error: Usage: alloc <size> [tag]\n");
        printf("       Size can use suffixes: K, M, G (e.g., 4K, 16M)\n");
        return;
    }
    
    size_t size = parse_size(size_str);
    if (size == 0) {
        printf("Error: Invalid size specified\n");
        return;
    }
    
    if (g_repl_allocation_count >= MAX_REPL_ALLOCATIONS) {
        printf("Error: Maximum allocations reached (%d)\n", MAX_REPL_ALLOCATIONS);
        return;
    }
    
    // Initialize memory space if needed
    if (!g_repl_memory_space && g_config.memory_limit > 0) {
        g_repl_memory_space = diram_space_create(
            g_config.memory_space, 
            g_config.memory_limit * 1024 * 1024
        );
    }
    
    // Perform allocation
    diram_allocation_t* alloc = diram_alloc_traced(
        size, 
        tag[0] ? tag : NULL
    );
    
    if (!alloc) {
        printf("Error: Allocation failed (constraint violation or OOM)\n");
        return;
    }
    
    // Store allocation info
    g_repl_allocations[g_repl_allocation_count].alloc = alloc;
    snprintf(g_repl_allocations[g_repl_allocation_count].tag,
             sizeof(g_repl_allocations[g_repl_allocation_count].tag),
             "%s", tag[0] ? tag : "untagged");
    g_repl_allocations[g_repl_allocation_count].address = alloc->base_addr;
    g_repl_allocation_count++;
    
    printf("Allocated %zu bytes at %p\n", size, alloc->base_addr);
    printf("  SHA-256: %.16s...\n", alloc->sha256_receipt);
    printf("  Heap events: %d/3\n", alloc->heap_events);
}

static void repl_cmd_free(const char* args) {
    void* addr;
    if (sscanf(args, "%p", &addr) != 1) {
        printf("Error: Usage: free <address>\n");
        return;
    }
    
    int index = find_allocation_by_address(addr);
    if (index < 0) {
        printf("Error: No allocation found at address %p\n", addr);
        return;
    }
    
    diram_free_traced(g_repl_allocations[index].alloc);
    printf("Freed allocation at %p\n", addr);
    
    // Remove from tracking
    g_repl_allocations[index].alloc = NULL;
    
    // Compact array
    for (int i = index; i < g_repl_allocation_count - 1; i++) {
        g_repl_allocations[i] = g_repl_allocations[i + 1];
    }
    g_repl_allocation_count--;
}

static void repl_cmd_trace(void) {
    if (g_repl_allocation_count == 0) {
        printf("No active allocations\n");
        return;
    }
    
    printf("Active allocations: %d\n", g_repl_allocation_count);
    printf("%-18s %-10s %-20s %-18s\n", 
           "Address", "Size", "Tag", "SHA-256");
    printf("%-18s %-10s %-20s %-18s\n",
           "-------", "----", "---", "-------");
    
    for (int i = 0; i < g_repl_allocation_count; i++) {
        if (g_repl_allocations[i].alloc) {
            printf("%-18p %-10zu %-20s %.16s...\n",
                   g_repl_allocations[i].alloc->base_addr,
                   g_repl_allocations[i].alloc->size,
                   g_repl_allocations[i].tag,
                   g_repl_allocations[i].alloc->sha256_receipt);
        }
    }
    
    // Show heap constraint status
    if (g_repl_allocation_count > 0) {
        diram_allocation_t* last = g_repl_allocations[g_repl_allocation_count-1].alloc;
        if (last) {
            printf("\nHeap constraint status: %d/3 events used (ε = %.1f)\n", 
                   last->heap_events, last->heap_events / 3.0);
        }
    }
}

static void repl_cmd_config(void) {
    printf("Current configuration:\n");
    printf("  Memory limit: %zu MB\n", g_config.memory_limit);
    printf("  Memory space: %s\n", g_config.memory_space);
    printf("  Trace enabled: %s\n", g_config.trace_enabled ? "yes" : "no");
    printf("  Verbose mode: %s\n", g_config.verbose ? "yes" : "no");
    
    if (g_repl_memory_space) {
        printf("\nMemory space status:\n");
        printf("  Used: %zu bytes\n", g_repl_memory_space->used_bytes);
        printf("  Limit: %zu bytes\n", g_repl_memory_space->limit_bytes);
        printf("  Allocations: %u\n", g_repl_memory_space->allocation_count);
    }
}

// Signal handling for detached processes
static void sigchld_handler(int sig) {
    (void)sig;
#ifndef _WIN32
    while (waitpid(-1, NULL, WNOHANG) > 0);
#endif
}

// Parse configuration file (.dramrc or specified)
static int parse_config_file(const char *filename) {
    FILE *fp = fopen(filename, "r");
    if (!fp) {
        if (g_config.verbose) {
            fprintf(stderr, "Config file '%s' not found, using defaults\n", filename);
        }
        return 0;
    }

    char line[1024];
    while (fgets(line, sizeof(line), fp)) {
        // Skip comments and empty lines
        if (line[0] == '#' || line[0] == '\n') continue;
        
        // Remove trailing newline
        line[strcspn(line, "\n")] = 0;
        
        // Parse key=value pairs
        char *key = strtok(line, "=");
        char *value = strtok(NULL, "=");
        
        if (!key || !value) continue;
        
        // Trim whitespace
        while (*key == ' ') key++;
        while (*value == ' ') value++;
        
        if (strcmp(key, "memory_limit") == 0) {
            g_config.memory_limit = strtoul(value, NULL, 10);
        } else if (strcmp(key, "memory_space") == 0) {
            strncpy(g_config.memory_space, value, sizeof(g_config.memory_space) - 1);
        } else if (strcmp(key, "trace") == 0) {
            g_config.trace_enabled = (strcmp(value, "true") == 0);
        } else if (strcmp(key, "log_dir") == 0) {
            strncpy(g_config.log_dir, value, sizeof(g_config.log_dir) - 1);
        }
    }
    
    fclose(fp);
    return 0;
}

// Detach mode implementation
static int run_detached(char **argv) {
    pid_t pid = fork();
    
    if (pid < 0) {
        perror("fork");
        return -1;
    }
    
    if (pid > 0) {
        // Parent process
        printf("DIRAM detached with PID: %d\n", pid);
        printf("Logs: %s/diram.{out,err}.log\n", g_config.log_dir);
        return 0;
    }
    
    // Child process - become session leader
    if (setsid() < 0) {
        perror("setsid");
        exit(1);
    }
    
    // Setup signal handling
    #if !defined(_WIN32) && !defined(_WIN64)
        signal(SIGCHLD, sigchld_handler);
        signal(SIGHUP, SIG_IGN);
    #endif
    
    // Create log directory
    #if defined(_WIN32) || defined(_WIN64)
        mkdir(g_config.log_dir);
    #else
        mkdir(g_config.log_dir, 0755);
    #endif
    
    // Redirect stdout/stderr to log files with safe path construction
    char log_path[PATH_MAX];
    int path_len;
    
    // Ensure log directory length leaves room for filename
    if (strlen(g_config.log_dir) > PATH_MAX - 32) {
        fprintf(stderr, "Log directory path too long\n");
        exit(1);
    }
    
    path_len = snprintf(log_path, sizeof(log_path), "%s/diram.out.log", g_config.log_dir);
    if (path_len >= (int)sizeof(log_path)) {
        fprintf(stderr, "Output log path truncated\n");
        exit(1);
    }
    
    int fd_out = open(log_path, O_WRONLY | O_CREAT | O_APPEND, 0644);
    if (fd_out >= 0) {
        dup2(fd_out, STDOUT_FILENO);
        close(fd_out);
    }
    
    path_len = snprintf(log_path, sizeof(log_path), "%s/diram.err.log", g_config.log_dir);
    if (path_len >= (int)sizeof(log_path)) {
        fprintf(stderr, "Error log path truncated\n");
        exit(1);
    }
    
    int fd_err = open(log_path, O_WRONLY | O_CREAT | O_APPEND, 0644);
    if (fd_err >= 0) {
        dup2(fd_err, STDERR_FILENO);
        close(fd_err);
    }
    
    // Close stdin
    close(STDIN_FILENO);
    
    // Execute with clean argv (remove --detach)
    execvp(argv[0], argv);
    perror("execvp");
    exit(1);
}

// Memory isolation with configurable limits
static int setup_memory_isolation(void) {
    if (g_config.memory_limit == 0) {
        return 0; // No limit configured
    }
    
    // Initialize traced allocation system
    if (g_config.trace_enabled) {
        if (diram_init_trace_log() < 0) {
            fprintf(stderr, "Warning: Failed to initialize trace log\n");
        }
    }
    
    printf("Memory isolation configured:\n");
    printf("  Space: %s\n", g_config.memory_space);
    printf("  Limit: %zu MB\n", g_config.memory_limit);
    printf("  Trace: %s\n", g_config.trace_enabled ? "enabled" : "disabled");
    
    return 0;
}

// Enhanced REPL mode implementation
static int run_repl(void) {
    printf("DIRAM REPL v%s\n", DIRAM_VERSION);
    printf("Type 'help' for commands, 'exit' to quit\n\n");
    
    // Initialize tracing if enabled
    if (g_config.trace_enabled) {
        if (diram_init_trace_log() < 0) {
            fprintf(stderr, "Warning: Failed to initialize trace log\n");
        }
    }
    
    // Initialize error indexing
    diram_error_index_init();
    
    char line[1024];
    char cmd[64];
    char args[960];
    
    while (1) {
        printf("diram> ");
        fflush(stdout);
        
        if (!fgets(line, sizeof(line), stdin)) {
            break;
        }
        
        // Remove newline
        line[strcspn(line, "\n")] = 0;
        
        // Skip empty lines
        if (strlen(line) == 0) {
            continue;
        }
        
        // Parse command and arguments
        int parsed = sscanf(line, "%63s %959[^\n]", cmd, args);
        if (parsed < 1) {
            continue;
        }
        
        // Process commands
        if (strcmp(cmd, "exit") == 0 || strcmp(cmd, "quit") == 0) {
            break;
        } else if (strcmp(cmd, "help") == 0) {
            printf("Commands:\n");
            printf("  alloc <size> [tag]  - Allocate traced memory\n");
            printf("                        Size supports K/M/G suffixes\n");
            printf("  free <addr>         - Free allocated memory\n");
            printf("  trace               - Show allocation trace\n");
            printf("  config              - Show current configuration\n");
            printf("  exit/quit           - Exit REPL\n");
            printf("\nExamples:\n");
            printf("  alloc 1024 mybuffer\n");
            printf("  alloc 4K tempdata\n");
            printf("  alloc 1M\n");
            printf("  free 0x7fff12345678\n");
        } else if (strcmp(cmd, "alloc") == 0) {
            repl_cmd_alloc(parsed > 1 ? args : "");
        } else if (strcmp(cmd, "free") == 0) {
            repl_cmd_free(parsed > 1 ? args : "");
        } else if (strcmp(cmd, "trace") == 0) {
            repl_cmd_trace();
        } else if (strcmp(cmd, "config") == 0) {
            repl_cmd_config();
        } else {
            printf("Unknown command: %s\n", cmd);
            printf("Type 'help' for available commands\n");
        }
    }
    
    // Cleanup any remaining allocations
    printf("\nCleaning up %d allocations...\n", g_repl_allocation_count);
    for (int i = 0; i < g_repl_allocation_count; i++) {
        if (g_repl_allocations[i].alloc) {
            diram_free_traced(g_repl_allocations[i].alloc);
        }
    }
    
    // Cleanup memory space
    if (g_repl_memory_space) {
        diram_space_destroy(g_repl_memory_space);
    }
    
    // Cleanup subsystems
    diram_error_index_shutdown();
    if (g_config.trace_enabled) {
        diram_close_trace_log();
    }
    
    printf("Exiting DIRAM REPL\n");
    return 0;
}

static void print_usage(const char *prog) {
    printf("Usage: %s [OPTIONS] [COMMAND]\n", prog);
    printf("\nOptions:\n");
    printf("  -c, --config FILE    Load configuration from FILE (default: .dramrc)\n");
    printf("  -d, --detach         Run in detached mode (daemon)\n");
    printf("  -t, --trace          Enable memory allocation tracing\n");
    printf("  -r, --repl           Start interactive REPL\n");
    printf("  -m, --memory LIMIT   Set memory limit in MB\n");
    printf("  -s, --space NAME     Set memory space name\n");
    printf("  -v, --verbose        Enable verbose output\n");
    printf("  -h, --help           Show this help\n");
    printf("  -V, --version        Show version\n");
    printf("\nExamples:\n");
    printf("  %s --detach -c myconfig.drc\n", prog);
    printf("  %s --repl --trace\n", prog);
    printf("  %s --memory 1024 --space userspace\n", prog);
}

int main(int argc, char *argv[]) {
    // Command line options
    static struct option long_options[] = {
        {"config",  required_argument, 0, 'c'},
        {"detach",  no_argument,       0, 'd'},
        {"trace",   no_argument,       0, 't'},
        {"repl",    no_argument,       0, 'r'},
        {"memory",  required_argument, 0, 'm'},
        {"space",   required_argument, 0, 's'},
        {"verbose", no_argument,       0, 'v'},
        {"help",    no_argument,       0, 'h'},
        {"version", no_argument,       0, 'V'},
        {0, 0, 0, 0}
    };
    
    // Parse command line
    int opt;
    while ((opt = getopt_long(argc, argv, "c:dtrm:s:vhV", long_options, NULL)) != -1) {
        switch (opt) {
            case 'c':
                strncpy(g_config.config_file, optarg, sizeof(g_config.config_file) - 1);
                break;
            case 'd':
                g_config.detach_mode = 1;
                break;
            case 't':
                g_config.trace_enabled = 1;
                break;
            case 'r':
                g_config.repl_mode = 1;
                break;
            case 'm':
                g_config.memory_limit = strtoul(optarg, NULL, 10);
                break;
            case 's':
                strncpy(g_config.memory_space, optarg, sizeof(g_config.memory_space) - 1);
                break;
            case 'v':
                g_config.verbose = 1;
                break;
            case 'h':
                print_usage(argv[0]);
                return 0;
            case 'V':
                printf("DIRAM v%s (OBINexus Project)\n", DIRAM_VERSION);
                return 0;
            default:
                print_usage(argv[0]);
                return 1;
        }
    }
    
    // Load configuration file
    const char *config_file = g_config.config_file[0] ? g_config.config_file : 
                              getenv(DIRAM_CONFIG_ENV) ? getenv(DIRAM_CONFIG_ENV) : 
                              DIRAM_DEFAULT_CONFIG;
    parse_config_file(config_file);
    
    // Handle detach mode
    if (g_config.detach_mode) {
        // Prepare argv without --detach for re-execution
        char **new_argv = malloc(sizeof(char*) * argc);
        int j = 0;
        for (int i = 0; i < argc; i++) {
            if (strcmp(argv[i], "--detach") != 0 && strcmp(argv[i], "-d") != 0) {
                new_argv[j++] = argv[i];
            }
        }
        new_argv[j] = NULL;
        
        int ret = run_detached(new_argv);
        free(new_argv);
        return ret;
    }
    
    // Setup memory isolation
    setup_memory_isolation();
    
    // Handle REPL mode
    if (g_config.repl_mode) {
        return run_repl();
    }
    
    // Default operation
    printf("DIRAM v%s initialized\n", DIRAM_VERSION);
    printf("Configuration:\n");
    printf("  Config file: %s\n", config_file);
    printf("  Memory space: %s\n", g_config.memory_space);
    if (g_config.memory_limit > 0) {
        printf("  Memory limit: %zu MB\n", g_config.memory_limit);
    }
    
    // Cleanup
    if (g_config.trace_enabled) {
        diram_close_trace_log();
    }
    
    return 0;
}