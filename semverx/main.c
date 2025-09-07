#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "semverx_parser.h"

// Simple CLI for SemVerX parser
int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <version_string>\n", argv[0]);
        fprintf(stderr, "Example: %s \"1.2.3-stable\"\n", argv[0]);
        return 1;
    }

    const char *version_str = argv[1];
    printf("Parsing SemVerX version: %s\n", version_str);
    
    // Parse the version string
    semverx_component_t component = {0};
    int result = semverx_parse_component_config(version_str, &component);
    
    if (result != 0) {
        fprintf(stderr, "Error: Failed to parse version string\n");
        return 1;
    }
    
    // Display parsed components
    printf("\nParsed Version Components:\n");
    printf("  Major: %d (State: %d)\n", component.major, component.major_state);
    printf("  Minor: %d (State: %d)\n", component.minor, component.minor_state);
    printf("  Patch: %d (State: %d)\n", component.patch, component.patch_state);
    printf("  Overall State: %d\n", component.state);
    
    // Compute and display NLM coordinates
    nlm_coord_t nlm;
    semverx_compute_nlm(&component, &nlm);
    printf("\nNLM Coordinates:\n");
    printf("  X: %.3f\n", nlm.x);
    printf("  Y: %.3f\n", nlm.y);
    printf("  Z: %.3f\n", nlm.z);
    
    // Validate compatibility with a policy
    semverx_policy_t policy = {
        .allow_legacy_use = true,
        .allow_stable_swap = true,
        .allow_experimental_swap = false,
        .max_nlm_distance = 1.0
    };
    
    printf("\nPolicy Validation:\n");
    printf("  Legacy Use: %s\n", policy.allow_legacy_use ? "Allowed" : "Denied");
    printf("  Stable Swap: %s\n", policy.allow_stable_swap ? "Allowed" : "Denied");
    printf("  Experimental Swap: %s\n", policy.allow_experimental_swap ? "Allowed" : "Denied");
    printf("  Max NLM Distance: %.2f\n", policy.max_nlm_distance);
    
    return 0;
}

// Stub implementation for testing
int semverx_parse_component_config(const char *config_path, semverx_component_t *component) {
    if (!config_path || !component) return -1;
    
    // Simple parsing for demo
    // Format: "major.minor.patch-state"
    char buffer[256];
    strncpy(buffer, config_path, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';
    
    // Parse version numbers
    char *token = strtok(buffer, ".-");
    if (!token) return -1;
    component->major = atoi(token);
    
    token = strtok(NULL, ".-");
    if (!token) return -1;
    component->minor = atoi(token);
    
    token = strtok(NULL, ".-");
    if (!token) return -1;
    component->patch = atoi(token);
    
    // Set default states
    component->major_state = SEMVERX_STATE_STABLE;
    component->minor_state = SEMVERX_STATE_STABLE;
    component->patch_state = SEMVERX_STATE_STABLE;
    component->state = SEMVERX_STATE_STABLE;
    
    // Parse state if present
    token = strtok(NULL, "-");
    if (token) {
        if (strcmp(token, "legacy") == 0) {
            component->state = SEMVERX_STATE_LEGACY;
        } else if (strcmp(token, "experimental") == 0) {
            component->state = SEMVERX_STATE_EXPERIMENTAL;
        }
    }
    
    return 0;
}
