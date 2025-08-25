/* aura256.h - 256-bit lattice seal with NIL/NULL semantics (OBINexus 2025) */
#ifndef AURA256_H
#define AURA256_H

#include <stdint.h>
#include <stdbool.h>

/* ---------- Token lattice ---------- */
typedef enum { 
    TOK_NULL,  // Outside control space - no type, no data
    TOK_NIL,   // Inside lattice - sentinel with type + memory control
    TOK_NUM,   // Numeric scalar
    TOK_VEC    // Vector type
} token_kind_t;

typedef struct {
    token_kind_t kind;
    union {
        double num;
        struct {
            double *v;
            uint8_t k;
            bool owns;  // true => free(v) on drop
        } vec;
    } u;
} lattice_tok_t;

/* ---------- AuraSeal256 ---------- */
typedef uint8_t aura256_t[32];

/* C(priv_vec3, pub_scalar) → aura256_t (3D lattice) */
void aura256_seal(const double priv[3], double pub, aura256_t out);

/* ---------- Bayesian Security Assessment ---------- */
typedef struct {
    double prior_secure;      // P(H)
    double likelihood;        // P(D|H)
    double evidence;         // P(D)
    double posterior;        // P(H|D)
} bayes_security_t;

double bayes_update(bayes_security_t *bs, bool digest_match);

/* ---------- NIL-aware helpers ---------- */
static inline bool is_nil(const lattice_tok_t *t) { return t->kind == TOK_NIL; }
static inline bool is_null(const lattice_tok_t *t) { return t->kind == TOK_NULL; }

/* ---------- Memory safety ---------- */
void lattice_drop(lattice_tok_t *t);
double lattice_delta(double everything, const lattice_tok_t *u);

#endif
