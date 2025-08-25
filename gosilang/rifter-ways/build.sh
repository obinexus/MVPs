#!/bin/sh
# ---- build.sh ----
gcc -std=c11 -Wall -Wextra \
    -D_POSIX_C_SOURCE=199309L \
    src/external.c -o build/external
