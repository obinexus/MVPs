#ifndef STRESS_FILTER_FLASH_H
#define STRESS_FILTER_FLASH_H

#include <stdint.h>
#include <stdbool.h>
#include <time.h>

typedef enum {
    STRESS_IDLE = 0,
    STRESS_ENTRY,
    STRESS_FLASH, 
    STRESS_ENCODE,
    STRESS_BACKGROUND,
    STRESS_IMMUNE,
    STRESS_ERROR
} stress_state_t;

typedef enum {
    NOISE_PRNG = 0,
    NOISE_ENTROPY,
    NOISE_ENVIRONMENTAL,
    NOISE_FEEDBACK
} noise_source_t;

typedef struct {
    stress_state_t state;
    double trigger_magnitude;
    uint64_t timestamp_ns;
    char packet_id[37]; // UUID string
    double encoded_vector[128];
    bool is_encoded;
    uint32_t immune_counter;
} stress_packet_t;

typedef struct {
    stress_state_t current_state;
    double flash_threshold;
    double encode_confidence;
    uint32_t immune_criteria;
    uint64_t immune_window_ns;
    uint64_t immune_window_start;
    stress_packet_t active_packet;
    noise_source_t noise_source;
    void* noise_context;
} stress_system_t;

// Core API
stress_system_t* stress_system_create(void);
void stress_system_destroy(stress_system_t* sys);
stress_packet_t* stress_process_trigger(stress_system_t* sys, double magnitude);
void stress_system_set_noise_source(stress_system_t* sys, noise_source_t source);

// Noise generation functions
double generate_prng_noise(void* context);
double generate_entropy_noise(void* context);
double generate_environmental_noise(void* context);
double generate_feedback_noise(void* context, double input);

// Adaptive evolution functions
void stress_system_evolve_thresholds(stress_system_t* sys);
void stress_system_adapt_to_pattern(stress_system_t* sys, double* pattern, size_t len);

#endif
