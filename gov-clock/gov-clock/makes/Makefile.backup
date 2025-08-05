
// ==============================================================================
// Enhanced Makefile with Taxonomy Support
# Makefile.taxonomy
# ==============================================================================

# OBINexus Taxonomy-Based Makefile
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

# Taxonomy-Based Source Groups
ISOLATED_SOURCES = $(SRC_DIR)/obinexus_dop_core.c $(SRC_DIR)/components/alarm.c $(SRC_DIR)/components/clock.c $(SRC_DIR)/components/stopwatch.c $(SRC_DIR)/components/timer.c $(SRC_DIR)/taxonomy_testing.c
CLOSED_SOURCES = $(SRC_DIR)/dop_adapter.c $(SRC_DIR)/dop_topology.c
OPEN_SOURCES = $(SRC_DIR)/dop_manifest.c

# Build Targets
ISOLATED_LIB = $(BUILD_DIR)/libobinexus_dop_isolated.a
CLOSED_LIB = $(BUILD_DIR)/libobinexus_dop_closed.a
OPEN_LIB = $(BUILD_DIR)/libobinexus_dop_open.a

# Test Executables
TEST_ISOLATED = $(BUILD_DIR)/test_isolated
TEST_CLOSED = $(BUILD_DIR)/test_closed
TEST_OPEN = $(BUILD_DIR)/test_open
PREFLIGHT_SUITE = $(BUILD_DIR)/preflight_suite
CLOCK_ENHANCED = $(BUILD_DIR)/clock_enhanced_test

# Default target
all: debug

# Debug build with taxonomy support
debug: CFLAGS := $(DEBUG_CFLAGS)
debug: taxonomy-libs taxonomy-tests

# Release build
release: CFLAGS := $(RELEASE_CFLAGS)
release: taxonomy-libs

# Stress testing build
stress: CFLAGS := $(STRESS_CFLAGS)
stress: taxonomy-libs taxonomy-tests

# Taxonomy library targets
taxonomy-libs: $(ISOLATED_LIB) $(CLOSED_LIB) $(OPEN_LIB)

# Taxonomy test targets
taxonomy-tests: $(TEST_ISOLATED) $(TEST_CLOSED) $(TEST_OPEN) $(PREFLIGHT_SUITE) $(CLOCK_ENHANCED)

# Isolated system library (no external dependencies)
$(ISOLATED_LIB): $(ISOLATED_SOURCES:%.c=$(BUILD_DIR)/%.o) | $(BUILD_DIR)
	ar rcs $@ $^

# Closed system library (limited internal dependencies)
$(CLOSED_LIB): $(CLOSED_SOURCES:%.c=$(BUILD_DIR)/%.o) $(ISOLATED_LIB) | $(BUILD_DIR)
	ar rcs $@ $(CLOSED_SOURCES:%.c=$(BUILD_DIR)/%.o)

# Open system library (CLI exposed)
$(OPEN_LIB): $(OPEN_SOURCES:%.c=$(BUILD_DIR)/%.o) $(CLOSED_LIB) $(ISOLATED_LIB) | $(BUILD_DIR)
	ar rcs $@ $(OPEN_SOURCES:%.c=$(BUILD_DIR)/%.o)

# Test executables
$(TEST_ISOLATED): $(TEST_DIR)/test_isolated.c $(ISOLATED_LIB) | $(BUILD_DIR)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -DTEST_ISOLATION_LEVEL=1 $< $(ISOLATED_LIB) $(LDFLAGS) -o $@

$(TEST_CLOSED): $(TEST_DIR)/test_closed.c $(CLOSED_LIB) $(ISOLATED_LIB) | $(BUILD_DIR)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -DTEST_ISOLATION_LEVEL=2 $< $(CLOSED_LIB) $(ISOLATED_LIB) $(LDFLAGS) -o $@

$(TEST_OPEN): $(TEST_DIR)/test_open.c $(OPEN_LIB) $(CLOSED_LIB) $(ISOLATED_LIB) | $(BUILD_DIR)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -DTEST_ISOLATION_LEVEL=3 $< $(OPEN_LIB) $(CLOSED_LIB) $(ISOLATED_LIB) $(LDFLAGS) -o $@

$(PREFLIGHT_SUITE): $(TEST_DIR)/preflight_suite.c $(OPEN_LIB) $(CLOSED_LIB) $(ISOLATED_LIB) | $(BUILD_DIR)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -DPREFLIGHT_ENABLED=1 $< $(OPEN_LIB) $(CLOSED_LIB) $(ISOLATED_LIB) $(LDFLAGS) -o $@

$(CLOCK_ENHANCED): $(TEST_DIR)/clock_enhanced_test.c $(ISOLATED_LIB) | $(BUILD_DIR)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -DCLOCK_ENHANCED_TESTING=1 $< $(ISOLATED_LIB) $(LDFLAGS) -o $@

# Object file compilation
$(BUILD_DIR)/%.o: %.c | $(BUILD_DIR)
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# Taxonomy testing targets
test-isolated: $(TEST_ISOLATED)
	@echo "Running isolated system tests..."
	$(TEST_ISOLATED) --preflight
	$(TEST_ISOLATED) --memory-only
	$(TEST_ISOLATED) --integrity

test-closed: $(TEST_CLOSED)
	@echo "Running closed system tests..."
	$(TEST_CLOSED) --topology
	$(TEST_CLOSED) --adapter
	$(TEST_CLOSED) --governance

test-open: $(TEST_OPEN)
	@echo "Running open system tests..."
	$(TEST_OPEN) --cli
	$(TEST_OPEN) --manifest
	$(TEST_OPEN) --integration

test-preflight: $(PREFLIGHT_SUITE)
	@echo "Running preflight validation..."
	$(PREFLIGHT_SUITE) --all
	$(PREFLIGHT_SUITE) --memory-load
	$(PREFLIGHT_SUITE) --verify-components

test-clock-enhanced: $(CLOCK_ENHANCED)
	@echo "Running enhanced clock taxonomy tests..."
	$(CLOCK_ENHANCED) --taxonomy
	$(CLOCK_ENHANCED) --isolation
	$(CLOCK_ENHANCED) --preflight

test-stress: $(TEST_ISOLATED) $(TEST_CLOSED) $(TEST_OPEN)
	@echo "Running stress tests across all taxonomy levels..."
	$(TEST_ISOLATED) --stress
	$(TEST_CLOSED) --stress
	$(TEST_OPEN) --stress

# Production readiness validation
test-production: $(PREFLIGHT_SUITE)
	@echo "Running production readiness validation..."
	$(PREFLIGHT_SUITE) --production-ready

# Clean targets
clean:
	rm -rf $(BUILD_DIR)

clean-isolated:
	rm -f $(ISOLATED_LIB) $(TEST_ISOLATED)

clean-closed:
	rm -f $(CLOSED_LIB) $(TEST_CLOSED)

clean-open:
	rm -f $(OPEN_LIB) $(TEST_OPEN)

# Help target
help:
	@echo "OBINexus Taxonomy-Based Build System"
	@echo "Available targets:"
	@echo "  all              - Build debug version with taxonomy support"
	@echo "  debug            - Build debug version"
	@echo "  release          - Build release version"
	@echo "  stress           - Build stress testing version"
	@echo "  taxonomy-libs    - Build all taxonomy libraries"
	@echo "  taxonomy-tests   - Build all taxonomy tests"
	@echo "  test-isolated    - Run isolated system tests"
	@echo "  test-closed      - Run closed system tests"
	@echo "  test-open        - Run open system tests"
	@echo "  test-preflight   - Run preflight validation"
	@echo "  test-clock-enhanced - Run enhanced clock tests"
	@echo "  test-stress      - Run stress tests"
	@echo "  test-production  - Run production readiness validation"
	@echo "  clean            - Clean all build artifacts"

.PHONY: all debug release stress taxonomy-libs taxonomy-tests test-isolated test-closed test-open test-preflight test-clock-enhanced test-stress test-production clean help
