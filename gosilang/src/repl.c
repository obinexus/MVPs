#include "gosilang.h"
#include "repl.h"
#include "aura256.h"
#include "pigeonhole.h"

// Vector operations
vec_t vec(size_t n, double *vals)
{
    vec_t v = {malloc(n * sizeof(double)), n};
    for(size_t i = 0; i < n; i++) {
        v.data[i] = vals[i];
    }
    return v;
}

double mag(const vec_t *v)
{
    double s = 0;
    for(size_t i = 0; i < v->n; i++) {
        if(!isnan(v->data[i])) {
            s += v->data[i] * v->data[i];
        }
    }
    return sqrt(s);
}

vec_t norm(vec_t v)
{
    double m = mag(&v);
    if (m == 0.0) {
        return v;
    }
    
    vec_t out = {malloc(v.n * sizeof(double)), v.n};
    for (size_t i = 0; i < v.n; i++) {
        out.data[i] = isnan(v.data[i]) ? NIL : v.data[i] / m;
    }
    return out;
}

void vec_free(vec_t *v)
{
    if (v->data) {
        free(v->data);
        v->data = NULL;
        v->n = 0;
    }
}

// Token parsing
char *next_token(char **s)
{
    while(**s == ' ' || **s == '\t' || **s == '\n') (*s)++;
    if(!**s) return NULL;
    
    char *start = *s;
    if(**s == '(' || **s == ')' || **s == '[' || **s == ']' || 
       **s == ',' || **s == ';') {
        (*s)++;
        return strndup(start, 1);
    }
    
    while(**s && !strchr(" \t\n()[]{},;", **s)) (*s)++;
    return strndup(start, *s - start);
}

// Main REPL
void repl(void)
{
    char line[256];
    while(printf("gosilang> "), fflush(stdout), fgets(line, sizeof(line), stdin)) {
        char *s = line, *tok;
        
        if((tok = next_token(&s)) && !strcmp(tok, "vec")) {
            free(tok);
            // Parse vector dimensions
            tok = next_token(&s); // Skip <3>
            int dim = 3;
            double vals[dim];
            
            for(int i = 0; i < dim; i++) {
                next_token(&s); // Skip (
                vals[i] = atof(next_token(&s));
            }
            
            vec_t v = vec(dim, vals);
            vec_t nv = norm(v);
            printf("mag = %.3f\n", mag(&nv));
            
            vec_free(&v);
            vec_free(&nv);
        }
        else if(tok && !strcmp(tok, "aura")) {
            free(tok);
            
            // Test AuraSeal with Bayesian security
            double priv[3] = {1.23, 4.56, 7.89};
            double pub = 42.0;
            aura256_t seal;
            aura256_seal(priv, pub, seal);
            
            bool collision = ph_mark(seal);
            
            bayes_security_t bs = {
                .prior_secure = 0.001,
                .likelihood = 0.999,
                .evidence = 0.089
            };
            
            double security_score = bayes_update(&bs, !collision);
            
            printf("AuraSeal = ");
            for(int i = 0; i < 8; i++) printf("%02x", seal[i]);
            printf("...\n");
            printf("Collision: %s\n", collision ? "YES (NIL)" : "NO (NULL)");
            printf("Security Score: %.4f\n", security_score);
        }
        else if(tok && !strcmp(tok, "pigeonhole")) {
            free(tok);
            ph_analyze_collisions();
        }
        else if(tok && !strcmp(tok, "quit")) {
            free(tok);
            break;
        }
        else if(tok) {
            printf("Unknown command: %s\n", tok);
            free(tok);
        }
    }
}
