// disk_import.c - Implement the disk metaphor
#include "rift_runtime.h"

typedef struct {
    char namespace[256];
    void* context;
    time_t last_import;
} disk_import_t;

void* import_from_disk(const char* path) {
    // Restore context, not just load data
    disk_import_t* import = restore_context(path);
    
    // Thread-safe, single-pass loading
    return import->context;
}
