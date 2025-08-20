#define _POSIX_C_SOURCE 200809L
#define _GNU_SOURCE

#include "stress_filter_flash.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <math.h>
#include <time.h>
#include <sys/random.h>
#include <uuid/uuid.h>
#include <unistd.h>

static uint64_t get_timestamp_ns(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts) == 0) {
        return ts.tv_sec * 1000000000ULL + ts.tv_nsec;
    }
    // Fallback to time() if clock_gettime fails
    return time(NULL) * 1000000000ULL;
}

stress_system_t* stress_system_create(void) {
    stress_system_t* sys = calloc(1, sizeof(stress_system_t));
    if (!sys) return NULL;
    
    sys->current_state = STRESS_IDLE;
    sys->flash_threshold = 0.50;
    sys->encode_confidence = 0.65;
    sys->immune_criteria = 3;
    sys->immune_window_ns = 3600000000000ULL; // 1 hour in nanoseconds
    sys->noise_source = NOISE_PRNG;
    
    srand(time(NULL)); // Initialize PRNG
    
    return sys;
}

void stress_system_destroy(stress_system_t* sys) {
    if (sys) {
        if (sys->noise_context) {
            free(sys->noise_context);
        }
        free(sys);
    }
}

void stress_system_set_noise_source(stress_system_t* sys, noise_source_t source) {
    if (sys) {
        sys->noise_source = source;
    }
}

double generate_prng_noise(void* context) {
    (void)context; // Suppress unused parameter warning
    return (double)rand() / RAND_MAX;
}

double generate_entropy_noise(void* context) {
    (void)context; // Suppress unused parameter warning
    uint32_t entropy;
    ssize_t result = getrandom(&entropy, sizeof(entropy), GRND_NONBLOCK);
    if (result == sizeof(entropy)) {
        return (double)entropy / UINT32_MAX;
    }
    return generate_prng_noise(context); // fallback
}

double generate_environmental_noise(void* context) {
    (void)context; // Suppress unused parameter warning
    // Placeholder for real environmental sensors
    // In production: read from microphone, accelerometer, temperature, etc.
    static double env_state = 0.5;
    env_state += (generate_entropy_noise(context) - 0.5) * 0.1;
    env_state = fmax(0.0, fmin(1.0, env_state)); // clamp [0,1]
    return env_state;
}

double generate_feedback_noise(void* context, double input) {
    (void)context; // Suppress unused parameter warning
    // Feedback noise based on system state and input
    static double feedback_accumulator = 0.0;
    feedback_accumulator = 0.9 * feedback_accumulator + 0.1 * input;
    return fmod(feedback_accumulator * 7.33, 1.0); // chaotic feedback
}

stress_packet_t* stress_process_trigger(stress_system_t* sys, double magnitude) {
    if (!sys) return NULL;
    
    uint64_t now = get_timestamp_ns();
    
    // Add noise to magnitude based on noise source
    double noise = 0.0;
    switch (sys->noise_source) {
        case NOISE_PRNG:
            noise = generate_prng_noise(sys->noise_context);
            break;
        case NOISE_ENTROPY:
            noise = generate_entropy_noise(sys->noise_context);
            break;
        case NOISE_ENVIRONMENTAL:
            noise = generate_environmental_noise(sys->noise_context);
            break;
        case NOISE_FEEDBACK:
            noise = generate_feedback_noise(sys->noise_context, magnitude);
            break;
    }
    
    magnitude = magnitude * 0.8 + noise * 0.2; // blend magnitude with noise
    
    // State machine transitions
    switch (sys->current_state) {
        case STRESS_IDLE:
            if (magnitude > 0.1) {
                printf("TRIGGER: IDLE -> STRESS_ENTRY (mag=%.3f)\n", magnitude);
                sys->current_state = STRESS_ENTRY;
            }
            break;
            
        case STRESS_ENTRY:
            if (magnitude >= sys->flash_threshold) {
                printf("FLASH: STRESS_ENTRY -> FLASH (mag=%.3f)\n", magnitude);
                sys->current_state = STRESS_FLASH;
            } else {
                printf("ENCODE: STRESS_ENTRY -> ENCODE (mag=%.3f)\n", magnitude);
                sys->current_state = STRESS_ENCODE;
            }
            break;
            
        case STRESS_FLASH:
            printf("FLASH_COMPLETE: FLASH -> ENCODE\n");
            sys->current_state = STRESS_ENCODE;
            break;
            
        case STRESS_ENCODE:
            if (magnitude >= sys->encode_confidence) {
                // Generate UUID for packet
                uuid_t uuid;
                uuid_generate(uuid);
                uuid_unparse(uuid, sys->active_packet.packet_id);
                
                sys->active_packet.state = STRESS_ENCODE;
                sys->active_packet.trigger_magnitude = magnitude;
                sys->active_packet.timestamp_ns = now;
                sys->active_packet.is_encoded = true;
                
                // Generate encoded vector (placeholder)
                for (int i = 0; i < 128; i++) {
                    sys->active_packet.encoded_vector[i] = generate_entropy_noise(NULL);
                }
                
                printf("ENCODED: packet_id=%s\n", sys->active_packet.packet_id);
                sys->current_state = STRESS_BACKGROUND;
                sys->immune_window_start = now;
                sys->active_packet.immune_counter = 0;
            } else {
                printf("ENCODE_FAILED: confidence too low -> ERROR\n");
                sys->current_state = STRESS_ERROR;
            }
            break;
            
        case STRESS_BACKGROUND:
            if (now - sys->immune_window_start < sys->immune_window_ns) {
                sys->active_packet.immune_counter++;
                printf("BACKGROUND: immune_counter=%u\n", sys->active_packet.immune_counter);
                
                if (sys->active_packet.immune_counter >= sys->immune_criteria) {
                    printf("IMMUNITY: BACKGROUND -> IMMUNE\n");
                    sys->current_state = STRESS_IMMUNE;
                }
            } else {
                // Reset immune window
                sys->immune_window_start = now;
                sys->active_packet.immune_counter = 0;
            }
            break;
            
        case STRESS_IMMUNE:
            printf("IMMUNE: minimal processing (mag=%.3f)\n", magnitude);
            // Adaptive evolution opportunity
            stress_system_evolve_thresholds(sys);
            break;
            
        case STRESS_ERROR:
            printf("ERROR: resetting to IDLE\n");
            sys->current_state = STRESS_IDLE;
            break;
    }
    
    return &sys->active_packet;
}

void stress_system_evolve_thresholds(stress_system_t* sys) {
    // Adaptive evolution: adjust thresholds based on effectiveness
    if (sys->active_packet.immune_counter > sys->immune_criteria) {
        // System is too sensitive, increase thresholds slightly
        sys->flash_threshold *= 1.01;
        sys->encode_confidence *= 1.005;
        printf("EVOLVE: increased sensitivity (flash=%.3f, encode=%.3f)\n", 
               sys->flash_threshold, sys->encode_confidence);
    }
}

void stress_system_adapt_to_pattern(stress_system_t* sys, double* pattern, size_t len) {
    if (!sys || !pattern || len == 0) return;
    
    // Calculate pattern statistics
    double mean = 0.0, variance = 0.0;
    for (size_t i = 0; i < len; i++) {
        mean += pattern[i];
    }
    mean /= len;
    
    for (size_t i = 0; i < len; i++) {
        variance += (pattern[i] - mean) * (pattern[i] - mean);
    }
    variance /= len;
    
    // Adapt thresholds based on pattern characteristics
    if (variance < 0.1) {
        // Low variance pattern - increase sensitivity
        sys->flash_threshold *= 0.95;
        sys->encode_confidence *= 0.98;
        printf("ADAPT: pattern low variance, increased sensitivity\n");
    } else if (variance > 0.5) {
        // High variance pattern - decrease sensitivity
        sys->flash_threshold *= 1.05;
        sys->encode_confidence *= 1.02;
        printf("ADAPT: pattern high variance, decreased sensitivity\n");
    }
}
