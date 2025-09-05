/*
 * riftsh.c - RIFT Interactive Shell for OBINexus
 * 
 * Purpose: Unix-like shell for RIFT development and orchestration
 * Standard: C19/C21 compliant, single-pass methodology
 * 
 * Features:
 * - Execute riftest for QA validation
 * - Deploy riftraf policies
 * - Monitor compliance in real-time
 * - Interactive REPL for RIFT code
 * 
 * Build: gcc -std=c19 -O3 riftsh.c -o riftsh -lreadline -lpthread -lcrypto
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdatomic.h>
#include <pthread.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <signal.h>
#include <time.h>
#include <errno.h>
#include <readline/readline.h>
#include <readline/history.h>
#include <openssl/sha.h>

/* Shell configuration */
#define PROMPT "riftsh> "
#define HISTORY_FILE ".riftsh_history"
#define MAX_CMD_LEN 4096
#define MAX_ARGS 256
#define MAX_JOBS 32
#define MAX_ENV_VARS 256

/* Compliance monitoring intervals */
#define MONITOR_INTERVAL_MS 1000
#define AUDIT_CHECK_INTERVAL_S 60

/* Built-in commands */
typedef enum {
    CMD_EXIT,
    CMD_HELP,
    CMD_CD,
    CMD_PWD,
    CMD_ENV,
    CMD_EXPORT,
    CMD_COMPILE,
    CMD_TEST,
    CMD_SEAL,
    CMD_MONITOR,
    CMD_AUDIT,
    CMD_GOSSIP,
    CMD_JOBS,
    CMD_FG,
    CMD_BG,
    CMD_KILL,
    CMD_HISTORY,
    CMD_COMPLIANCE,
    CMD_ROLLBACK,
    CMD_EXTERNAL
} command_type_t;

/* Job status */
typedef enum {
    JOB_RUNNING,
    JOB_STOPPED,
    JOB_COMPLETED,
    JOB_FAILED
} job_status_t;

/* Job structure */
typedef struct {
    pid_t pid;
    char command[MAX_CMD_LEN];
    job_status_t status;
    time_t start_time;
    time_t end_time;
    int exit_code;
    _Atomic bool active;
} job_t;

/* Environment variable */
typedef struct {
    char name[256];
    char value[1024];
} env_var_t;

/* Shell state */
static struct {
    char cwd[PATH_MAX];
    env_var_t env_vars[MAX_ENV_VARS];
    size_t env_count;
    job_t jobs[MAX_JOBS];
    size_t job_count;
    pthread_mutex_t job_lock;
    
    /* Monitoring state */
    _Atomic bool monitoring_active;
    pthread_t monitor_thread;
    
    /* Compliance state */
    _Atomic uint32_t violations;
    _Atomic uint32_t validations;
    time_t last_audit;
    
    /* Configuration */
    bool interactive;
    bool strict_mode;  /* Fail on any violation */
    char rift_path[PATH_MAX];
    char riftest_path[PATH_MAX];
    char riftraf_path[PATH_MAX];
    char gosilang_path[PATH_MAX];
} g_shell = {
    .job_lock = PTHREAD_MUTEX_INITIALIZER,
    .interactive = true,
    .strict_mode = false
};

/* ANSI color codes */
#define COLOR_RESET   "\033[0m"
#define COLOR_RED     "\033[31m"
#define COLOR_GREEN   "\033[32m"
#define COLOR_YELLOW  "\033[33m"
#define COLOR_BLUE    "\033[34m"
#define COLOR_MAGENTA "\033[35m"
#define COLOR_CYAN    "\033[36m"
#define COLOR_BOLD    "\033[1m"

/* Signal handler for child processes */
static void sigchld_handler(int sig) {
    pid_t pid;
    int status;
    
    /* Reap all available zombie children */
    while ((pid = waitpid(-1, &status, WNOHANG)) > 0) {
        pthread_mutex_lock(&g_shell.job_lock);
        
        /* Find and update job */
        for (size_t i = 0; i < g_shell.job_count; i++) {
            if (g_shell.jobs[i].pid == pid && atomic_load(&g_shell.jobs[i].active)) {
                g_shell.jobs[i].end_time = time(NULL);
                if (WIFEXITED(status)) {
                    g_shell.jobs[i].status = JOB_COMPLETED;
                    g_shell.jobs[i].exit_code = WEXITSTATUS(status);
                } else if (WIFSIGNALED(status)) {
                    g_shell.jobs[i].status = JOB_FAILED;
                    g_shell.jobs[i].exit_code = -WTERMSIG(status);
                }
                break;
            }
        }
        
        pthread_mutex_unlock(&g_shell.job_lock);
    }
}

/* Initialize shell paths */
static void init_paths(void) {
    /* Try to find executables in PATH or use defaults */
    const char *path_env = getenv("PATH");
    
    /* Set default paths */
    strcpy(g_shell.rift_path, "./rift.exe");
    strcpy(g_shell.riftest_path, "./riftest");
    strcpy(g_shell.riftraf_path, "./riftraf");
    strcpy(g_shell.gosilang_path, "./gosilang");
    
    /* Check if executables exist */
    struct stat st;
    if (stat(g_shell.rift_path, &st) != 0) {
        strcpy(g_shell.rift_path, "/usr/local/bin/rift.exe");
    }
    if (stat(g_shell.riftest_path, &st) != 0) {
        strcpy(g_shell.riftest_path, "/usr/local/bin/riftest");
    }
    if (stat(g_shell.riftraf_path, &st) != 0) {
        strcpy(g_shell.riftraf_path, "/usr/local/bin/riftraf");
    }
    if (stat(g_shell.gosilang_path, &st) != 0) {
        strcpy(g_shell.gosilang_path, "/usr/local/bin/gosilang");
    }
}

/* Add job to tracking */
static size_t add_job(pid_t pid, const char *command) {
    pthread_mutex_lock(&g_shell.job_lock);
    
    size_t job_id = 0;
    bool found = false;
    
    /* Find free slot */
    for (size_t i = 0; i < MAX_JOBS; i++) {
        if (!atomic_load(&g_shell.jobs[i].active)) {
            job_id = i;
            found = true;
            break;
        }
    }
    
    if (found) {
        g_shell.jobs[job_id].pid = pid;
        strncpy(g_shell.jobs[job_id].command, command, MAX_CMD_LEN - 1);
        g_shell.jobs[job_id].status = JOB_RUNNING;
        g_shell.jobs[job_id].start_time = time(NULL);
        g_shell.jobs[job_id].end_time = 0;
        g_shell.jobs[job_id].exit_code = 0;
        atomic_store(&g_shell.jobs[job_id].active, true);
        
        if (job_id >= g_shell.job_count) {
            g_shell.job_count = job_id + 1;
        }
    }
    
    pthread_mutex_unlock(&g_shell.job_lock);
    return found ? job_id : SIZE_MAX;
}

/* Parse command type */
static command_type_t parse_command(const char *cmd) {
    if (strcmp(cmd, "exit") == 0 || strcmp(cmd, "quit") == 0) return CMD_EXIT;
    if (strcmp(cmd, "help") == 0 || strcmp(cmd, "?") == 0) return CMD_HELP;
    if (strcmp(cmd, "cd") == 0) return CMD_CD;
    if (strcmp(cmd, "pwd") == 0) return CMD_PWD;
    if (strcmp(cmd, "env") == 0) return CMD_ENV;
    if (strcmp(cmd, "export") == 0) return CMD_EXPORT;
    if (strcmp(cmd, "compile") == 0 || strcmp(cmd, "rift") == 0) return CMD_COMPILE;
    if (strcmp(cmd, "test") == 0 || strcmp(cmd, "riftest") == 0) return CMD_TEST;
    if (strcmp(cmd, "seal") == 0 || strcmp(cmd, "riftraf") == 0) return CMD_SEAL;
    if (strcmp(cmd, "monitor") == 0) return CMD_MONITOR;
    if (strcmp(cmd, "audit") == 0) return CMD_AUDIT;
    if (strcmp(cmd, "gossip") == 0) return CMD_GOSSIP;
    if (strcmp(cmd, "jobs") == 0) return CMD_JOBS;
    if (strcmp(cmd, "fg") == 0) return CMD_FG;
    if (strcmp(cmd, "bg") == 0) return CMD_BG;
    if (strcmp(cmd, "kill") == 0) return CMD_KILL;
    if (strcmp(cmd, "history") == 0) return CMD_HISTORY;
    if (strcmp(cmd, "compliance") == 0) return CMD_COMPLIANCE;
    if (strcmp(cmd, "rollback") == 0) return CMD_ROLLBACK;
    return CMD_EXTERNAL;
}

/* Show help */
static void show_help(void) {
    printf(COLOR_BOLD "RIFT Shell Commands:" COLOR_RESET "\n\n");
    
    printf(COLOR_CYAN "Built-in Commands:" COLOR_RESET "\n");
    printf("  exit, quit     - Exit the shell\n");
    printf("  help, ?        - Show this help\n");
    printf("  cd <dir>       - Change directory\n");
    printf("  pwd            - Print working directory\n");
    printf("  env            - Show environment variables\n");
    printf("  export X=Y     - Set environment variable\n");
    printf("  jobs           - List background jobs\n");
    printf("  fg <job>       - Bring job to foreground\n");
    printf("  bg <job>       - Continue job in background\n");
    printf("  kill <job>     - Terminate job\n");
    printf("  history        - Show command history\n");
    
    printf("\n" COLOR_CYAN "RIFT Commands:" COLOR_RESET "\n");
    printf("  compile <file> - Compile RIFT source file\n");
    printf("  test [opts]    - Run riftest QA validation\n");
    printf("  seal [opts]    - Apply riftraf policy seals\n");
    printf("  monitor        - Start compliance monitoring\n");
    printf("  audit          - Show audit trail summary\n");
    printf("  gossip [cmd]   - Interact with gossip network\n");
    printf("  compliance     - Show compliance status\n");
    printf("  rollback       - Emergency rollback (PANIC mode)\n");
    
    printf("\n" COLOR_CYAN "Pipeline Examples:" COLOR_RESET "\n");
    printf("  compile app.rift | test | seal\n");
    printf("  monitor & compile app.rift\n");
    printf("  test --stage 4 --policy housing-rights\n");
}

/* Execute built-in command */
static int execute_builtin(command_type_t cmd, char *args[], int argc) {
    switch (cmd) {
        case CMD_EXIT:
            if (atomic_load(&g_shell.monitoring_active)) {
                printf("Stopping monitor...\n");
                atomic_store(&g_shell.monitoring_active, false);
                pthread_join(g_shell.monitor_thread, NULL);
            }
            return -1;  /* Signal to exit */
            
        case CMD_HELP:
            show_help();
            return 0;
            
        case CMD_CD:
            if (argc < 2) {
                const char *home = getenv("HOME");
                if (home && chdir(home) == 0) {
                    getcwd(g_shell.cwd, sizeof(g_shell.cwd));
                }
            } else if (chdir(args[1]) == 0) {
                getcwd(g_shell.cwd, sizeof(g_shell.cwd));
            } else {
                perror("cd");
                return 1;
            }
            return 0;
            
        case CMD_PWD:
            printf("%s\n", g_shell.cwd);
            return 0;
            
        case CMD_ENV:
            for (size_t i = 0; i < g_shell.env_count; i++) {
                printf("%s=%s\n", g_shell.env_vars[i].name, 
                       g_shell.env_vars[i].value);
            }
            return 0;
            
        case CMD_EXPORT:
            if (argc < 2) {
                fprintf(stderr, "Usage: export VAR=value\n");
                return 1;
            }
            char *eq = strchr(args[1], '=');
            if (eq) {
                *eq = '\0';
                if (g_shell.env_count < MAX_ENV_VARS) {
                    strncpy(g_shell.env_vars[g_shell.env_count].name, args[1], 255);
                    strncpy(g_shell.env_vars[g_shell.env_count].value, eq + 1, 1023);
                    setenv(args[1], eq + 1, 1);
                    g_shell.env_count++;
                }
            }
            return 0;
            
        case CMD_JOBS:
            pthread_mutex_lock(&g_shell.job_lock);
            printf("Job ID  PID     Status      Command\n");
            printf("------  ------  ----------  ----------------\n");
            for (size_t i = 0; i < g_shell.job_count; i++) {
                if (atomic_load(&g_shell.jobs[i].active)) {
                    const char *status = 
                        g_shell.jobs[i].status == JOB_RUNNING ? COLOR_GREEN "Running" :
                        g_shell.jobs[i].status == JOB_STOPPED ? COLOR_YELLOW "Stopped" :
                        g_shell.jobs[i].status == JOB_COMPLETED ? COLOR_BLUE "Done" :
                        COLOR_RED "Failed";
                    
                    printf("[%2zu]    %-6d  %s%-10s" COLOR_RESET "  %.40s\n",
                           i, g_shell.jobs[i].pid, status, "",
                           g_shell.jobs[i].command);
                }
            }
            pthread_mutex_unlock(&g_shell.job_lock);
            return 0;
            
        case CMD_COMPLIANCE:
            printf(COLOR_BOLD "Compliance Status:" COLOR_RESET "\n");
            printf("  Validations: " COLOR_GREEN "%u" COLOR_RESET "\n", 
                   atomic_load(&g_shell.validations));
            printf("  Violations:  " COLOR_RED "%u" COLOR_RESET "\n", 
                   atomic_load(&g_shell.violations));
            
            if (g_shell.last_audit > 0) {
                char timestr[64];
                struct tm *tm = localtime(&g_shell.last_audit);
                strftime(timestr, sizeof(timestr), "%Y-%m-%d %H:%M:%S", tm);
                printf("  Last Audit:  %s\n", timestr);
            }
            
            if (g_shell.strict_mode) {
                printf("  Mode:        " COLOR_YELLOW "STRICT" COLOR_RESET 
                       " (fail on any violation)\n");
            }
            
            return 0;
            
        case CMD_ROLLBACK:
            printf(COLOR_RED "EMERGENCY ROLLBACK INITIATED" COLOR_RESET "\n");
            printf("Triggering PANIC mode across all components...\n");
            
            /* Signal all RIFT components */
            system("pkill -USR1 rift.exe");
            system("pkill -USR1 riftest");
            system("pkill -USR1 riftraf");
            
            /* Create emergency audit entry */
            FILE *audit = fopen("/var/log/riftsh_emergency.log", "a");
            if (audit) {
                fprintf(audit, "[%ld] EMERGENCY ROLLBACK by riftsh\n", time(NULL));
                fclose(audit);
            }
            
            return 0;
            
        default:
            return 0;
    }
}

/* Monitoring thread */
static void* monitor_thread_func(void *arg) {
    char buffer[4096];
    
    while (atomic_load(&g_shell.monitoring_active)) {
        /* Run riftest in monitoring mode */
        FILE *fp = popen("riftest --monitor --json 2>/dev/null", "r");
        if (fp) {
            while (fgets(buffer, sizeof(buffer), fp) && 
                   atomic_load(&g_shell.monitoring_active)) {
                
                /* Parse JSON for violations */
                if (strstr(buffer, "\"constitutional_violations\": []")) {
                    atomic_fetch_add(&g_shell.validations, 1);
                } else if (strstr(buffer, "\"constitutional_violations\"")) {
                    atomic_fetch_add(&g_shell.violations, 1);
                    
                    /* Alert on violations */
                    printf("\n" COLOR_RED "[ALERT] Constitutional violation detected!" 
                           COLOR_RESET "\n");
                    printf("%s", buffer);
                    printf(PROMPT);
                    fflush(stdout);
                    
                    /* Strict mode - exit on violation */
                    if (g_shell.strict_mode) {
                        atomic_store(&g_shell.monitoring_active, false);
                        printf(COLOR_RED "\nSTRICT MODE: Exiting due to violation\n" 
                               COLOR_RESET);
                        exit(1);
                    }
                }
            }
            pclose(fp);
        }
        
        usleep(MONITOR_INTERVAL_MS * 1000);
    }
    
    return NULL;
}

/* Execute external command or pipeline */
static int execute_external(char *command) {
    /* Check for pipeline */
    char *pipe_pos = strchr(command, '|');
    
    if (pipe_pos) {
        /* Handle pipeline */
        int pipe_fd[2];
        if (pipe(pipe_fd) < 0) {
            perror("pipe");
            return 1;
        }
        
        *pipe_pos = '\0';
        char *cmd1 = command;
        char *cmd2 = pipe_pos + 1;
        
        /* First command */
        pid_t pid1 = fork();
        if (pid1 == 0) {
            /* Child 1 */
            close(pipe_fd[0]);
            dup2(pipe_fd[1], STDOUT_FILENO);
            close(pipe_fd[1]);
            
            execlp("/bin/sh", "sh", "-c", cmd1, NULL);
            perror("exec");
            exit(1);
        }
        
        /* Second command */
        pid_t pid2 = fork();
        if (pid2 == 0) {
            /* Child 2 */
            close(pipe_fd[1]);
            dup2(pipe_fd[0], STDIN_FILENO);
            close(pipe_fd[0]);
            
            execlp("/bin/sh", "sh", "-c", cmd2, NULL);
            perror("exec");
            exit(1);
        }
        
        /* Parent */
        close(pipe_fd[0]);
        close(pipe_fd[1]);
        
        int status1, status2;
        waitpid(pid1, &status1, 0);
        waitpid(pid2, &status2, 0);
        
        return WEXITSTATUS(status2);
        
    } else {
        /* Single command */
        pid_t pid = fork();
        
        if (pid == 0) {
            /* Child */
            execlp("/bin/sh", "sh", "-c", command, NULL);
            perror("exec");
            exit(1);
        } else if (pid > 0) {
            /* Parent */
            int status;
            
            /* Check for background execution */
            if (command[strlen(command) - 1] == '&') {
                /* Background job */
                size_t job_id = add_job(pid, command);
                printf("[%zu] %d\n", job_id, pid);
                return 0;
            } else {
                /* Foreground - wait */
                waitpid(pid, &status, 0);
                return WEXITSTATUS(status);
            }
        } else {
            perror("fork");
            return 1;
        }
    }
}

/* RIFT-specific command handlers */
static int handle_compile_command(char *args[], int argc) {
    if (argc < 2) {
        fprintf(stderr, "Usage: compile <file.rift> [-o output]\n");
        return 1;
    }
    
    char cmd[MAX_CMD_LEN];
    snprintf(cmd, sizeof(cmd), "%s compile %s", g_shell.rift_path, args[1]);
    
    if (argc > 2) {
        strcat(cmd, " ");
        for (int i = 2; i < argc; i++) {
            strcat(cmd, args[i]);
            strcat(cmd, " ");
        }
    }
    
    return execute_external(cmd);
}

static int handle_test_command(char *args[], int argc) {
    char cmd[MAX_CMD_LEN];
    snprintf(cmd, sizeof(cmd), "%s", g_shell.riftest_path);
    
    /* Add default arguments if none provided */
    if (argc == 1) {
        strcat(cmd, " --stage 4 --policy housing-rights");
    } else {
        for (int i = 1; i < argc; i++) {
            strcat(cmd, " ");
            strcat(cmd, args[i]);
        }
    }
    
    return execute_external(cmd);
}

static int handle_seal_command(char *args[], int argc) {
    char cmd[MAX_CMD_LEN];
    snprintf(cmd, sizeof(cmd), "%s --seal", g_shell.riftraf_path);
    
    if (argc > 1) {
        for (int i = 1; i < argc; i++) {
            strcat(cmd, " ");
            strcat(cmd, args[i]);
        }
    }
    
    return execute_external(cmd);
}

static int handle_monitor_command(char *args[], int argc) {
    if (atomic_load(&g_shell.monitoring_active)) {
        printf("Monitoring already active\n");
        return 0;
    }
    
    atomic_store(&g_shell.monitoring_active, true);
    if (pthread_create(&g_shell.monitor_thread, NULL, monitor_thread_func, NULL) == 0) {
        printf(COLOR_GREEN "Compliance monitoring started" COLOR_RESET "\n");
        return 0;
    } else {
        atomic_store(&g_shell.monitoring_active, false);
        perror("pthread_create");
        return 1;
    }
}

/* Main shell loop */
static void shell_loop(void) {
    char *line = NULL;
    
    /* Load history */
    read_history(HISTORY_FILE);
    
    while (1) {
        /* Free previous line */
        if (line) {
            free(line);
            line = NULL;
        }
        
        /* Read input */
        if (g_shell.interactive) {
            line = readline(PROMPT);
            if (!line) {
                /* EOF */
                printf("\n");
                break;
            }
            
            /* Skip empty lines */
            if (strlen(line) == 0) continue;
            
            /* Add to history */
            add_history(line);
        } else {
            /* Non-interactive mode */
            size_t len = 0;
            if (getline(&line, &len, stdin) < 0) {
                break;
            }
            /* Remove newline */
            line[strcspn(line, "\n")] = '\0';
        }
        
        /* Parse command */
        char *args[MAX_ARGS];
        int argc = 0;
        char *token = strtok(line, " \t");
        
        while (token && argc < MAX_ARGS - 1) {
            args[argc++] = token;
            token = strtok(NULL, " \t");
        }
        args[argc] = NULL;
        
        if (argc == 0) continue;
        
        /* Determine command type */
        command_type_t cmd_type = parse_command(args[0]);
        
        /* Execute command */
        int result = 0;
        
        if (cmd_type == CMD_EXTERNAL) {
            /* Check for RIFT-specific commands */
            if (strcmp(args[0], "compile") == 0 || strcmp(args[0], "rift") == 0) {
                result = handle_compile_command(args, argc);
            } else if (strcmp(args[0], "test") == 0 || strcmp(args[0], "riftest") == 0) {
                result = handle_test_command(args, argc);
            } else if (strcmp(args[0], "seal") == 0 || strcmp(args[0], "riftraf") == 0) {
                result = handle_seal_command(args, argc);
            } else if (strcmp(args[0], "monitor") == 0) {
                result = handle_monitor_command(args, argc);
            } else {
                /* General external command */
                result = execute_external(line);
            }
        } else {
            /* Built-in command */
            result = execute_builtin(cmd_type, args, argc);
            if (result < 0) {
                /* Exit requested */
                break;
            }
        }
        
        /* Update last command status */
        g_shell.env_vars[0].name[0] = '?';
        g_shell.env_vars[0].name[1] = '\0';
        snprintf(g_shell.env_vars[0].value, sizeof(g_shell.env_vars[0].value), 
                 "%d", result);
    }
    
    /* Save history */
    write_history(HISTORY_FILE);
    
    if (line) free(line);
}

/* Main entry point */
int main(int argc, char *argv[]) {
    /* Parse arguments */
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-c") == 0 && i + 1 < argc) {
            /* Execute command and exit */
            g_shell.interactive = false;
            execute_external(argv[++i]);
            return 0;
        } else if (strcmp(argv[i], "--strict") == 0) {
            g_shell.strict_mode = true;
        } else if (strcmp(argv[i], "--help") == 0) {
            printf("Usage: %s [options] [-c command]\n", argv[0]);
            printf("Options:\n");
            printf("  -c command   Execute command and exit\n");
            printf("  --strict     Exit on any constitutional violation\n");
            printf("  --help       Show this help\n");
            return 0;
        }
    }
    
    /* Initialize */
    getcwd(g_shell.cwd, sizeof(g_shell.cwd));
    init_paths();
    
    /* Set up signal handlers */
    struct sigaction sa = {
        .sa_handler = sigchld_handler,
        .sa_flags = SA_RESTART | SA_NOCLDSTOP
    };
    sigemptyset(&sa.sa_mask);
    sigaction(SIGCHLD, &sa, NULL);
    
    /* Ignore SIGPIPE */
    signal(SIGPIPE, SIG_IGN);
    
    /* Print banner */
    if (g_shell.interactive) {
        printf(COLOR_BOLD "RIFT Shell v1.0" COLOR_RESET " - OBINexus Development Environment\n");
        printf("Type 'help' for commands, 'exit' to quit\n");
        
        if (g_shell.strict_mode) {
            printf(COLOR_YELLOW "STRICT MODE: " COLOR_RESET 
                   "Will exit on any constitutional violation\n");
        }
        
        printf("\n");
    }
    
    /* Main loop */
    shell_loop();
    
    /* Cleanup */
    if (atomic_load(&g_shell.monitoring_active)) {
        atomic_store(&g_shell.monitoring_active, false);
        pthread_join(g_shell.monitor_thread, NULL);
    }
    
    printf(COLOR_BOLD "\nGoodbye!" COLOR_RESET " Stay compliant.\n");
    return 0;
}