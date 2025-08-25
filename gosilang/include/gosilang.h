#ifndef GOSILANG_H
#define GOSILANG_H

#define _GNU_SOURCE
#define _DEFAULT_SOURCE

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <pthread.h>

// Version info
#define GOSILANG_VERSION "1.0.0"
#define GOSILANG_AUTHOR "OBINexus Computing"

// NIL sentinel (using NAN as marker)
#define NIL ((double)NAN)

// Forward declarations
void repl(void);

#endif
