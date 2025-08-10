// main.c - Thread-based process detachment for OBINexus Cloth Simulation
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <signal.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <errno.h>

// Thread-based linked list for process management
typedef struct ProcessNode {
    pid_t pid;
    pthread_t thread_id;
    char* process_name;
    int is_detached;
    struct ProcessNode* next;
} ProcessNode;

typedef struct {
    ProcessNode* head;
    pthread_mutex_t mutex;
    int active_count;
} ProcessList;

// Global process list
ProcessList* g_process_list = NULL;

// Function prototypes
void init_process_list(void);
void add_process(pid_t pid, pthread_t tid, const char* name, int detached);
void remove_process(pid_t pid);
void* detached_cloth_thread(void* arg);
void signal_handler(int sig);
int launch_detached_process(const char* executable, char* const argv[]);
void transfer_pid_to_child(pid_t parent, pid_t child);

// External function from cloth_simulation.c main.c 
extern int run_cloth_simulation(int argc, char* argv[]);

// Initialize process list
void init_process_list(void) {
    g_process_list = malloc(sizeof(ProcessList));
    g_process_list->head = NULL;
    g_process_list->active_count = 0;
    pthread_mutex_init(&g_process_list->mutex, NULL);
}

// Add process to linked list
void add_process(pid_t pid, pthread_t tid, const char* name, int detached) {
    ProcessNode* node = malloc(sizeof(ProcessNode));
    node->pid = pid;
    node->thread_id = tid;
    node->process_name = strdup(name);
    node->is_detached = detached;
    
    pthread_mutex_lock(&g_process_list->mutex);
    node->next = g_process_list->head;
    g_process_list->head = node;
    g_process_list->active_count++;
    pthread_mutex_unlock(&g_process_list->mutex);
    
    printf("[OBINexus] Process added: PID=%d, Thread=%lu, Name=%s, Detached=%d\n",
           pid, (unsigned long)tid, name, detached);
}

// Remove process from list
void remove_process(pid_t pid) {
    pthread_mutex_lock(&g_process_list->mutex);
    
    ProcessNode* current = g_process_list->head;
    ProcessNode* prev = NULL;
    
    while (current != NULL) {
        if (current->pid == pid) {
            if (prev == NULL) {
                g_process_list->head = current->next;
            } else {
                prev->next = current->next;
            }
            
            free(current->process_name);
            free(current);
            g_process_list->active_count--;
            break;
        }
        prev = current;
        current = current->next;
    }
    
    pthread_mutex_unlock(&g_process_list->mutex);
}

// Thread function for detached cloth simulation
void* detached_cloth_thread(void* arg) {
    char** argv = (char**)arg;
    pid_t tid = syscall(SYS_gettid);
    
    printf("[OBINexus] Detached thread started: TID=%d\n", tid);
    
    // Add to process list
    add_process(getpid(), pthread_self(), "obinexus_cloth_detached", 1);
    
    // Run the cloth simulation
    run_cloth_simulation(1, argv);
    
    // Clean up
    remove_process(getpid());
    
    return NULL;
}

// Signal handler for clean shutdown
void signal_handler(int sig) {
    if (sig == SIGCHLD) {
        // Reap child processes
        pid_t pid;
        int status;
        
        while ((pid = waitpid(-1, &status, WNOHANG)) > 0) {
            printf("[OBINexus] Child process %d exited with status %d\n", pid, status);
            remove_process(pid);
        }
    } else if (sig == SIGTERM || sig == SIGINT) {
        printf("[OBINexus] Shutting down...\n");
        // Clean shutdown logic here
        exit(0);
    }
}

// Launch detached process with fork
int launch_detached_process(const char* executable, char* const argv[]) {
    pid_t pid = fork();
    
    if (pid < 0) {
        perror("fork");
        return -1;
    } else if (pid == 0) {
        // Child process
        // Create new session and process group
        if (setsid() < 0) {
            perror("setsid");
            exit(1);
        }
        
        // Fork again to ensure we can't acquire a controlling terminal
        pid_t pid2 = fork();
        if (pid2 < 0) {
            perror("fork2");
            exit(1);
        } else if (pid2 > 0) {
            // First child exits
            exit(0);
        }
        
        // Second child continues
        // Close standard file descriptors
        close(STDIN_FILENO);
        close(STDOUT_FILENO);
        close(STDERR_FILENO);
        
        // Redirect to /dev/null
        freopen("/dev/null", "r", stdin);
        freopen("/tmp/obinexus_cloth.log", "a", stdout);
        freopen("/tmp/obinexus_cloth.log", "a", stderr);
        
        // Execute the program
        execvp(executable, argv);
        perror("execvp");
        exit(1);
    } else {
        // Parent process
        // Wait for first child to exit
        waitpid(pid, NULL, 0);
        printf("[OBINexus] Detached process launched successfully\n");
        return 0;
    }
}

// Transfer PID ownership to child process
void transfer_pid_to_child(pid_t parent, pid_t child) {
    printf("[OBINexus] Transferring PID ownership from %d to %d\n", parent, child);
    
    // Update process list
    pthread_mutex_lock(&g_process_list->mutex);
    
    ProcessNode* current = g_process_list->head;
    while (current != NULL) {
        if (current->pid == parent) {
            current->pid = child;
            printf("[OBINexus] PID transfer complete\n");
            break;
        }
        current = current->next;
    }
    
    pthread_mutex_unlock(&g_process_list->mutex);
}

int main(int argc, char* argv[]) {
    int detach_mode = 0;
    int fork_mode = 0;
    int thread_mode = 0;
    
    // Parse command line arguments
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--detach") == 0) {
            detach_mode = 1;
        } else if (strncmp(argv[i], "--fork-mode=", 12) == 0) {
            if (strcmp(argv[i] + 12, "thread") == 0) {
                thread_mode = 1;
            } else if (strcmp(argv[i] + 12, "process") == 0) {
                fork_mode = 1;
            }
        }
    }
    
    // Initialize process list
    init_process_list();
    
    // Set up signal handlers
    signal(SIGCHLD, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGINT, signal_handler);
    
    printf("[OBINexus] Quantum Cloth Simulation Launcher\n");
    printf("[OBINexus] Detach: %s, Mode: %s\n", 
           detach_mode ? "YES" : "NO",
           thread_mode ? "THREAD" : (fork_mode ? "PROCESS" : "NORMAL"));
    
    if (detach_mode) {
        if (thread_mode) {
            // Create detached thread
            pthread_t cloth_thread;
            pthread_attr_t attr;
            
            pthread_attr_init(&attr);
            pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);
            
            if (pthread_create(&cloth_thread, &attr, detached_cloth_thread, argv) != 0) {
                perror("pthread_create");
                return 1;
            }
            
            pthread_attr_destroy(&attr);
            
            // Keep main thread alive
            printf("[OBINexus] Main thread continuing...\n");
            
            // Simulate other work or wait
            while (g_process_list->active_count > 0) {
                sleep(1);
            }
        } else if (fork_mode) {
            // Fork and detach
            char* exec_argv[] = {"obinexus_cloth", "--no-detach", NULL};
            launch_detached_process("./build/bin/obinexus_cloth", exec_argv);
        }
    } else {
        // Run normally
        add_process(getpid(), pthread_self(), "obinexus_cloth", 0);
        run_cloth_simulation(argc, argv);
        remove_process(getpid());
    }
    
    // Cleanup
    pthread_mutex_destroy(&g_process_list->mutex);
    free(g_process_list);
    
    return 0;
}
