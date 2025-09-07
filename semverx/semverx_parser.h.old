// Add to semverx_parser.h
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
} semverx_component_t;

// Add to semverx_parser.c
void semverx_compute_nlm(const semverx_component_t *comp, nlm_coord_t *out) {
    // State to coordinate mapping
    double state_coords[3][3] = {
        {0.6, 0.7, -0.5},   // LEGACY
        {0.9, 0.9, 0.0},    // LTS
        {-0.6, -0.7, 0.8}   // EXPERIMENTAL
    };
    
    // Weights for major, minor, patch
    double weights[3] = {0.6, 0.3, 0.1};
    
    // Get coordinates for each state
    int states[3] = {comp->major_state, comp->minor_state, comp->patch_state};
    int values[3] = {comp->major, comp->minor, comp->patch};
    
    double x = 0.0, y = 0.0, z = 0.0;
    
    for (int i = 0; i < 3; i++) {
        double norm_value = fmin(values[i] / 100.0, 1.0);
        int state_idx = states[i];  // 0=LEGACY, 1=LTS, 2=EXPERIMENTAL
        
        x += state_coords[state_idx][0] * weights[i] * norm_value;
        y += state_coords[state_idx][1] * weights[i] * norm_value;
        z += state_coords[state_idx][2] * weights[i] * norm_value;
    }
    
    // Clamp to [-1, 1]
    out->x = fmax(-1.0, fmin(1.0, x));
    out->y = fmax(-1.0, fmin(1.0, y));
    out->z = fmax(-1.0, fmin(1.0, z));
}
