#include "pigeonhole.h"
#include <string.h>
#include <stdio.h>

_Atomic uint64_t ph_counters[PH_SLOTS];

void ph_reset(void)
{
    memset((void *)ph_counters, 0, sizeof(ph_counters));
}

static inline uint32_t slot_of(const aura256_t d)
{
    uint32_t *p = (uint32_t *)d;
    return (p[0] ^ p[1] ^ p[2] ^ p[3] ^ p[4] ^ p[5] ^ p[6] ^ p[7]) % PH_SLOTS;
}

bool ph_mark(const aura256_t digest)
{
    uint32_t idx = slot_of(digest);
    uint64_t old = atomic_fetch_add(&ph_counters[idx], 1);
    return old != 0;
}

uint64_t ph_count(const aura256_t digest)
{
    return atomic_load(&ph_counters[slot_of(digest)]);
}

void ph_analyze_collisions(void)
{
    uint64_t total = 0, collisions = 0;
    for (uint64_t i = 0; i < PH_SLOTS; i++) {
        uint64_t count = atomic_load(&ph_counters[i]);
        if (count > 0) {
            total += count;
            if (count > 1) {
                collisions += (count - 1);
            }
        }
    }
    
    if (total > 0) {
        double collision_rate = (double)collisions / total * 100.0;
        printf("Pigeonhole Analysis:\n");
        printf("  Total entries: %lu\n", total);
        printf("  Collisions: %lu (%.2f%%)\n", collisions, collision_rate);
        printf("  Load factor: %.4f%%\n", (double)total / PH_SLOTS * 100.0);
    }
}
