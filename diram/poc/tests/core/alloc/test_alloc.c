

#include "alloc.h"
#include <stdio.h>
#include <assert.h>
#include <unistd.h>

void test_basic_allocation() {
    printf("Testing basic allocation...\n");
    
    diram_init_trace_log();
    
    // Test successful allocation
    diram_allocation_t* alloc1 = diram_alloc_traced(1024, "test_buffer_1");
    assert(alloc1 != NULL);
    assert(alloc1->size == 1024);
    assert(alloc1->binding_pid == getpid());
    printf("  V Allocation successful: %p (SHA: %.16s...)\n", 
           alloc1->base_addr, alloc1->sha256_receipt);
    
    // Test constraint enforcement (max 3 allocations)
    diram_allocation_t* alloc2 = diram_alloc_traced(2048, "test_buffer_2");
    diram_allocation_t* alloc3 = diram_alloc_traced(512, "test_buffer_3");
    assert(alloc2 != NULL && alloc3 != NULL);
    
    // Fourth allocation should fail due to constraint
    diram_allocation_t* alloc4 = diram_alloc_traced(256, "test_buffer_4");
    assert(alloc4 == NULL);
    printf("  V Heap constraint enforced (max 3 events)\n");
    
    // Free allocations
    diram_free_traced(alloc1);
    diram_free_traced(alloc2);
    diram_free_traced(alloc3);
    
    diram_close_trace_log();
    printf("  V All tests passed\n");
}

void test_fork_safety() {
    printf("Testing fork safety...\n");
    
    diram_init_trace_log();
    
    diram_allocation_t* parent_alloc = diram_alloc_traced(4096, "parent_buffer");
    assert(parent_alloc != NULL);
    
    pid_t pid = fork();
    if (pid == 0) {
        // Child process
        // Parent's allocation should not be freed
        diram_free_traced(parent_alloc);  // Should be no-op due to PID check
        
        // Child can make its own allocations
        diram_allocation_t* child_alloc = diram_alloc_traced(1024, "child_buffer");
        assert(child_alloc != NULL);
        assert(child_alloc->binding_pid == getpid());
        
        diram_free_traced(child_alloc);
        _exit(0);
    } else {
        // Parent process
        wait(NULL);
        
        // Parent can still free its allocation
        diram_free_traced(parent_alloc);
        printf("  V Fork safety verified\n");
    }
    
    diram_close_trace_log();
}

int main() {
    printf("DIRAM Feature-Alloc Test Suite\n");
    printf("==============================\n\n");
    
    test_basic_allocation();
    test_fork_safety();
    
    printf("\nAll tests completed successfully.\n");
    return 0;
}

