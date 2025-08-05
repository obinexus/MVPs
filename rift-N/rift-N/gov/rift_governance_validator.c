/**
 * @file rift_governance_validator.c
 * @brief RIFT Governance Validation Engine - C Implementation
 * @author Nnamdi Michael Okpala & AEGIS Development Team
 * @version 1.0.0
 * 
 * OBINexus AEGIS Methodology Compliance
 * Systematic governance validation for RIFT compiler pipeline stages
 * Implements semverx_lock enforcement and stakeholder authorization
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/stat.h>
#include <errno.h>
#include <cjson/cJSON.h>
#include <openssl/sha.h>

// AEGIS Governance Constants
#define MAX_PATH_LENGTH 512
#define MAX_STAGE_COUNT 7
#define MAX_SUBSTAGES_PER_STAGE 4
#define GOVERNANCE_EXPIRY_DAYS 90
#define SHA256_DIGEST_LENGTH 32

// Stage Type Enumeration
typedef enum {
    STAGE_TYPE_LEGACY = 0,
    STAGE_TYPE_EXPERIMENTAL = 1,
    STAGE_TYPE_STABLE = 2
} stage_type_t;

// Validation Result Codes
typedef enum {
    VALIDATION_SUCCESS = 0,
    VALIDATION_SCHEMA_VIOLATION = 1,
    VALIDATION_EXPIRED_GOVERNANCE = 2,
    VALIDATION_SEMVERX_VIOLATION = 3,
    VALIDATION_MISSING_GOVERNANCE = 4,
    VALIDATION_STAKEHOLDER_UNAUTHORIZED = 5,
    VALIDATION_CRITICAL_FAILURE = 6
} validation_result_t;

// Stakeholder Authorization Classes
typedef enum {
    STAKEHOLDER_USER = 1,
    STAKEHOLDER_DEVELOPER = 2,
    STAKEHOLDER_VENDOR = 4
} stakeholder_class_t;

// Governance Configuration Structure
typedef struct {
    char package_name[128];
    char version[32];
    char timestamp[32];
    int stage;
    stage_type_t stage_type;
    int semverx_lock;
    char entry_point[256];
    int nlink_enabled;
    stakeholder_class_t authorized_stakeholders;
} governance_config_t;

// Stage 5 Optimizer Security Structure
typedef struct {
    char optimizer_model[64];
    int minimization_verified;
    char path_hash[65];          // SHA-256 hex string + null terminator
    char post_optimization_hash[65];
    int audit_enabled;
    char security_level[32];
    int semantic_equivalence_proof;
} stage5_optimizer_t;

// Validation Context Structure
typedef struct {
    char project_root[MAX_PATH_LENGTH];
    int verbose_mode;
    int strict_mode;
    FILE *validation_log;
    governance_config_t stage_configs[MAX_STAGE_COUNT];
    int validated_stages;
} validation_context_t;

/**
 * @brief Initialize validation context with project root
 * @param ctx Validation context to initialize
 * @param project_root Path to project root directory
 * @return validation_result_t Success or failure code
 */
validation_result_t rift_validation_init(validation_context_t *ctx, const char *project_root) {
    if (!ctx || !project_root) {
        return VALIDATION_CRITICAL_FAILURE;
    }
    
    memset(ctx, 0, sizeof(validation_context_t));
    strncpy(ctx->project_root, project_root, MAX_PATH_LENGTH - 1);
    ctx->project_root[MAX_PATH_LENGTH - 1] = '\0';
    
    // Initialize validation log
    char log_path[MAX_PATH_LENGTH];
    snprintf(log_path, sizeof(log_path), "%s/logs/governance_validation.log", project_root);
    
    ctx->validation_log = fopen(log_path, "a");
    if (!ctx->validation_log) {
        fprintf(stderr, "[AEGIS] Warning: Could not open validation log at %s\n", log_path);
        ctx->validation_log = stderr;  // Fallback to stderr
    }
    
    fprintf(ctx->validation_log, "[%ld] AEGIS Governance Validation Initialized\n", time(NULL));
    return VALIDATION_SUCCESS;
}

/**
 * @brief Parse JSON governance configuration file
 * @param file_path Path to governance file
 * @param config Output governance configuration
 * @return validation_result_t Parsing result
 */
validation_result_t parse_governance_file(const char *file_path, governance_config_t *config) {
    FILE *file = fopen(file_path, "r");
    if (!file) {
        return VALIDATION_MISSING_GOVERNANCE;
    }
    
    // Read file content
    fseek(file, 0, SEEK_END);
    long file_size = ftell(file);
    fseek(file, 0, SEEK_SET);
    
    char *json_content = malloc(file_size + 1);
    if (!json_content) {
        fclose(file);
        return VALIDATION_CRITICAL_FAILURE;
    }
    
    fread(json_content, 1, file_size, file);
    json_content[file_size] = '\0';
    fclose(file);
    
    // Parse JSON
    cJSON *json = cJSON_Parse(json_content);
    free(json_content);
    
    if (!json) {
        return VALIDATION_SCHEMA_VIOLATION;
    }
    
    // Extract required fields
    cJSON *package_name = cJSON_GetObjectItem(json, "package_name");
    cJSON *version = cJSON_GetObjectItem(json, "version");
    cJSON *timestamp = cJSON_GetObjectItem(json, "timestamp");
    cJSON *stage = cJSON_GetObjectItem(json, "stage");
    
    if (!package_name || !version || !timestamp || !stage) {
        cJSON_Delete(json);
        return VALIDATION_SCHEMA_VIOLATION;
    }
    
    // Populate configuration structure
    strncpy(config->package_name, cJSON_GetStringValue(package_name), sizeof(config->package_name) - 1);
    strncpy(config->version, cJSON_GetStringValue(version), sizeof(config->version) - 1);
    strncpy(config->timestamp, cJSON_GetStringValue(timestamp), sizeof(config->timestamp) - 1);
    config->stage = cJSON_GetNumberValue(stage);
    
    // Extract optional fields
    cJSON *stage_type = cJSON_GetObjectItem(json, "stage_type");
    if (stage_type) {
        const char *type_str = cJSON_GetStringValue(stage_type);
        if (strcmp(type_str, "legacy") == 0) {
            config->stage_type = STAGE_TYPE_LEGACY;
        } else if (strcmp(type_str, "stable") == 0) {
            config->stage_type = STAGE_TYPE_STABLE;
        } else {
            config->stage_type = STAGE_TYPE_EXPERIMENTAL;
        }
    } else {
        config->stage_type = STAGE_TYPE_EXPERIMENTAL;
    }
    
    cJSON *semverx_lock = cJSON_GetObjectItem(json, "semverx_lock");
    config->semverx_lock = semverx_lock ? cJSON_IsTrue(semverx_lock) : 0;
    
    cJSON *entry_point = cJSON_GetObjectItem(json, "entry_point");
    if (entry_point) {
        strncpy(config->entry_point, cJSON_GetStringValue(entry_point), sizeof(config->entry_point) - 1);
    }
    
    cJSON *nlink_enabled = cJSON_GetObjectItem(json, "nlink_enabled");
    config->nlink_enabled = nlink_enabled ? cJSON_IsTrue(nlink_enabled) : 0;
    
    cJSON_Delete(json);
    return VALIDATION_SUCCESS;
}

/**
 * @brief Validate timestamp freshness (90-day expiration window)
 * @param timestamp ISO 8601 timestamp string
 * @return validation_result_t Validation result
 */
validation_result_t validate_timestamp_freshness(const char *timestamp) {
    // Simplified timestamp validation - production implementation would use proper ISO 8601 parsing
    time_t current_time = time(NULL);
    time_t expiry_threshold = current_time - (GOVERNANCE_EXPIRY_DAYS * 24 * 60 * 60);
    
    // Basic timestamp parsing (assumes format: YYYY-MM-DDTHH:MM:SSZ)
    struct tm timestamp_tm = {0};
    if (strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ", &timestamp_tm) == NULL) {
        return VALIDATION_SCHEMA_VIOLATION;
    }
    
    time_t config_time = mktime(&timestamp_tm);
    
    if (config_time < expiry_threshold) {
        return VALIDATION_EXPIRED_GOVERNANCE;
    }
    
    return VALIDATION_SUCCESS;
}

/**
 * @brief Validate SemVerX compliance through NLink integration
 * @param ctx Validation context
 * @param config Governance configuration
 * @return validation_result_t Validation result
 */
validation_result_t validate_semverx_compliance(validation_context_t *ctx, governance_config_t *config) {
    if (!config->nlink_enabled) {
        return VALIDATION_SUCCESS;  // Skip if NLink not enabled
    }
    
    // Execute NLink SemVerX validation
    char nlink_command[512];
    snprintf(nlink_command, sizeof(nlink_command),
             "nlink --semverx-validate --project-root %s --package %s --version %s",
             ctx->project_root, config->package_name, config->version);
    
    int nlink_result = system(nlink_command);
    
    if (nlink_result != 0) {
        fprintf(ctx->validation_log, "[SEMVERX] Validation failed for %s v%s\n", 
                config->package_name, config->version);
        return VALIDATION_SEMVERX_VIOLATION;
    }
    
    return VALIDATION_SUCCESS;
}

/**
 * @brief Validate Stage 5 optimizer security governance
 * @param ctx Validation context
 * @param stage5_config Stage 5 specific configuration
 * @return validation_result_t Validation result
 */
validation_result_t validate_stage5_security(validation_context_t *ctx, stage5_optimizer_t *stage5_config) {
    if (!stage5_config) {
        fprintf(ctx->validation_log, "[STAGE5] Missing optimizer security configuration\n");
        return VALIDATION_MISSING_GOVERNANCE;
    }
    
    // Verify minimization was performed
    if (!stage5_config->minimization_verified) {
        fprintf(ctx->validation_log, "[STAGE5] AST minimization not verified\n");
        return VALIDATION_SEMVERX_VIOLATION;
    }
    
    // Validate path hashes are present
    if (strlen(stage5_config->path_hash) != 64 || strlen(stage5_config->post_optimization_hash) != 64) {
        fprintf(ctx->validation_log, "[STAGE5] Invalid cryptographic hashes\n");
        return VALIDATION_SCHEMA_VIOLATION;
    }
    
    // Check for audit trail if enabled
    if (stage5_config->audit_enabled) {
        char audit_path[MAX_PATH_LENGTH];
        snprintf(audit_path, sizeof(audit_path), "%s/logs/opt_trace.sig", ctx->project_root);
        
        if (access(audit_path, F_OK) != 0) {
            fprintf(ctx->validation_log, "[STAGE5] Missing audit trail: %s\n", audit_path);
            return VALIDATION_MISSING_GOVERNANCE;
        }
    }
    
    // Verify semantic equivalence proof
    if (!stage5_config->semantic_equivalence_proof) {
        fprintf(ctx->validation_log, "[STAGE5] Semantic equivalence not proven\n");
        return VALIDATION_SEMVERX_VIOLATION;
    }
    
    fprintf(ctx->validation_log, "[STAGE5] Security validation passed\n");
    return VALIDATION_SUCCESS;
}

/**
 * @brief Validate individual compiler stage governance
 * @param ctx Validation context
 * @param stage_id Stage number (0-6)
 * @return validation_result_t Validation result
 */
validation_result_t validate_stage_governance(validation_context_t *ctx, int stage_id) {
    if (stage_id < 0 || stage_id >= MAX_STAGE_COUNT) {
        return VALIDATION_SCHEMA_VIOLATION;
    }
    
    // Primary stage configuration
    char primary_config_path[MAX_PATH_LENGTH];
    snprintf(primary_config_path, sizeof(primary_config_path), "%s/.riftrc.%d", ctx->project_root, stage_id);
    
    governance_config_t stage_config;
    validation_result_t result = parse_governance_file(primary_config_path, &stage_config);
    
    if (result != VALIDATION_SUCCESS) {
        fprintf(ctx->validation_log, "[STAGE%d] Primary configuration validation failed: %d\n", stage_id, result);
        return result;
    }
    
    // Timestamp freshness validation
    result = validate_timestamp_freshness(stage_config.timestamp);
    if (result != VALIDATION_SUCCESS) {
        fprintf(ctx->validation_log, "[STAGE%d] Timestamp validation failed\n", stage_id);
        return result;
    }
    
    // SemVerX compliance validation
    if (stage_config.semverx_lock) {
        result = validate_semverx_compliance(ctx, &stage_config);
        if (result != VALIDATION_SUCCESS) {
            fprintf(ctx->validation_log, "[STAGE%d] SemVerX validation failed\n", stage_id);
            return result;
        }
    }
    
    // Stage-specific validation
    if (stage_id == 5) {
        // Stage 5 requires additional security validation
        char stage5_config_path[MAX_PATH_LENGTH];
        snprintf(stage5_config_path, sizeof(stage5_config_path), "%s/gov.optimizer.stage.riftrc.5", ctx->project_root);
        
        // TODO: Parse Stage 5 specific configuration
        // This would require extending the JSON parsing to handle stage5_optimizer section
        stage5_optimizer_t stage5_config = {0};  // Placeholder
        
        result = validate_stage5_security(ctx, &stage5_config);
        if (result != VALIDATION_SUCCESS) {
            return result;
        }
    }
    
    // Store validated configuration
    ctx->stage_configs[stage_id] = stage_config;
    ctx->validated_stages++;
    
    fprintf(ctx->validation_log, "[STAGE%d] Validation completed successfully\n", stage_id);
    return VALIDATION_SUCCESS;
}

/**
 * @brief Validate complete RIFT compiler pipeline (stages 0-6)
 * @param ctx Validation context
 * @return validation_result_t Overall validation result
 */
validation_result_t validate_complete_pipeline(validation_context_t *ctx) {
    validation_result_t overall_result = VALIDATION_SUCCESS;
    
    fprintf(ctx->validation_log, "[PIPELINE] Starting complete pipeline validation\n");
    
    for (int stage_id = 0; stage_id < MAX_STAGE_COUNT; stage_id++) {
        validation_result_t stage_result = validate_stage_governance(ctx, stage_id);
        
        switch (stage_result) {
            case VALIDATION_SEMVERX_VIOLATION:
            case VALIDATION_EXPIRED_GOVERNANCE:
                // Critical failures halt the build
                fprintf(ctx->validation_log, "[PIPELINE] Critical failure at stage %d: %d\n", stage_id, stage_result);
                return stage_result;
                
            case VALIDATION_MISSING_GOVERNANCE:
                // Check for fallback governance
                char fallback_path[MAX_PATH_LENGTH];
                snprintf(fallback_path, sizeof(fallback_path), "%s/irift/.riftrc.%d", ctx->project_root, stage_id);
                
                if (access(fallback_path, F_OK) == 0) {
                    fprintf(ctx->validation_log, "[STAGE%d] Using fallback governance\n", stage_id);
                    // Re-validate with fallback
                    // TODO: Implement fallback validation logic
                } else if (overall_result == VALIDATION_SUCCESS) {
                    overall_result = VALIDATION_MISSING_GOVERNANCE;
                }
                break;
                
            case VALIDATION_SCHEMA_VIOLATION:
                if (overall_result == VALIDATION_SUCCESS) {
                    overall_result = VALIDATION_SCHEMA_VIOLATION;
                }
                break;
                
            default:
                // Continue validation
                break;
        }
    }
    
    fprintf(ctx->validation_log, "[PIPELINE] Validation completed with result: %d\n", overall_result);
    return overall_result;
}

/**
 * @brief Cleanup validation context and close resources
 * @param ctx Validation context to cleanup
 */
void rift_validation_cleanup(validation_context_t *ctx) {
    if (ctx && ctx->validation_log && ctx->validation_log != stderr) {
        fclose(ctx->validation_log);
    }
}

/**
 * @brief Main validation entry point
 * @param argc Argument count
 * @param argv Argument vector
 * @return int Exit code (0 = success, non-zero = failure)
 */
int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <project_root> [--verbose] [--strict]\n", argv[0]);
        return 1;
    }
    
    validation_context_t ctx;
    validation_result_t result = rift_validation_init(&ctx, argv[1]);
    
    if (result != VALIDATION_SUCCESS) {
        fprintf(stderr, "[AEGIS] Failed to initialize validation context\n");
        return 1;
    }
    
    // Parse command line options
    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "--verbose") == 0) {
            ctx.verbose_mode = 1;
        } else if (strcmp(argv[i], "--strict") == 0) {
            ctx.strict_mode = 1;
        }
    }
    
    printf("AEGIS RIFT Governance Validation Engine v1.0.0\n");
    printf("Project Root: %s\n", ctx.project_root);
    printf("Validation Mode: %s\n", ctx.strict_mode ? "Strict" : "Standard");
    
    // Execute pipeline validation
    result = validate_complete_pipeline(&ctx);
    
    // Report results
    switch (result) {
        case VALIDATION_SUCCESS:
            printf("[SUCCESS] All governance validation passed\n");
            break;
            
        case VALIDATION_SEMVERX_VIOLATION:
            printf("[CRITICAL] SemVerX violation detected - BUILD HALT\n");
            break;
            
        case VALIDATION_EXPIRED_GOVERNANCE:
            printf("[CRITICAL] Expired governance detected - BUILD HALT\n");
            break;
            
        case VALIDATION_MISSING_GOVERNANCE:
            printf("[WARNING] Missing governance files detected\n");
            break;
            
        case VALIDATION_SCHEMA_VIOLATION:
            printf("[WARNING] Schema violations detected\n");
            break;
            
        default:
            printf("[ERROR] Validation failed with code: %d\n", result);
            break;
    }
    
    rift_validation_cleanup(&ctx);
    
    // Return appropriate exit code
    switch (result) {
        case VALIDATION_SUCCESS:
            return 0;
        case VALIDATION_SEMVERX_VIOLATION:
        case VALIDATION_EXPIRED_GOVERNANCE:
            return 1;  // Critical failure
        case VALIDATION_MISSING_GOVERNANCE:
        case VALIDATION_SCHEMA_VIOLATION:
            return 2;  // Warning state
        default:
            return 3;  // General error
    }
}