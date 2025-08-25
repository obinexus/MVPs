# Gosilang MVP Makefile
# OBINexus Computing - Thread Safe by Design

CC = gcc
CFLAGS = -Wall -Wextra -std=c11 -D_GNU_SOURCE -D_DEFAULT_SOURCE
CFLAGS += -I./include
LDFLAGS = -lpthread -lssl -lcrypto -lm

# Directories
SRC_DIR = src
INC_DIR = include
BUILD_DIR = build
OBJ_DIR = $(BUILD_DIR)/obj
BIN_DIR = $(BUILD_DIR)/bin
LIB_DIR = $(BUILD_DIR)/lib

# Files
SOURCES = $(wildcard $(SRC_DIR)/*.c)
OBJECTS = $(patsubst $(SRC_DIR)/%.c, $(OBJ_DIR)/%.o, $(SOURCES))
HEADERS = $(wildcard $(INC_DIR)/*.h)
TARGET = $(BIN_DIR)/gosilang

# Default target
all: directories $(TARGET)

# Create directories
directories:
	@mkdir -p $(OBJ_DIR) $(BIN_DIR) $(LIB_DIR)

# Build executable
$(TARGET): $(OBJECTS)
	$(CC) $(OBJECTS) $(LDFLAGS) -o $@
	@echo "Build successful!"
	@echo "Run $(TARGET) to start REPL"

# Compile source files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c $(HEADERS)
	$(CC) $(CFLAGS) -c $< -o $@

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)

# Install (optional)
install: $(TARGET)
	cp $(TARGET) /usr/local/bin/gosilang

# Run tests
test: $(TARGET)
	$(TARGET) < examples/test_aura.gs

.PHONY: all clean directories install test
