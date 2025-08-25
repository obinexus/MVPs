#ifndef REPL_H
#define REPL_H

typedef struct {
    double *data;
    size_t n;
} vec_t;

// Vector operations
vec_t vec(size_t n, double *vals);
double mag(const vec_t *v);
vec_t norm(vec_t v);
void vec_free(vec_t *v);

// REPL
void repl(void);
char *next_token(char **s);

#endif
