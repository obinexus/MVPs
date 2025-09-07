# SemVerX Makefile - OBINexus Polyglot Build System
# Part of the toolchain: riftlang.exe → .so.a → rift.exe → gosilang

CC = gcc
CFLAGS = -Wall -Wextra -O2 -fPIC -I.
LDFLAGS = -shared
AR = ar
ARFLAGS = rcs

# Output directories
BUILD_DIR = build
LIB_DIR = lib
BIN_DIR = bin

# Source files
C_SOURCES = semverx_parser.c
HEADERS = semver_parser.h

# Object files
OBJECTS = $(patsubst %.c,$(BUILD_DIR)/%.o,$(C_SOURCES))

# Targets
STATIC_LIB = $(BUILD_DIR)/libsemverx.a
SHARED_LIB = $(BUILD_DIR)/libsemverx.so
EXECUTABLE = $(BIN_DIR)/semverx

# Default target
all: dirs $(STATIC_LIB) $(SHARED_LIB) $(EXECUTABLE)

# Create directories
dirs:
	@mkdir -p $(BUILD_DIR)
	@mkdir -p $(LIB_DIR)
	@mkdir -p $(BIN_DIR)

# Compile C source files
$(BUILD_DIR)/%.o: %.c $(HEADERS)
	@echo "Compiling $<..."
	$(CC) $(CFLAGS) -c $< -o $@

# Build static library
$(STATIC_LIB): $(OBJECTS)
	@echo "Creating static library..."
	$(AR) $(ARFLAGS) $@ $^

# Build shared library
$(SHARED_LIB): $(OBJECTS)
	@echo "Creating shared library..."
	$(CC) $(LDFLAGS) -o $@ $^

# Build executable (if you have a main.c)
$(EXECUTABLE): $(OBJECTS)
	@echo "Building executable..."
	$(CC) $(CFLAGS) -o $@ $^ -lm

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR) $(LIB_DIR) $(BIN_DIR)

# Install libraries
install: all
	@echo "Installing libraries..."
	@mkdir -p /usr/local/lib
	@mkdir -p /usr/local/include
	cp $(STATIC_LIB) /usr/local/lib/
	cp $(SHARED_LIB) /usr/local/lib/
	cp $(HEADERS) /usr/local/include/
	ldconfig

# Run tests
test: all
	@echo "Running tests..."
	python3 tests/test_dag.py
	./tests/test_parser

# Generate FFI bindings
ffi: all
	@echo "Generating FFI bindings..."
	python3 scripts/generate_bindings.py

.PHONY: all dirs clean install test ffi
