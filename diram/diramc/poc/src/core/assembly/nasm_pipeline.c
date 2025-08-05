// nasm_pipeline.c
int compile_smodule(const char* src_path, char* obj_path, diram_context_t* ctx) {
    // Extract NASM flags from config
    char nasm_flags[512];
    config_get_string(ctx->config, "assembly.nasm_flags", 
                      nasm_flags, sizeof(nasm_flags),
                      "-f elf64 -g -F dwarf");
    
    // Build compilation command
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "nasm %s -o %s %s", 
             nasm_flags, obj_path, src_path);
    
    // Execute with telemetry
    uint64_t start_time = get_timestamp();
    int ret = system(cmd);
    uint64_t compile_time = get_timestamp() - start_time;
    
    // Log compilation receipt
    if (ctx->telemetry_level >= 2) {
        log_compilation_receipt(src_path, obj_path, compile_time, ret);
    }
    
    return ret;
}