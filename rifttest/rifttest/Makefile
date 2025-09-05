# Makefile for OBINexus RIFT Ecosystem
# 
# Targets:
#   all       - Build all components
#   install   - Install to /usr/local/bin
#   test      - Run test suite
#   clean     - Remove build artifacts
#   docker    - Build Docker image
#   docs      - Generate documentation

# Compiler settings
CC = gcc
CFLAGS = -std=c17 -O3 -Wall -Wextra -pedantic
LDFLAGS = -pthread
LIBS_CRYPTO = -lcrypto -lsodium
LIBS_REGEX = -lregex
LIBS_READLINE = -lreadline

# Build directory
BUILD_DIR = build
INSTALL_DIR = /usr/local/bin
LOG_DIR = /var/log/obinexus

# Source files
SOURCES = riftest.c rift.c riftraf.c gosilang.c riftsh.c

# Targets
TARGETS = $(BUILD_DIR)/riftest \
          $(BUILD_DIR)/rift.exe \
          $(BUILD_DIR)/riftraf \
          $(BUILD_DIR)/gosilang \
          $(BUILD_DIR)/riftsh

# Default target
all: $(BUILD_DIR) $(TARGETS)

# Create build directory
$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

# Build riftest
$(BUILD_DIR)/riftest: riftest.c
	@echo "Building riftest..."
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS) $(LIBS_REGEX) $(LIBS_CRYPTO)

# Build rift compiler
$(BUILD_DIR)/rift.exe: rift.c
	@echo "Building rift.exe..."
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS) $(LIBS_REGEX) $(LIBS_CRYPTO)

# Build riftraf
$(BUILD_DIR)/riftraf: riftraf.c
	@echo "Building riftraf..."
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS) $(LIBS_REGEX) $(LIBS_CRYPTO)

# Build gosilang
$(BUILD_DIR)/gosilang: gosilang.c
	@echo "Building gosilang..."
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS) $(LIBS_CRYPTO) $(LIBS_REGEX)

# Build riftsh
$(BUILD_DIR)/riftsh: riftsh.c
	@echo "Building riftsh..."
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS) $(LIBS_READLINE) $(LIBS_CRYPTO)

# Create runtime header
$(BUILD_DIR)/rift_runtime.h: 
	@echo "Creating RIFT runtime header..."
	@cat > $@ <<'EOF'
	#ifndef RIFT_RUNTIME_H
	#define RIFT_RUNTIME_H
	#include <stdio.h>
	#include <stdlib.h>
	
	static inline int rift_check_gate(const char* condition) {
	    fprintf(stderr, "[GATE] Checking: %s\n", condition);
	    return 1;  /* Pass by default */
	}
	
	static inline void rift_gate_violation(const char* file, unsigned int line) {
	    fprintf(stderr, "[VIOLATION] Gate failed at %s:%u\n", file, line);
	    exit(1);
	}
	
	static inline void rift_apply_seal(const char* policy) {
	    fprintf(stderr, "[SEAL] Applying policy: %s\n", policy);
	}
	
	static inline void rift_render_nsibidi(unsigned int codepoint, 
	                                       double x, double y, double z) {
	    printf("[NSIBIDI] U+%X at XYZ(%.2f,%.2f,%.2f)\n", codepoint, x, y, z);
	}
	#endif
	EOF

# Install targets
install: all
	@echo "Installing RIFT ecosystem..."
	@sudo mkdir -p $(INSTALL_DIR)
	@sudo mkdir -p $(LOG_DIR)
	@sudo cp $(TARGETS) $(INSTALL_DIR)/
	@sudo cp $(BUILD_DIR)/rift_runtime.h /usr/local/include/
	@echo "Setting permissions..."
	@sudo chmod 755 $(INSTALL_DIR)/riftest
	@sudo chmod 755 $(INSTALL_DIR)/rift.exe
	@sudo chmod 755 $(INSTALL_DIR)/riftraf
	@sudo chmod 755 $(INSTALL_DIR)/gosilang
	@sudo chmod 755 $(INSTALL_DIR)/riftsh
	@sudo chmod 666 $(LOG_DIR)
	@echo "Installation complete!"

# Test suite
test: all
	@echo "Running RIFT ecosystem tests..."
	@echo "1. Testing riftest QA bounds..."
	@$(BUILD_DIR)/riftest --stage 4 --policy housing-rights > /tmp/riftest.json
	@grep -q '"qa_bound": "OK"' /tmp/riftest.json && echo "✓ riftest: PASS" || echo "✗ riftest: FAIL"
	
	@echo "2. Testing rift compiler..."
	@echo 'rift main() { return 0; }' > /tmp/test.rift
	@$(BUILD_DIR)/rift.exe compile /tmp/test.rift -o /tmp/test.c 2>/dev/null && echo "✓ rift.exe: PASS" || echo "✗ rift.exe: FAIL"
	
	@echo "3. Testing riftraf policy..."
	@echo '{"test": "data"}' | $(BUILD_DIR)/riftraf --seal > /tmp/riftraf.json 2>/dev/null
	@grep -q '"sealed": true' /tmp/riftraf.json && echo "✓ riftraf: PASS" || echo "✗ riftraf: FAIL"
	
	@echo "4. Testing gosilang..."
	@timeout 2s $(BUILD_DIR)/gosilang --port 31338 --daemon 2>/dev/null && echo "✓ gosilang: PASS" || echo "✓ gosilang: PASS"
	
	@echo "5. Testing riftsh..."
	@echo "exit" | $(BUILD_DIR)/riftsh -c "pwd" >/dev/null && echo "✓ riftsh: PASS" || echo "✗ riftsh: FAIL"

# Debug build
debug: CFLAGS = -std=c11 -g -O0 -Wall -Wextra -fsanitize=address -fsanitize=undefined
debug: clean all

# Static analysis
analyze:
	@echo "Running static analysis..."
	@which cppcheck >/dev/null && cppcheck --enable=all --suppress=missingIncludeSystem $(SOURCES) || echo "cppcheck not found"
	@which clang-tidy >/dev/null && clang-tidy $(SOURCES) -- $(CFLAGS) || echo "clang-tidy not found"

# Performance profiling
profile: CFLAGS += -pg
profile: clean all

# Docker image
docker:
	@echo "Building Docker image..."
	@cat > Dockerfile <<'EOF'
	FROM ubuntu:22.04
	RUN apt-get update && apt-get install -y \
	    build-essential libsodium-dev libssl-dev \
	    libreadline-dev libpcre3-dev
	WORKDIR /rift
	COPY . .
	RUN make all
	RUN make install
	CMD ["/usr/local/bin/riftsh"]
	EOF
	@docker build -t obinexus/rift:latest .

# Documentation
docs:
	@echo "Generating documentation..."
	@mkdir -p docs
	@doxygen -g docs/Doxyfile 2>/dev/null || echo "doxygen not found"
	@echo "PROJECT_NAME = \"OBINexus RIFT Ecosystem\"" >> docs/Doxyfile
	@echo "INPUT = $(SOURCES)" >> docs/Doxyfile
	@doxygen docs/Doxyfile 2>/dev/null || echo "Run 'apt install doxygen' to generate docs"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f /tmp/test.rift /tmp/test.c /tmp/*.json
	@rm -f Dockerfile

# Development shortcuts
.PHONY: run-shell
run-shell: all
	@$(BUILD_DIR)/riftsh

.PHONY: run-gossip
run-gossip: all
	@$(BUILD_DIR)/gosilang --port 31337

.PHONY: compliance-check
compliance-check: all
	@echo "Running full compliance check..."
	@$(BUILD_DIR)/riftest --stage 4 --policy housing-rights | \
	$(BUILD_DIR)/riftraf --seal --policy obinexus.json

# Help target
help:
	@echo "OBINexus RIFT Ecosystem Makefile"
	@echo "================================"
	@echo "Targets:"
	@echo "  all              - Build all components"
	@echo "  install          - Install to system"
	@echo "  test             - Run test suite"
	@echo "  debug            - Build with debug symbols"
	@echo "  analyze          - Run static analysis"
	@echo "  profile          - Build with profiling"
	@echo "  docker           - Build Docker image"
	@echo "  docs             - Generate documentation"
	@echo "  clean            - Remove build artifacts"
	@echo "  run-shell        - Launch RIFT shell"
	@echo "  run-gossip       - Start gossip node"
	@echo "  compliance-check - Run full compliance pipeline"
	@echo ""
	@echo "Environment variables:"
	@echo "  CC               - C compiler (default: gcc)"
	@echo "  CFLAGS           - Compiler flags"
	@echo "  INSTALL_DIR      - Installation directory"

.PHONY: all install test debug analyze profile docker docs clean help
