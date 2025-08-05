// smod_loader.c
#include "diram/assembly/smod_loader.h"
#include "diram/core/config.h"
#include <dlfcn.h>

typedef struct smod_registry {
    smod_entry_t modules[MAX_LOADED_MODULES];
    uint32_t count;
    pthread_mutex_t lock;
    char manifest_path[PATH_MAX];
} smod_registry_t;

int smod_import(const char* module_path, diram_context_t* ctx) {
    // Phase 1: Validate .s file exists
    if (access(module_path, R_OK) != 0) {
        return SMOD_ERR_NOT_FOUND;
    }
    
    // Phase 2: Compile to object file
    char obj_path[PATH_MAX];
    if (compile_smodule(module_path, obj_path, ctx) != 0) {
        return SMOD_ERR_COMPILE_FAILED;
    }
    
    // Phase 3: Link to shared object
    char so_path[PATH_MAX];
    if (link_smodule(obj_path, so_path, ctx) != 0) {
        return SMOD_ERR_LINK_FAILED;
    }
    
    // Phase 4: Dynamic load and register
    void* handle = dlopen(so_path, RTLD_NOW | RTLD_LOCAL);
    if (!handle) {
        return SMOD_ERR_LOAD_FAILED;
    }
    
    // Phase 5: Extract opcode metadata
    smod_metadata_t* meta = dlsym(handle, "smod_metadata");
    if (!meta) {
        dlclose(handle);
        return SMOD_ERR_NO_METADATA;
    }
    
    // Phase 6: Register opcodes with safety levels
    return register_opcodes(meta, handle, ctx);
}