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
# Auto-detect header file name
HEADER_BASE = $(shell if [ -f "semverx_parser.h" ]; then echo "semverx_parser.h"; else echo "semver_parser.h"; fi)
HEADERS = $(HEADER_BASE)

# Object files
OBJECTS = $(patsubst %.c,$(BUILD_DIR)/%.o,$(C_SOURCES))

# Targets
STATIC_LIB = $(BUILD_DIR)/libsemverx.a
SHARED_LIB = $(BUILD_DIR)/libsemverx.so
EXECUTABLE = $(BIN_DIR)/semverx

# Main source (detect if exists)
MAIN_SRC = $(shell if [ -f "main.c" ]; then echo "main.c"; fi)
MAIN_OBJ = $(if $(MAIN_SRC),$(BUILD_DIR)/main.o,)

# Default target
all: dirs check-headers $(STATIC_LIB) $(SHARED_LIB) $(if $(MAIN_SRC),$(EXECUTABLE),)

# Check headers exist
check-headers:
	@if [ ! -f "$(HEADERS)" ]; then \
		echo "Error: Header file $(HEADERS) not found!"; \
		echo "Available headers: "; \
		ls -la *.h 2>/dev/null || echo "No .h files found"; \
		exit 1; \
	fi

# Create directories
dirs:
	@mkdir -p $(BUILD_DIR)
	@mkdir -p $(LIB_DIR)
	@mkdir -p $(BIN_DIR)

# Compile C source files
$(BUILD_DIR)/%.o: %.c $(HEADERS)
	@echo "Compiling $< (using header: $(HEADERS))..."
	$(CC) $(CFLAGS) -c $< -o $@

# Build static library
$(STATIC_LIB): $(OBJECTS)
	@echo "Creating static library..."
	$(AR) $(ARFLAGS) $@ $^
	@cp $@ $(LIB_DIR)/ 2>/dev/null || true

# Build shared library
$(SHARED_LIB): $(OBJECTS)
	@echo "Creating shared library..."
	$(CC) $(LDFLAGS) -o $@ $^
	@cp $@ $(LIB_DIR)/ 2>/dev/null || true

# Build executable (if main.c exists)
# In the Makefile, update the executable build line:
$(EXECUTABLE): $(MAIN_OBJ) $(STATIC_LIB)
	@echo "Building executable..."
	$(CC) $(CFLAGS) -o $@ $(MAIN_OBJ) -L$(BUILD_DIR) -lsemverx -lm -Wl,-rpath,'$$ORIGIN/../lib'

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
	@if [ -f "tests/test_dag.py" ]; then python3 tests/test_dag.py; fi
	@if [ -f "$(EXECUTABLE)" ]; then $(EXECUTABLE) "1.0.0-stable"; fi

# Generate FFI bindings
ffi: all
	@echo "Generating FFI bindings..."
	@if [ -f "scripts/generate_bindings.py" ]; then \
		python3 scripts/generate_bindings.py; \
	else \
		echo "Warning: scripts/generate_bindings.py not found"; \
	fi

# Debug info
info:
	@echo "=== SemVerX Build Info ==="
	@echo "C Sources: $(C_SOURCES)"
	@echo "Headers: $(HEADERS)"
	@echo "Objects: $(OBJECTS)"
	@echo "Main source: $(MAIN_SRC)"
	@echo "=========================="

.PHONY: all dirs clean install test ffi check-headers info
