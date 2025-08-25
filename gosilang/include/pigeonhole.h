#ifndef PIGEONHOLE_H
#define PIGEONHOLE_H

#include <stdint.h>
#include <stdatomic.h>
#include "aura256.h"

/* 2^32 slots = 4GB index → fits in 32-bit, lock-free */
#define PH_SLOTS (1ULL << 32)

/* Atomic counters for lock-free operation */
extern _Atomic uint64_t ph_counters[PH_SLOTS];

/* Pigeonhole API */
void ph_reset(void);                       // Clear all counters
bool ph_mark(const aura256_t digest);      // Returns true on collision
uint64_t ph_count(const aura256_t digest); // Count pigeons in box
void ph_analyze_collisions(void);          // Statistical analysis

#endif
