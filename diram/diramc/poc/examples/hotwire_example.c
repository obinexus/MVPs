// examples/hotwire_example.c
// DIRAM Hotwire Integration Example
// Demonstrates XML configuration compilation and AST transformation

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "diram/core/parser/tokenizer.h"
#include "diram/core/parser/parser.h"
#include "diram/core/parser/ast.h"
#include "diram/core/hotwire/hotwire.h"

// Example: Load XML configuration and generate platform-specific output
int main(int argc, char* argv[]) {
    const char* xml_file = "diram.drc.in.xml";
    const char* output_file = NULL;
    diram_hotwire_target_t target = HOTWIRE_TARGET_NATIVE_ASM;
    
    // Parse command line arguments
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--xml") == 0 && i + 1 < argc) {
            xml_file = argv[++i];
        } else if (strcmp(argv[i], "--output") == 0 && i + 1 < argc) {
            output_file = argv[++i];
        } else if (strcmp(argv[i], "--target") == 0 && i + 1 < argc) {
            const char* target_str = argv[++i];
            if (strcmp(target_str, "asm") == 0) {
                target = HOTWIRE_TARGET_NATIVE_ASM;
            } else if (strcmp(target_str, "wasm") == 0) {
                target = HOTWIRE_TARGET_WASM;
            }
        }
    }
    
    printf("DIRAM Hotwire Example\n");
    printf("=====================\n");
    printf("XML Config: %s\n", xml_file);
    printf("Target: %s\n", diram_hotwire_target_to_string(target));
    printf("\n");
    
    // Step 1: Read XML configuration file
    FILE* fp = fopen(xml_file, "r");
    if (!fp) {
        fprintf(stderr, "Error: Cannot open XML file: %s\n", xml_file);
        return 1;
    }
    
    fseek(fp, 0, SEEK_END);
    size_t file_size = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    
    char* xml_content = malloc(file_size + 1);
    fread(xml_content, 1, file_size, fp);
    xml_content[file_size] = '\0';
    fclose(fp);
    
    // Step 2: Create parser and parse XML
    printf("Parsing XML configuration...\n");
    diram_parser_t* parser = diram_parser_create(xml_content, file_size);
    if (!parser) {
        fprintf(stderr, "Error: Failed to create parser\n");
        free(xml_content);
        return 1;
    }
    
    // Set policy violation handler
    diram_parser_set_policy_handler(parser, [](const char* violation) {
        fprintf(stderr, "POLICY VIOLATION: %s\n", violation);
        exit(1);
    });
    
    // Parse XML to AST
    diram_ast_node_t* ast_root = diram_parser_parse(parser);
    if (!ast_root) {
        fprintf(stderr, "Error: Failed to parse XML: %s\n", 
                diram_parser_get_error(parser));
        diram_parser_destroy(parser);
        free(xml_content);
        return 1;
    }
    
    printf("AST generated successfully\n");
    printf("Total nodes: %zu\n", diram_ast_count_nodes(ast_root));
    
    // Step 3: Create hotwire context for target platform
    printf("\nCreating hotwire transformer for %s target...\n",
           diram_hotwire_target_to_string(target));
           
    diram_hotwire_context_t* hotwire = diram_hotwire_create(target);
    if (!hotwire) {
        fprintf(stderr, "Error: Failed to create hotwire context\n");
        diram_ast_destroy_node(ast_root);
        diram_parser_destroy(parser);
        free(xml_content);
        return 1;
    }
    
    // Configure target-specific settings
    if (target == HOTWIRE_TARGET_NATIVE_ASM) {
        hotwire->config.asm_config.arch = "x86_64";
        hotwire->config.asm_config.use_intel_syntax = true;
        hotwire->config.asm_config.optimize_size = false;
    } else if (target == HOTWIRE_TARGET_WASM) {
        hotwire->config.wasm_config.use_simd = false;
        hotwire->config.wasm_config.enable_threads = false;
        hotwire->config.wasm_config.memory_pages = 256; // 16MB
    }
    
    // Step 4: Transform AST to target output
    printf("Transforming AST to %s...\n", 
           diram_hotwire_target_to_string(target));
           
    if (!diram_hotwire_transform(hotwire, ast_root)) {
        fprintf(stderr, "Error: Transformation failed: %s\n",
                diram_hotwire_get_error(hotwire));
        diram_hotwire_destroy(hotwire);
        diram_ast_destroy_node(ast_root);
        diram_parser_destroy(parser);
        free(xml_content);
        return 1;
    }
    
    // Step 5: Get transformed output
    const char* output = diram_hotwire_get_output(hotwire);
    printf("\nTransformation complete!\n");
    printf("Output size: %zu bytes\n", strlen(output));
    
    // Step 6: Write output to file or stdout
    if (output_file) {
        if (diram_hotwire_write_output(hotwire, output_file)) {
            printf("Output written to: %s\n", output_file);
        } else {
            fprintf(stderr, "Error: Failed to write output file\n");
        }
    } else {
        printf("\n--- Output Preview (first 500 chars) ---\n");
        printf("%.500s\n", output);
        if (strlen(output) > 500) {
            printf("... (truncated)\n");
        }
    }
    
    // Step 7: Display feature toggle summary
    printf("\n--- Feature Toggle Summary ---\n");
    diram_hotwire_table_t* table = hotwire->execution_table;
    for (size_t i = 0; i < table->feature_count; i++) {
        diram_feature_state_t* feature = &table->features[i];
        printf("  %s: %s (allowed=%s, active=%s)\n",
               feature->name,
               feature->enabled ? "ON" : "OFF",
               feature->allowed ? "YES" : "NO",
               feature->activated ? "YES" : "NO");
    }
    
    // Cleanup
    diram_hotwire_destroy(hotwire);
    diram_ast_destroy_node(ast_root);
    diram_parser_destroy(parser);
    free(xml_content);
    
    printf("\nDIRAM Hotwire Example completed successfully\n");
    return 0;
}

// Example usage:
// ./hotwire_example --xml diram.drc.in.xml --target asm --output diram.s
// ./hotwire_example --xml diram.drc.in.xml --target wasm --output diram.wasm
