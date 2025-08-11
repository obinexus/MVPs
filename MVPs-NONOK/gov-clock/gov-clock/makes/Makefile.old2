# OBINexus Taxonomy-Based Makefile
# Corrected syntax with proper tab indentation

CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wpedantic -pthread
LDFLAGS = -pthread

# Taxonomy-Based Build Configurations
DEBUG_CFLAGS = $(CFLAGS) -g -O0 -DDOP_DEBUG=1 -DTAXONOMY_TESTING=1
RELEASE_CFLAGS = $(CFLAGS) -O3 -DNDEBUG -DDOP_RELEASE=1
STRESS_CFLAGS = $(CFLAGS) -O2 -g -DDOP_STRESS_TEST=1 -DTAXONOMY_STRESS=1

# Directories
SRC_DIR = src
INCLUDE_DIR = include
BUILD_DIR = build
TEST_DIR = tests

# Source Files
CORE_SOURCES = $(SRC_DIR)/obinexus_dop_core.c
COMPONENT_SOURCES = $(wildcard $(SRC_DIR)/components/*.c)
DEMO_SOURCES = $(wildcard $(SRC_DIR)/demo/*.c)
TEST_SOURCES = $(wildcard $(TEST_DIR)/*.c)

# Object Files
CORE_OBJECTS = $(CORE_SOURCES:%.c=$(BUILD_DIR)/%.o)
COMPONENT_OBJECTS = $(COMPONENT_SOURCES:%.c=$(BUILD_DIR)/%.o)
DEMO_OBJECTS = $(DEMO_SOURCES:%.c=$(BUILD_DIR)/%.o)
TEST_OBJECTS = $(TEST_SOURCES:%.c=$(BUILD_DIR)/%.o)

# Library Targets
ISOLATED_LIB = $(BUILD_DIR)/libobinexus_dop_isolated.a
CLOSED_LIB = $(BUILD_DIR)/libobinexus_dop_closed.a
OPEN_LIB = $(BUILD_DIR)/libobinexus_dop_open.a

# Executable Targets
DEMO_EXECUTABLE = $(BUILD_DIR)/dop_demo
TEST_EXECUTABLE = $(BUILD_DIR)/dop_tests

# Default target
all: debug

# Debug build with taxonomy support
debug: CFLAGS := $(DEBUG_CFLAGS)
debug: $(ISOLATED_LIB) $(DEMO_EXECUTABLE) $(TEST_EXECUTABLE)

# Release build
release: CFLAGS := $(RELEASE_CFLAGS)
release: $(ISOLATED_LIB) $(DEMO_EXECUTABLE) $(TEST_EXECUTABLE)

# Stress testing build
stress: CFLAGS := $(STRESS_CFLAGS)
stress: $(ISOLATED_LIB) $(DEMO_EXECUTABLE) $(TEST_EXECUTABLE)

# Isolated system library (core components only)
$(ISOLATED_LIB): $(CORE_OBJECTS) $(COMPONENT_OBJECTS) | $(BUILD_DIR)
	ar rcs $@ $^

# Demo executable
$(DEMO_EXECUTABLE): $(DEMO_OBJECTS) $(ISOLATED_LIB) | $(BUILD_DIR)
	$(CC) $(DEMO_OBJECTS) $(ISOLATED_LIB) $(LDFLAGS) -o $@

# Test executable
$(TEST_EXECUTABLE): $(TEST_OBJECTS) $(ISOLATED_LIB) | $(BUILD_DIR)
	$(CC) $(TEST_OBJECTS) $(ISOLATED_LIB) $(LDFLAGS) -o $@

# Object file compilation with proper dependency handling
$(BUILD_DIR)/%.o: %.c | $(BUILD_DIR)
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

# Create build directory
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# Testing targets
test: $(TEST_EXECUTABLE)
	$(TEST_EXECUTABLE) component

test-demo: $(DEMO_EXECUTABLE)
	$(DEMO_EXECUTABLE) --test-components
	$(DEMO_EXECUTABLE) --test-gates

test-isolated: $(TEST_EXECUTABLE)
	@echo "Running isolated system tests..."
	$(TEST_EXECUTABLE) component

test-preflight: $(DEMO_EXECUTABLE)
	@echo "Running preflight validation..."
	$(DEMO_EXECUTABLE) --test-components

test-clock-enhanced: $(DEMO_EXECUTABLE)
	@echo "Running enhanced clock tests..."
	$(DEMO_EXECUTABLE) --test-gates

# Clean targets
clean:
	rm -rf $(BUILD_DIR)

clean-objects:
	find $(BUILD_DIR) -name "*.o" -delete

# Installation targets
install: release
	@echo "Installing OBINexus DOP components..."
	install -d /usr/local/lib
	install -d /usr/local/include/obinexus
	install $(ISOLATED_LIB) /usr/local/lib/
	install $(DEMO_EXECUTABLE) /usr/local/bin/
	install $(INCLUDE_DIR)/*.h /usr/local/include/obinexus/

uninstall:
	rm -f /usr/local/lib/libobinexus_dop_isolated.a
	rm -f /usr/local/bin/dop_demo
	rm -rf /usr/local/include/obinexus

# Help target
help:
	@echo "OBINexus Taxonomy-Based Build System"
	@echo "Available targets:"
	@echo "  all              - Build debug version (default)"
	@echo "  debug            - Build debug version with taxonomy support"
	@echo "  release          - Build optimized release version"
	@echo "  stress           - Build stress testing version"
	@echo "  test             - Run basic component tests"
	@echo "  test-demo        - Run demo application tests"
	@echo "  test-isolated    - Run isolated system tests"
	@echo "  test-preflight   - Run preflight validation"
	@echo "  test-clock-enhanced - Run enhanced clock tests"
	@echo "  clean            - Remove all build artifacts"
	@echo "  install          - Install system-wide"
	@echo "  uninstall        - Remove system installation"
	@echo "  help             - Show this help message"

# Declare phony targets
.PHONY: all debug release 
stress test test-demo 
test-isolated 
test-preflight 
test-clock-enhanced clean 
clean-objects install 
uninstall help
