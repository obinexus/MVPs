# OBINexus Gov-Clock Makefile
# Clean implementation focused on C interoperation and build integrity

# Compiler Configuration
CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wpedantic -pthread -Iinclude
LDFLAGS = -pthread

# Build Configuration
DEBUG_CFLAGS = $(CFLAGS) -g -O0 -DDOP_DEBUG=1
RELEASE_CFLAGS = $(CFLAGS) -O3 -DNDEBUG -DDOP_RELEASE=1

# Project Directories
SRC_DIR = src
INCLUDE_DIR = include
BUILD_DIR = build
DEMO_DIR = src/demo
TEST_DIR = tests

# Source Files
CORE_SOURCES = $(SRC_DIR)/obinexus_dop_core.c \
               $(SRC_DIR)/dop_adapter.c \
               $(SRC_DIR)/dop_topology.c \
               $(SRC_DIR)/dop_manifest.c

DEMO_SOURCES = $(DEMO_DIR)/dop_demo.c
TEST_SOURCES = $(wildcard $(TEST_DIR)/*.c)

# Object Files
CORE_OBJECTS = $(CORE_SOURCES:%.c=$(BUILD_DIR)/%.o)
DEMO_OBJECTS = $(DEMO_SOURCES:%.c=$(BUILD_DIR)/%.o)
TEST_OBJECTS = $(TEST_SOURCES:%.c=$(BUILD_DIR)/%.o)

# Build Targets
STATIC_LIB = $(BUILD_DIR)/libobinexus_dop_isolated.a
DEMO_EXECUTABLE = $(BUILD_DIR)/dop_demo
TEST_EXECUTABLE = $(BUILD_DIR)/dop_tests

# Default Target
all: debug

# Debug Build
debug: CFLAGS := $(DEBUG_CFLAGS)
debug: directories $(STATIC_LIB) $(DEMO_EXECUTABLE)

# Release Build
release: CFLAGS := $(RELEASE_CFLAGS)
release: directories $(STATIC_LIB) $(DEMO_EXECUTABLE)

# Create Build Directories
directories:
	mkdir -p $(BUILD_DIR)/$(SRC_DIR)
	mkdir -p $(BUILD_DIR)/$(DEMO_DIR)
	mkdir -p $(BUILD_DIR)/$(TEST_DIR)

# Static Library Target
$(STATIC_LIB): $(CORE_OBJECTS)
	@echo "Creating static library: $@"
	ar rcs $@ $^
	@echo "Library created successfully"

# Demo Executable Target
$(DEMO_EXECUTABLE): $(DEMO_OBJECTS) $(STATIC_LIB)
	@echo "Linking demo executable: $@"
	$(CC) $(DEMO_OBJECTS) $(STATIC_LIB) $(LDFLAGS) -o $@
	@echo "Demo executable created successfully"

# Test Executable Target
$(TEST_EXECUTABLE): $(TEST_OBJECTS) $(STATIC_LIB)
	@echo "Linking test executable: $@"
	$(CC) $(TEST_OBJECTS) $(STATIC_LIB) $(LDFLAGS) -o $@
	@echo "Test executable created successfully"

# Object File Compilation Rule
$(BUILD_DIR)/%.o: %.c
	mkdir -p $(dir $@)
	@echo "Compiling: $<"
	$(CC) $(CFLAGS) -c $< -o $@

# Test Execution Targets
test: $(TEST_EXECUTABLE)
	@echo "Running unit tests..."
	./$(TEST_EXECUTABLE)

demo: $(DEMO_EXECUTABLE)
	@echo "Running demonstration..."
	./$(DEMO_EXECUTABLE)

test_components: $(DEMO_EXECUTABLE)
	@echo "Testing component functionality..."
	./$(DEMO_EXECUTABLE) --test-components

test_p2p: $(DEMO_EXECUTABLE)
	@echo "Testing P2P topology..."
	./$(DEMO_EXECUTABLE) --test-p2p-topology

test_xml: $(DEMO_EXECUTABLE)
	@echo "Testing XML manifest functionality..."
	./$(DEMO_EXECUTABLE) --test-xml-manifest

test_fault_tolerance: $(DEMO_EXECUTABLE)
	@echo "Testing fault tolerance..."
	./$(DEMO_EXECUTABLE) --test-p2p-fault

validate_manifest: $(DEMO_EXECUTABLE)
	@echo "Validating XML manifest schema..."
	./$(DEMO_EXECUTABLE) --validate-manifest

# Build Verification
verify_build:
	@echo "=== Build Verification ==="
	@if [ -f $(STATIC_LIB) ]; then \
		echo "✓ Static library exists"; \
		ls -la $(STATIC_LIB); \
	else \
		echo "✗ Static library missing"; \
	fi
	@if [ -f $(DEMO_EXECUTABLE) ]; then \
		echo "✓ Demo executable exists"; \
		ls -la $(DEMO_EXECUTABLE); \
	else \
		echo "✗ Demo executable missing"; \
	fi

# Check Source Dependencies
check_sources:
	@echo "=== Source File Verification ==="
	@for src in $(CORE_SOURCES); do \
		if [ -f $$src ]; then \
			echo "✓ $$src exists"; \
		else \
			echo "✗ $$src missing - run bootstrap script"; \
		fi; \
	done
	@for src in $(DEMO_SOURCES); do \
		if [ -f $$src ]; then \
			echo "✓ $$src exists"; \
		else \
			echo "✗ $$src missing"; \
		fi; \
	done

# Header File Verification
check_headers:
	@echo "=== Header File Verification ==="
	@for header in include/*.h; do \
		if [ -f $$header ]; then \
			echo "✓ $$header exists"; \
		else \
			echo "✗ $$header missing"; \
		fi; \
	done

# Complete System Check
check_system: check_sources check_headers
	@echo "=== System Ready Check ==="
	@echo "Run 'make all' to build the complete system"

# Clean Build Artifacts
clean:
	rm -rf $(BUILD_DIR)
	@echo "Build artifacts cleaned"

# Clean All Generated Files
distclean: clean
	rm -f src/dop_adapter.c src/dop_topology.c src/dop_manifest.c
	@echo "Complete cleanup performed"

# Installation Target
install: release
	@echo "Installing OBINexus Gov-Clock framework..."
	cp $(STATIC_LIB) /usr/local/lib/ 2>/dev/null || echo "Note: Library install requires administrative privileges"
	cp include/*.h /usr/local/include/ 2>/dev/null || echo "Note: Header install requires administrative privileges"

# Documentation and Help
help:
	@echo "OBINexus Gov-Clock Build System"
	@echo "==============================="
	@echo ""
	@echo "Build Targets:"
	@echo "  all, debug    - Build debug version (default)"
	@echo "  release       - Build optimized release version"
	@echo "  clean         - Remove build artifacts"
	@echo "  distclean     - Remove all generated files"
	@echo ""
	@echo "Test Targets:"
	@echo "  test          - Run unit tests"
	@echo "  demo          - Run demonstration program"
	@echo "  test_components - Test component functionality"
	@echo "  test_p2p      - Test peer-to-peer topology"
	@echo "  test_xml      - Test XML manifest functionality"
	@echo "  test_fault_tolerance - Test fault tolerance"
	@echo "  validate_manifest - Validate XML manifest schema"
	@echo ""
	@echo "Verification Targets:"
	@echo "  check_system  - Verify all source files and headers"
	@echo "  check_sources - Verify source file availability"
	@echo "  check_headers - Verify header file availability"
	@echo "  verify_build  - Verify build artifacts"
	@echo ""
	@echo "Installation:"
	@echo "  install       - Install to system directories"

# Build Summary Report
summary: verify_build
	@echo ""
	@echo "=== OBINexus Gov-Clock Build Summary ==="
	@echo "Project: OBINexus Data-Oriented Programming Framework"
	@echo "Target: Governance Clock Demonstration"
	@echo "Architecture: Component-based with C interoperation"
	@echo ""
	@if [ -f $(STATIC_LIB) ] && [ -f $(DEMO_EXECUTABLE) ]; then \
		echo "Build Status: ✓ SUCCESS"; \
		echo "Components: ✓ OPERATIONAL"; \
		echo "Framework: ✓ READY"; \
	else \
		echo "Build Status: ✗ INCOMPLETE"; \
		echo "Action Required: Run bootstrap script or verify source files"; \
	fi
	@echo "========================================"

# Dependency Information
dependencies:
	@echo "=== Build Dependencies ==="
	@echo "Required Source Files:"
	@for src in $(CORE_SOURCES) $(DEMO_SOURCES); do \
		echo "  - $$src"; \
	done
	@echo ""
	@echo "Required Header Files:"
	@echo "  - include/obinexus_dop_core.h"
	@echo "  - include/dop_adapter.h" 
	@echo "  - include/dop_topology.h"
	@echo "  - include/dop_manifest.h"
	@echo ""
	@echo "System Requirements:"
	@echo "  - GCC compiler with C11 support"
	@echo "  - POSIX threading library"
	@echo "  - Make build system"

# Phony Target Declarations
.PHONY: all debug release directories test demo clean distclean install help
.PHONY: check_sources check_headers check_system verify_build summary dependencies
.PHONY: test_components test_p2p test_xml test_fault_tolerance validate_manifest
