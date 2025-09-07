#ifndef SEMVERX_PARSER_H
#define SEMVERX_PARSER_H

#include <stdbool.h>
#include <stdint.h>

typedef enum {
    SEMVERX_STATE_INVALID = -1,
    SEMVERX_STATE_LEGACY = 0,
    SEMVERX_STATE_STABLE = 1,
    SEMVERX_STATE_LTS = 1,  // Alias for stable
    SEMVERX_STATE_EXPERIMENTAL = 2
} semverx_state_t;

typedef semverx_state_t semverx_range_state_t;

typedef struct {
    double x, y, z;
} nlm_coord_t;

typedef struct {
    int major, minor, patch;
    semverx_state_t major_state;
    semverx_state_t minor_state;
    semverx_state_t patch_state;
    nlm_coord_t nlm;
    char abi_hash[65];
    char signature[129];
    semverx_state_t state;  // Overall state
} semverx_component_t;

typedef struct {
    bool allow_legacy_use;
    bool allow_stable_swap;
    bool allow_experimental_swap;
    double max_nlm_distance;
} semverx_policy_t;

// Function declarations
semverx_range_state_t semverx_parse_range_state(const char *state_str);
bool semverx_validate_compatibility(const semverx_component_t *comp1, 
                                   const semverx_component_t *comp2,
                                   const semverx_policy_t *policy);
int semverx_parse_component_config(const char *config_path, 
                                  semverx_component_t *component);
int semverx_validate_project_compatibility(const char *project_root);
void semverx_compute_nlm(const semverx_component_t *comp, nlm_coord_t *out);

#endif /* SEMVERX_PARSER_H */
