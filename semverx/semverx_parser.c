/**
 * @file semverx_parser.c
 * @brief SemVerX Implementation for NexusLink Integration
 */

#define _GNU_SOURCE
#define _POSIX_C_SOURCE 200809L

#include "semverx/semverx_parser.h"
#include <stdio.h>
#include <string.h>


semverx_range_state_t semverx_parse_range_state(const char *state_str) {
    if (!state_str) return SEMVERX_STATE_INVALID;
    
    if (strcmp(state_str, "legacy") == 0) return SEMVERX_STATE_LEGACY;
    if (strcmp(state_str, "stable") == 0) return SEMVERX_STATE_STABLE;
    if (strcmp(state_str, "experimental") == 0) return SEMVERX_STATE_EXPERIMENTAL;
    
    return SEMVERX_STATE_INVALID;
}

bool semverx_validate_compatibility(const semverx_component_t *comp1, 
                                   const semverx_component_t *comp2,
                                   const semverx_policy_t *policy) {
    // Legacy components cannot be used with Stable/Experimental
    if (comp1->state == SEMVERX_STATE_LEGACY || comp2->state == SEMVERX_STATE_LEGACY) {
        return policy->allow_legacy_use;
    }
    
    // Stable ↔ Stable compatibility
    if (comp1->state == SEMVERX_STATE_STABLE && comp2->state == SEMVERX_STATE_STABLE) {
        return policy->allow_stable_swap;
    }
    
    // Stable ↔ Experimental compatibility
    if ((comp1->state == SEMVERX_STATE_STABLE && comp2->state == SEMVERX_STATE_EXPERIMENTAL) ||
        (comp1->state == SEMVERX_STATE_EXPERIMENTAL && comp2->state == SEMVERX_STATE_STABLE)) {
        return policy->allow_experimental_swap;
    }
    
    return true; // Experimental ↔ Experimental allowed by default
}

int semverx_parse_component_config(const char *config_path, 
                                  semverx_component_t *component) {
    printf("[SEMVERX] Parsing component config: %s\n", config_path);
    // Implementation will extend existing nlink parser
    return 0;
}

int semverx_validate_project_compatibility(const char *project_root) {
    printf("[SEMVERX] Validating project compatibility: %s\n", project_root);
    // Implementation will validate all components in project
    return 0;
}
