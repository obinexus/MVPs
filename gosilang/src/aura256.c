#include "aura256.h"
#include <openssl/sha.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

void aura256_seal(const double priv[3], double pub, aura256_t out)
{
    uint8_t buf[3*sizeof(double) + sizeof(pub)];
    memcpy(buf, priv, 3*sizeof(double));
    memcpy(buf + 3*sizeof(double), &pub, sizeof(pub));
    SHA256(buf, sizeof(buf), out);
}

void lattice_drop(lattice_tok_t *t)
{
    if (t->kind == TOK_VEC && t->u.vec.owns) {
        free(t->u.vec.v);
    }
    *t = (lattice_tok_t){TOK_NULL};
}

double lattice_delta(double everything, const lattice_tok_t *u)
{
    if (is_null(u)) return NAN;  // NULL → NAN (outside space)
    if (is_nil(u)) return 0.0;   // NIL → skip sentinel
    if (u->kind == TOK_NUM) {
        return everything - u->u.num;
    }
    return NAN;
}

double bayes_update(bayes_security_t *bs, bool digest_match)
{
    // Bayes' Theorem: P(H|D) = P(D|H) * P(H) / P(D)
    if (digest_match) {
        bs->posterior = (bs->likelihood * bs->prior_secure) / bs->evidence;
    } else {
        // Update for non-match case
        bs->posterior = ((1.0 - bs->likelihood) * bs->prior_secure) / 
                       (1.0 - bs->evidence);
    }
    
    // Update prior for next iteration (learning)
    bs->prior_secure = bs->posterior;
    
    return bs->posterior;
}
