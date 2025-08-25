#!/bin/bash

# Build gosilang with AuraSeal256 and Pigeonhole support
gcc -Wall -Wextra -std=c11 \
    gosilang_mvp.c \
    aura256.c \
    pigeonhole.c \
    -lpthread -lssl -lcrypto -lm \
    -o gosilang

if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo "Run ./gosilang to start REPL"
    echo "New commands: 'aura' and 'pigeonhole'"
else
    echo "Build failed!"
    exit 1
fi
