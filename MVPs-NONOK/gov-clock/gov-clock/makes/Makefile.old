# OBINexus DOP Components Makefile
CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wpedantic -pthread
LDFLAGS = -pthread -lxml2

DEBUG_CFLAGS = $(CFLAGS) -g -O0 -DDOP_DEBUG=1
RELEASE_CFLAGS = $(CFLAGS) -O3 -DNDEBUG -DDOP_RELEASE=1

SRC_DIR = src
INCLUDE_DIR = include
BUILD_DIR = build
TEST_DIR = tests
DEMO_DIR = src/demo

CORE_SOURCES = $(wildcard $(SRC_DIR)/*.c) $(wildcard $(SRC_DIR)/components/*.c)
TEST_SOURCES = $(wildcard $(TEST_DIR)/*.c)
DEMO_SOURCES = $(wildcard $(DEMO_DIR)/*.c)

CORE_OBJECTS = $(CORE_SOURCES:%.c=$(BUILD_DIR)/%.o)
TEST_OBJECTS = $(TEST_SOURCES:%.c=$(BUILD_DIR)/%.o)
DEMO_OBJECTS = $(DEMO_SOURCES:%.c=$(BUILD_DIR)/%.o)

STATIC_LIB = $(BUILD_DIR)/libobinexus_dop_core.a
DEMO_EXECUTABLE = $(BUILD_DIR)/dop_demo
TEST_EXECUTABLE = $(BUILD_DIR)/dop_tests

all: debug

debug: CFLAGS := $(DEBUG_CFLAGS)
debug: $(STATIC_LIB) $(DEMO_EXECUTABLE) $(TEST_EXECUTABLE)

release: CFLAGS := $(RELEASE_CFLAGS)
release: $(STATIC_LIB) $(DEMO_EXECUTABLE) $(TEST_EXECUTABLE)

$(STATIC_LIB): $(CORE_OBJECTS) | $(BUILD_DIR)
	ar rcs $@ $^

$(DEMO_EXECUTABLE): $(DEMO_OBJECTS) $(STATIC_LIB) | $(BUILD_DIR)
	$(CC) $(DEMO_OBJECTS) $(STATIC_LIB) $(LDFLAGS) -o $@

$(TEST_EXECUTABLE): $(TEST_OBJECTS) $(STATIC_LIB) | $(BUILD_DIR)
	$(CC) $(TEST_OBJECTS) $(STATIC_LIB) $(LDFLAGS) -o $@

$(BUILD_DIR)/%.o: %.c | $(BUILD_DIR)
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

test: $(TEST_EXECUTABLE)
	$(TEST_EXECUTABLE) component

test-p2p: $(DEMO_EXECUTABLE)
	$(DEMO_EXECUTABLE) --test-p2p-fault

validate-manifest: $(DEMO_EXECUTABLE)
	$(DEMO_EXECUTABLE) --validate-manifest

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all debug release test test-p2p validate-manifest clean
