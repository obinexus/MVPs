/*
 * rift_pool.c — Thread pool with O(1) aux space, pinned threads
 * Space: log(n) per thread + O(1) auxiliary
 * Time: log(n) = O(1) for bounded operations
 * Error zones: 0-3 OK, 4-6 WARN, 7-9 CRIT, 10-12 PANIC
 */

#define _GNU_SOURCE
#include <pthread.h>
#include <sched.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define POOL_SIZE 4
#define QUEUE_MASK (1024 - 1)  /* power of 2 for O(1) modulo */

typedef struct {
    void (*fn)(void*);
    void *arg;
    int error_level;
    uint64_t deadline;
} task_t;

typedef struct {
    task_t tasks[1024];        /* fixed size = O(1) aux */
    _Atomic uint32_t head;
    _Atomic uint32_t tail;
    pthread_t threads[POOL_SIZE];
    _Atomic int running;
    cpu_set_t cpusets[POOL_SIZE];
} pool_t;

static pool_t pool = {0};

/* Pin thread to core for predictable space/time */
static void pin_thread(int tid) {
    CPU_ZERO(&pool.cpusets[tid]);
    CPU_SET(tid % sysconf(_SC_NPROCESSORS_ONLN), &pool.cpusets[tid]);
    pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &pool.cpusets[tid]);
}

/* Worker with O(1) stack space */
static void* worker(void *arg) {
    int tid = (int)(intptr_t)arg;
    pin_thread(tid);
    
    while (atomic_load(&pool.running)) {
        uint32_t head = atomic_load(&pool.head);
        uint32_t tail = atomic_load(&pool.tail);
        
        if (head == tail) {
            nanosleep(&(struct timespec){.tv_nsec = 1e6}, NULL); /* 1ms */
            continue;
        }
        
        /* O(1) dequeue */
        task_t task = pool.tasks[head & QUEUE_MASK];
        atomic_store(&pool.head, head + 1);
        
        /* Execute with error boundary */
        if (task.error_level < 10) {  /* not PANIC */
            task.fn(task.arg);
        } else {
            printf("[TID:%d] PANIC zone task dropped\n", tid);
        }
    }
    return NULL;
}

/* Submit with O(1) time */
int rift_submit(void (*fn)(void*), void *arg, int error_level) {
    uint32_t tail = atomic_load(&pool.tail);
    uint32_t head = atomic_load(&pool.head);
    
    if ((tail - head) >= 1024) return -1;  /* full */
    
    pool.tasks[tail & QUEUE_MASK] = (task_t){
        .fn = fn,
        .arg = arg,
        .error_level = error_level,
        .deadline = time(NULL) + 1
    };
    
    atomic_store(&pool.tail, tail + 1);
    return 0;
}

/* Demo task showing error zones */
static void demo_task(void *arg) {
    int level = (int)(intptr_t)arg;
    const char *zone = level < 4 ? "OK" : 
                      level < 7 ? "WARN" :
                      level < 10 ? "CRIT" : "PANIC";
    printf("[%.3fs] Task executed - Error level %d (%s)\n", 
           (double)clock()/CLOCKS_PER_SEC, level, zone);
}

int main(void) {
    /* Initialize pool */
    atomic_store(&pool.running, 1);
    
    /* Create pinned workers */
    for (int i = 0; i < POOL_SIZE; i++) {
        pthread_create(&pool.threads[i], NULL, worker, (void*)(intptr_t)i);
    }
    
    /* Submit tasks across error zones */
    for (int i = 0; i < 100; i++) {
        int error_level = rand() % 13;  /* 0-12 */
        rift_submit(demo_task, (void*)(intptr_t)error_level, error_level);
        nanosleep(&(struct timespec){.tv_nsec = 5e7}, NULL); /* 50ms */
    }
    
    /* Graceful shutdown */
    atomic_store(&pool.running, 0);
    for (int i = 0; i < POOL_SIZE; i++) {
        pthread_join(pool.threads[i], NULL);
    }
    
    printf("\nDetached gracefully — threads unpinned.\n");
    return 0;
}
