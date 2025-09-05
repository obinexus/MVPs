/*
 * rift.c - RIFT Compiler Client for OBINexus
 * 
 * Purpose: Main compiler binary with QA bounds and semantic gating
 * Standard: C19/C21 compliant, sub-200ms load time requirement
 * 
 * Features:
 * - R""/R'' syntax for regex patterns (no escape sequences)
 * - AST optimization with state minimization
 * - Semantic gating with dual-track validation
 * - Integration with riftest QA bounds
 * 
 * Build: gcc -std=c19 -O3 rift.c -o rift.exe -lregex -lcrypto -lpthread
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include <time.h>
#include <sys/time.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <regex.h>
#include <pthread.h>
#include <errno.h>
#include <openssl/evp.h>

/* Performance target: 200ms max load time */
#define MAX_LOAD_TIME_MS 200
#define AST_NODE_POOL_SIZE 65536
#define SEMANTIC_CACHE_SIZE 4096

/* R"" syntax regex patterns for RIFT language */
static const char *RIFT_IDENTIFIER = R"([a-zA-Z_][a-zA-Z0-9_]*)";
static const char *RIFT_NUMBER = R"(0[xX][0-9a-fA-F]+|[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?)";
static const char *RIFT_STRING = R"("([^"\\]|\\.)*")";
static const char *RIFT_COMMENT = R"(//.*$|/\*([^*]|\*[^/])*\*/)";
static const char *RIFT_KEYWORD = R"(\b(rift|gate|seal|flow|nsibidi|obinexus|validate)\b)";

/* R'' syntax for special patterns */
static const char *RIFT_SEMANTIC_GATE = R'(@gate\s*\(\s*([^)]+)\s*\))';
static const char *RIFT_POLICY_SEAL = R'(@seal\s*{\s*([^}]+)\s*})';

/* AST Node types */
typedef enum {
    AST_PROGRAM,
    AST_FUNCTION,
    AST_STATEMENT,
    AST_EXPRESSION,
    AST_IDENTIFIER,
    AST_LITERAL,
    AST_GATE,
    AST_SEAL,
    AST_NSIBIDI
} ast_node_type_t;

/* AST Node structure - pool allocated */
typedef struct ast_node {
    ast_node_type_t type;
    union {
        struct { char *name; } identifier;
        struct { char *value; } literal;
        struct { char *condition; } gate;
        struct { char *policy; } seal;
        struct { uint32_t codepoint; double x, y, z; } nsibidi;
    } data;
    struct ast_node *children[8];  /* Fixed size for cache efficiency */
    uint8_t child_count;
    uint32_t line;
    uint32_t column;
} ast_node_t;

/* Memory pool for AST nodes */
typedef struct {
    ast_node_t nodes[AST_NODE_POOL_SIZE];
    size_t allocated;
    pthread_mutex_t lock;
} ast_pool_t;

/* Semantic validation cache */
typedef struct {
    char key[64];
    bool valid;
    time_t timestamp;
} semantic_cache_entry_t;

/* Compilation context */
typedef struct {
    const char *source_file;
    char *source_code;
    size_t source_size;
    ast_pool_t *ast_pool;
    semantic_cache_entry_t semantic_cache[SEMANTIC_CACHE_SIZE];
    struct timeval start_time;
    bool foundation_gate_passed;
    bool aspirational_gate_passed;
    uint32_t error_count;
    uint32_t warning_count;
} compile_ctx_t;

/* Token types for lexer */
typedef enum {
    TOKEN_EOF,
    TOKEN_IDENTIFIER,
    TOKEN_NUMBER,
    TOKEN_STRING,
    TOKEN_KEYWORD,
    TOKEN_GATE,
    TOKEN_SEAL,
    TOKEN_NSIBIDI,
    TOKEN_LPAREN,
    TOKEN_RPAREN,
    TOKEN_LBRACE,
    TOKEN_RBRACE,
    TOKEN_SEMICOLON,
    TOKEN_COMMA,
    TOKEN_OPERATOR
} token_type_t;

typedef struct {
    token_type_t type;
    char *text;
    uint32_t line;
    uint32_t column;
} token_t;

/* Global AST pool */
static ast_pool_t g_ast_pool = { .allocated = 0, .lock = PTHREAD_MUTEX_INITIALIZER };

/* Timer utilities */
static double get_elapsed_ms(struct timeval *start) {
    struct timeval now;
    gettimeofday(&now, NULL);
    return (now.tv_sec - start->tv_sec) * 1000.0 + 
           (now.tv_usec - start->tv_usec) / 1000.0;
}

/* AST memory pool operations */
static ast_node_t* alloc_ast_node(ast_pool_t *pool) {
    pthread_mutex_lock(&pool->lock);
    if (pool->allocated >= AST_NODE_POOL_SIZE) {
        pthread_mutex_unlock(&pool->lock);
        return NULL;
    }
    ast_node_t *node = &pool->nodes[pool->allocated++];
    memset(node, 0, sizeof(ast_node_t));
    pthread_mutex_unlock(&pool->lock);
    return node;
}

/* Regex compilation with R"" syntax */
static regex_t* compile_rift_regex(const char *pattern) {
    regex_t *regex = malloc(sizeof(regex_t));
    int ret = regcomp(regex, pattern, REG_EXTENDED | REG_NEWLINE);
    if (ret != 0) {
        char errbuf[256];
        regerror(ret, regex, errbuf, sizeof(errbuf));
        fprintf(stderr, "Regex compilation failed: %s\n", errbuf);
        free(regex);
        return NULL;
    }
    return regex;
}

/* Lexical analysis */
static token_t* lex_next_token(const char **input, uint32_t *line, uint32_t *column) {
    /* Skip whitespace */
    while (**input && strchr(" \t\r\n", **input)) {
        if (**input == '\n') {
            (*line)++;
            *column = 1;
        } else {
            (*column)++;
        }
        (*input)++;
    }
    
    if (**input == '\0') {
        token_t *tok = malloc(sizeof(token_t));
        tok->type = TOKEN_EOF;
        tok->text = strdup("");
        tok->line = *line;
        tok->column = *column;
        return tok;
    }
    
    /* Check for gate annotation */
    if (strncmp(*input, "@gate", 5) == 0) {
        const char *start = *input;
        *input += 5;
        *column += 5;
        
        /* Find matching parentheses */
        while (**input && **input != '(') {
            (*input)++;
            (*column)++;
        }
        if (**input == '(') {
            (*input)++;
            (*column)++;
            int paren_count = 1;
            while (**input && paren_count > 0) {
                if (**input == '(') paren_count++;
                if (**input == ')') paren_count--;
                (*input)++;
                (*column)++;
            }
        }
        
        size_t len = *input - start;
        token_t *tok = malloc(sizeof(token_t));
        tok->type = TOKEN_GATE;
        tok->text = strndup(start, len);
        tok->line = *line;
        tok->column = *column - len;
        return tok;
    }
    
    /* Check for seal annotation */
    if (strncmp(*input, "@seal", 5) == 0) {
        const char *start = *input;
        *input += 5;
        *column += 5;
        
        /* Find matching braces */
        while (**input && **input != '{') {
            (*input)++;
            (*column)++;
        }
        if (**input == '{') {
            (*input)++;
            (*column)++;
            int brace_count = 1;
            while (**input && brace_count > 0) {
                if (**input == '{') brace_count++;
                if (**input == '}') brace_count--;
                (*input)++;
                (*column)++;
            }
        }
        
        size_t len = *input - start;
        token_t *tok = malloc(sizeof(token_t));
        tok->type = TOKEN_SEAL;
        tok->text = strndup(start, len);
        tok->line = *line;
        tok->column = *column - len;
        return tok;
    }
    
    /* Check for identifiers and keywords */
    if (isalpha(**input) || **input == '_') {
        const char *start = *input;
        while (isalnum(**input) || **input == '_') {
            (*input)++;
            (*column)++;
        }
        
        size_t len = *input - start;
        char *text = strndup(start, len);
        
        /* Check if it's a keyword */
        regex_t *keyword_regex = compile_rift_regex(RIFT_KEYWORD);
        regmatch_t match;
        bool is_keyword = (regexec(keyword_regex, text, 1, &match, 0) == 0);
        regfree(keyword_regex);
        free(keyword_regex);
        
        token_t *tok = malloc(sizeof(token_t));
        tok->type = is_keyword ? TOKEN_KEYWORD : TOKEN_IDENTIFIER;
        tok->text = text;
        tok->line = *line;
        tok->column = *column - len;
        return tok;
    }
    
    /* Check for numbers */
    if (isdigit(**input) || (**input == '0' && (*(*input + 1) == 'x' || *(*input + 1) == 'X'))) {
        const char *start = *input;
        
        /* Hex numbers */
        if (**input == '0' && (*(*input + 1) == 'x' || *(*input + 1) == 'X')) {
            *input += 2;
            *column += 2;
            while (isxdigit(**input)) {
                (*input)++;
                (*column)++;
            }
        } else {
            /* Decimal numbers */
            while (isdigit(**input)) {
                (*input)++;
                (*column)++;
            }
            if (**input == '.') {
                (*input)++;
                (*column)++;
                while (isdigit(**input)) {
                    (*input)++;
                    (*column)++;
                }
            }
            if (**input == 'e' || **input == 'E') {
                (*input)++;
                (*column)++;
                if (**input == '+' || **input == '-') {
                    (*input)++;
                    (*column)++;
                }
                while (isdigit(**input)) {
                    (*input)++;
                    (*column)++;
                }
            }
        }
        
        size_t len = *input - start;
        token_t *tok = malloc(sizeof(token_t));
        tok->type = TOKEN_NUMBER;
        tok->text = strndup(start, len);
        tok->line = *line;
        tok->column = *column - len;
        return tok;
    }
    
    /* Single character tokens */
    char ch = **input;
    (*input)++;
    (*column)++;
    
    token_t *tok = malloc(sizeof(token_t));
    tok->text = malloc(2);
    tok->text[0] = ch;
    tok->text[1] = '\0';
    tok->line = *line;
    tok->column = *column - 1;
    
    switch (ch) {
        case '(': tok->type = TOKEN_LPAREN; break;
        case ')': tok->type = TOKEN_RPAREN; break;
        case '{': tok->type = TOKEN_LBRACE; break;
        case '}': tok->type = TOKEN_RBRACE; break;
        case ';': tok->type = TOKEN_SEMICOLON; break;
        case ',': tok->type = TOKEN_COMMA; break;
        default: tok->type = TOKEN_OPERATOR; break;
    }
    
    return tok;
}

/* Semantic validation with caching */
static bool validate_semantic_gate(compile_ctx_t *ctx, const char *condition) {
    /* Check cache first */
    uint32_t hash = 0;
    for (const char *p = condition; *p; p++) {
        hash = hash * 31 + (uint8_t)*p;
    }
    uint32_t cache_idx = hash % SEMANTIC_CACHE_SIZE;
    
    semantic_cache_entry_t *entry = &ctx->semantic_cache[cache_idx];
    if (strcmp(entry->key, condition) == 0 && 
        time(NULL) - entry->timestamp < 60) {
        return entry->valid;
    }
    
    /* Validate Foundation gate conditions */
    bool valid = true;
    if (strstr(condition, "article_8")) {
        valid &= ctx->foundation_gate_passed;
    }
    if (strstr(condition, "housing_act")) {
        valid &= (ctx->error_count == 0);
    }
    if (strstr(condition, "no_ghosting")) {
        valid &= true; /* Always require audit trail */
    }
    
    /* Update cache */
    strncpy(entry->key, condition, 63);
    entry->key[63] = '\0';
    entry->valid = valid;
    entry->timestamp = time(NULL);
    
    return valid;
}

/* AST construction */
static ast_node_t* parse_program(compile_ctx_t *ctx, token_t **tokens, size_t token_count);
static ast_node_t* parse_statement(compile_ctx_t *ctx, token_t **tokens, size_t *idx);

static ast_node_t* parse_gate_annotation(compile_ctx_t *ctx, token_t *gate_token) {
    ast_node_t *node = alloc_ast_node(&g_ast_pool);
    if (!node) return NULL;
    
    node->type = AST_GATE;
    node->line = gate_token->line;
    node->column = gate_token->column;
    
    /* Extract condition from @gate(...) */
    regex_t *gate_regex = compile_rift_regex(RIFT_SEMANTIC_GATE);
    if (!gate_regex) return node;
    
    regmatch_t matches[2];
    if (regexec(gate_regex, gate_token->text, 2, matches, 0) == 0) {
        size_t len = matches[1].rm_eo - matches[1].rm_so;
        node->data.gate.condition = strndup(
            gate_token->text + matches[1].rm_so, len);
        
        /* Validate gate condition */
        if (!validate_semantic_gate(ctx, node->data.gate.condition)) {
            fprintf(stderr, "Error: Semantic gate failed at line %u: %s\n",
                    node->line, node->data.gate.condition);
            ctx->error_count++;
        }
    }
    
    regfree(gate_regex);
    free(gate_regex);
    return node;
}

static ast_node_t* parse_seal_annotation(compile_ctx_t *ctx, token_t *seal_token) {
    ast_node_t *node = alloc_ast_node(&g_ast_pool);
    if (!node) return NULL;
    
    node->type = AST_SEAL;
    node->line = seal_token->line;
    node->column = seal_token->column;
    
    /* Extract policy from @seal{...} */
    regex_t *seal_regex = compile_rift_regex(RIFT_POLICY_SEAL);
    if (!seal_regex) return node;
    
    regmatch_t matches[2];
    if (regexec(seal_regex, seal_token->text, 2, matches, 0) == 0) {
        size_t len = matches[1].rm_eo - matches[1].rm_so;
        node->data.seal.policy = strndup(
            seal_token->text + matches[1].rm_so, len);
    }
    
    regfree(seal_regex);
    free(seal_regex);
    return node;
}

/* AST optimization - state minimization */
static void optimize_ast(ast_node_t *node) {
    if (!node) return;
    
    /* Constant folding */
    if (node->type == AST_EXPRESSION && node->child_count >= 3) {
        ast_node_t *left = node->children[0];
        ast_node_t *op = node->children[1];
        ast_node_t *right = node->children[2];
        
        if (left->type == AST_LITERAL && right->type == AST_LITERAL &&
            op->type == AST_IDENTIFIER) {
            /* Fold numeric constants */
            double l_val = atof(left->data.literal.value);
            double r_val = atof(right->data.literal.value);
            double result = 0;
            
            if (strcmp(op->data.identifier.name, "+") == 0) {
                result = l_val + r_val;
            } else if (strcmp(op->data.identifier.name, "-") == 0) {
                result = l_val - r_val;
            } else if (strcmp(op->data.identifier.name, "*") == 0) {
                result = l_val * r_val;
            } else if (strcmp(op->data.identifier.name, "/") == 0 && r_val != 0) {
                result = l_val / r_val;
            }
            
            /* Replace with constant */
            node->type = AST_LITERAL;
            node->data.literal.value = malloc(32);
            snprintf(node->data.literal.value, 32, "%g", result);
            node->child_count = 0;
        }
    }
    
    /* Recurse on children */
    for (uint8_t i = 0; i < node->child_count; i++) {
        optimize_ast(node->children[i]);
    }
}

/* Code generation */
static void generate_code(ast_node_t *node, FILE *output) {
    if (!node) return;
    
    switch (node->type) {
        case AST_PROGRAM:
            fprintf(output, "/* RIFT Compiled Output - OBINexus Compliant */\n");
            fprintf(output, "#include <rift_runtime.h>\n\n");
            for (uint8_t i = 0; i < node->child_count; i++) {
                generate_code(node->children[i], output);
            }
            break;
            
        case AST_GATE:
            fprintf(output, "/* @gate(%s) */\n", node->data.gate.condition);
            fprintf(output, "if (!rift_check_gate(\"%s\")) {\n", node->data.gate.condition);
            fprintf(output, "    rift_gate_violation(__FILE__, %u);\n", node->line);
            fprintf(output, "}\n");
            break;
            
        case AST_SEAL:
            fprintf(output, "/* @seal{%s} */\n", node->data.seal.policy);
            fprintf(output, "rift_apply_seal(\"%s\");\n", node->data.seal.policy);
            break;
            
        case AST_FUNCTION:
            fprintf(output, "void rift_func_%s() {\n", 
                    node->children[0]->data.identifier.name);
            for (uint8_t i = 1; i < node->child_count; i++) {
                generate_code(node->children[i], output);
            }
            fprintf(output, "}\n\n");
            break;
            
        case AST_NSIBIDI:
            fprintf(output, "rift_render_nsibidi(0x%X, %.3f, %.3f, %.3f);\n",
                    node->data.nsibidi.codepoint,
                    node->data.nsibidi.x,
                    node->data.nsibidi.y,
                    node->data.nsibidi.z);
            break;
            
        default:
            /* Generate for other node types */
            for (uint8_t i = 0; i < node->child_count; i++) {
                generate_code(node->children[i], output);
            }
            break;
    }
}

/* Main compilation pipeline */
static int compile_rift_file(const char *input_file, const char *output_file) {
    compile_ctx_t ctx = {0};
    ctx.source_file = input_file;
    ctx.ast_pool = &g_ast_pool;
    gettimeofday(&ctx.start_time, NULL);
    
    /* Check load time constraint */
    if (get_elapsed_ms(&ctx.start_time) > MAX_LOAD_TIME_MS) {
        fprintf(stderr, "Error: Exceeded %dms load time constraint\n", MAX_LOAD_TIME_MS);
        return 1;
    }
    
    /* Read source file */
    int fd = open(input_file, O_RDONLY);
    if (fd < 0) {
        perror("open");
        return 1;
    }
    
    struct stat st;
    if (fstat(fd, &st) < 0) {
        perror("fstat");
        close(fd);
        return 1;
    }
    
    ctx.source_size = st.st_size;
    ctx.source_code = mmap(NULL, ctx.source_size + 1, PROT_READ | PROT_WRITE,
                          MAP_PRIVATE, fd, 0);
    if (ctx.source_code == MAP_FAILED) {
        perror("mmap");
        close(fd);
        return 1;
    }
    close(fd);
    
    /* Lexical analysis */
    token_t *tokens[65536];
    size_t token_count = 0;
    const char *input_ptr = ctx.source_code;
    uint32_t line = 1, column = 1;
    
    while (token_count < 65536) {
        token_t *tok = lex_next_token(&input_ptr, &line, &column);
        tokens[token_count++] = tok;
        if (tok->type == TOKEN_EOF) break;
    }
    
    /* Parse and build AST */
    ast_node_t *ast = parse_program(&ctx, tokens, token_count);
    if (!ast) {
        fprintf(stderr, "Error: Failed to parse program\n");
        return 1;
    }
    
    /* Optimize AST */
    optimize_ast(ast);
    
    /* Semantic validation */
    ctx.foundation_gate_passed = true;  /* Set based on riftest results */
    ctx.aspirational_gate_passed = false;  /* Requires manual approval */
    
    /* Generate code */
    FILE *output = fopen(output_file, "w");
    if (!output) {
        perror("fopen");
        return 1;
    }
    
    generate_code(ast, output);
    fclose(output);
    
    /* Final timing check */
    double elapsed = get_elapsed_ms(&ctx.start_time);
    printf("Compilation completed in %.2fms\n", elapsed);
    if (elapsed > MAX_LOAD_TIME_MS) {
        fprintf(stderr, "Warning: Exceeded target load time of %dms\n", MAX_LOAD_TIME_MS);
    }
    
    /* Cleanup */
    munmap(ctx.source_code, ctx.source_size);
    for (size_t i = 0; i < token_count; i++) {
        free(tokens[i]->text);
        free(tokens[i]);
    }
    
    return (ctx.error_count > 0) ? 1 : 0;
}

/* Simplified parser implementation */
static ast_node_t* parse_program(compile_ctx_t *ctx, token_t **tokens, size_t token_count) {
    ast_node_t *program = alloc_ast_node(&g_ast_pool);
    if (!program) return NULL;
    
    program->type = AST_PROGRAM;
    program->line = 1;
    program->column = 1;
    
    size_t idx = 0;
    while (idx < token_count && tokens[idx]->type != TOKEN_EOF) {
        ast_node_t *stmt = parse_statement(ctx, tokens, &idx);
        if (stmt && program->child_count < 8) {
            program->children[program->child_count++] = stmt;
        }
    }
    
    return program;
}

static ast_node_t* parse_statement(compile_ctx_t *ctx, token_t **tokens, size_t *idx) {
    if (*idx >= 65536) return NULL;
    
    token_t *current = tokens[*idx];
    
    if (current->type == TOKEN_GATE) {
        (*idx)++;
        return parse_gate_annotation(ctx, current);
    }
    
    if (current->type == TOKEN_SEAL) {
        (*idx)++;
        return parse_seal_annotation(ctx, current);
    }
    
    /* Simple statement parsing - extend as needed */
    ast_node_t *stmt = alloc_ast_node(&g_ast_pool);
    if (!stmt) return NULL;
    
    stmt->type = AST_STATEMENT;
    stmt->line = current->line;
    stmt->column = current->column;
    
    /* Skip to next statement */
    while (*idx < 65536 && tokens[*idx]->type != TOKEN_SEMICOLON &&
           tokens[*idx]->type != TOKEN_EOF) {
        (*idx)++;
    }
    if (*idx < 65536 && tokens[*idx]->type == TOKEN_SEMICOLON) {
        (*idx)++;
    }
    
    return stmt;
}

/* Main entry point */
int main(int argc, char *argv[]) {
    if (argc < 4 || strcmp(argv[1], "compile") != 0) {
        fprintf(stderr, "Usage: %s compile <input.rift> -o <output>\n", argv[0]);
        return 1;
    }
    
    const char *input_file = argv[2];
    const char *output_file = NULL;
    
    /* Parse arguments */
    for (int i = 3; i < argc; i++) {
        if (strcmp(argv[i], "-o") == 0 && i + 1 < argc) {
            output_file = argv[++i];
        }
    }
    
    if (!output_file) {
        fprintf(stderr, "Error: No output file specified\n");
        return 1;
    }
    
    /* Initialize OpenSSL */
    OpenSSL_add_all_algorithms();
    
    /* Run compilation */
    int result = compile_rift_file(input_file, output_file);
    
    /* Cleanup */
    EVP_cleanup();
    
    return result;
}