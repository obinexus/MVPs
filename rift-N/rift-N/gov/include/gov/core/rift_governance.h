/**
 * @file rift_governance.h
 * @brief RIFT Governance Validation Engine - Header Definitions
 * @author Nnamdi Michael Okpala & AEGIS Development Team
 * @version 1.0.0
 * 
 * OBINexus AEGIS Methodology Compliance
 * Header definitions for systematic governance validation
 */

#ifndef RIFT_GOVERNANCE_H
#define RIFT_GOVERNANCE_H

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

// AEGIS Governance API Version
#define RIFT_GOVERNANCE_VERSION_MAJOR 1
#define RIFT_GOVERNANCE_VERSION_MINOR 0
#define RIFT_GOVERNANCE_VERSION_PATCH 0

// Configuration Constants
#define MAX_PATH_LENGTH 512
#define MAX_STAGE_COUNT 7
#define MAX_SUBSTAGES_PER_STAGE 4
#define GOVERNANCE_EXPIRY_DAYS 90
#define SHA256_DIGEST_LENGTH 32

// Forward Declarations
typedef enum validation_result validation_result_t;
typedef enum stage_type stage_type_t;
typedef enum stakeholder_class stakeholder_class_t;
typedef struct governance_config governance_config_t;
typedef struct stage5_optimizer stage5_optimizer_t;
typedef struct validation_context validation_context_t;

// Enumeration Definitions
enum validation_result {
    VALIDATION_SUCCESS = 0,
    VALIDATION_SCHEMA_VIOLATION = 1,
    VALIDATION_EXPIRED_GOVERNANCE = 2,
    VALIDATION_SEMVERX_VIOLATION = 3,
    VALIDATION_MISSING_GOVERNANCE = 4,
    VALIDATION_STAKEHOLDER_UNAUTHORIZED = 5,
    VALIDATION_CRITICAL_FAILURE = 6
};

enum stage_type {
    STAGE_TYPE_LEGACY = 0,
    STAGE_TYPE_EXPERIMENTAL = 1,
    STAGE_TYPE_STABLE = 2
};

enum stakeholder_class {
    STAKEHOLDER_USER = 1,
    STAKEHOLDER_DEVELOPER = 2,
    STAKEHOLDER_VENDOR = 4
};

// Structure Definitions
struct governance_config {
    char package_name[128];
    char version[32];
    char timestamp[32];
    int stage;
    stage_type_t stage_type;
    int semverx_lock;
    char entry_point[256];
    int nlink_enabled;
    stakeholder_class_t authorized_stakeholders;
};

struct stage5_optimizer {
    char optimizer_model[64];
    int minimization_verified;
    char path_hash[65];
    char post_optimization_hash[65];
    int audit_enabled;
    char security_level[32];
    int semantic_equivalence_proof;
};

struct validation_context {
    char project_root[MAX_PATH_LENGTH];
    int verbose_mode;
    int strict_mode;
    FILE *validation_log;
    governance_config_t stage_configs[MAX_STAGE_COUNT];
    int validated_stages;
};

// Public API Functions

/**
 * @brief Initialize validation context
 * @param ctx Validation context to initialize
 * @param project_root Path to project root directory
 * @return validation_result_t Success or failure code
 */
validation_result_t rift_validation_init(validation_context_t *ctx, const char *project_root);

/**
 * @brief Parse governance configuration file
 * @param file_path Path to governance file
 * @param config Output governance configuration
 * @return validation_result_t Parsing result
 */
validation_result_t parse_governance_file(const char *file_path, governance_config_t *config);

/**
 * @brief Validate timestamp freshness
 * @param timestamp ISO 8601 timestamp string
 * @return validation_result_t Validation result
 */
validation_result_t validate_timestamp_freshness(const char *timestamp);

/**
 * @brief Validate SemVerX compliance through NLink
 * @param ctx Validation context
 * @param config Governance configuration
 * @return validation_result_t Validation result
 */
validation_result_t validate_semverx_compliance(validation_context_t *ctx, governance_config_t *config);

/**
 * @brief Validate Stage 5 optimizer security
 * @param ctx Validation context
 * @param stage5_config Stage 5 specific configuration
 * @return validation_result_t Validation result
 */
validation_result_t validate_stage5_security(validation_context_t *ctx, stage5_optimizer_t *stage5_config);

/**
 * @brief Validate individual compiler stage
 * @param ctx Validation context
 * @param stage_id Stage number (0-6)
 * @return validation_result_t Validation result
 */
validation_result_t validate_stage_governance(validation_context_t *ctx, int stage_id);

/**
 * @brief Validate complete RIFT pipeline
 * @param ctx Validation context
 * @return validation_result_t Overall validation result
 */
validation_result_t validate_complete_pipeline(validation_context_t *ctx);

/**
 * @brief Cleanup validation context
 * @param ctx Validation context to cleanup
 */
void rift_validation_cleanup(validation_context_t *ctx);

// Utility Macros
#define RIFT_LOG_ERROR(ctx, fmt, ...) \
    fprintf((ctx)->validation_log, "[ERROR] " fmt "\n", ##__VA_ARGS__)

#define RIFT_LOG_WARNING(ctx, fmt, ...) \
    fprintf((ctx)->validation_log, "[WARNING] " fmt "\n", ##__VA_ARGS__)

#define RIFT_LOG_INFO(ctx, fmt, ...) \
    if ((ctx)->verbose_mode) fprintf((ctx)->validation_log, "[INFO] " fmt "\n", ##__VA_ARGS__)

// Version Information
static inline const char* rift_governance_version_string(void) {
    static char version_buffer[32];
    snprintf(version_buffer, sizeof(version_buffer), "%d.%d.%d",
             RIFT_GOVERNANCE_VERSION_MAJOR,
             RIFT_GOVERNANCE_VERSION_MINOR,
             RIFT_GOVERNANCE_VERSION_PATCH);
    return version_buffer;
}

#endif // RIFT_GOVERNANCE_H
