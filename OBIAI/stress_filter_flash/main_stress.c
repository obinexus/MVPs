#include "stress_filter_flash.h"
#include <stdio.h>
#include <unistd.h>
#include <signal.h>

static volatile bool running = true;

void signal_handler(int sig) {
    running = false;
}

int main(int argc, char* argv[]) {
    signal(SIGINT, signal_handler);
    
    stress_system_t* sys = stress_system_create();
    if (!sys) {
        fprintf(stderr, "Failed to create stress system\n");
        return 1;
    }
    
    // Set noise source based on command line
    if (argc > 1) {
        if (strcmp(argv[1], "entropy") == 0) {
            stress_system_set_noise_source(sys, NOISE_ENTROPY);
        } else if (strcmp(argv[1], "environmental") == 0) {
            stress_system_set_noise_source(sys, NOISE_ENVIRONMENTAL);
        } else if (strcmp(argv[1], "feedback") == 0) {
            stress_system_set_noise_source(sys, NOISE_FEEDBACK);
        }
    }
    
    printf("StressFilterFlash v1.0 - OBINexus Consciousness Encoding\n");
    printf("Noise source: %d\n", sys->noise_source);
    printf("Press Ctrl+C to exit\n\n");
    
    double magnitude = 0.3;
    while (running) {
        // Simulate varying stress magnitude
        magnitude += (generate_entropy_noise(NULL) - 0.5) * 0.2;
        magnitude = fmax(0.0, fmin(1.0, magnitude));
        
        stress_packet_t* packet = stress_process_trigger(sys, magnitude);
        
        if (packet && packet->is_encoded) {
            printf("  -> Packet: %s (mag=%.3f, state=%d)\n", 
                   packet->packet_id, packet->trigger_magnitude, packet->state);
        }
        
        usleep(100000); // 100ms delay
    }
    
    stress_system_destroy(sys);
    printf("\nStressFilterFlash shutdown complete\n");
    return 0;
}
