# SemVerX Build System
CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11 -I. -lm
PYTHON = python3
CARGO = cargo

# Directories
BUILD_DIR = build
TEST_DIR = tests
RUST_DIR = rust-semverx

# C Sources
C_SOURCES = semverx_parser.c
C_OBJECTS = $(C_SOURCES:%.c=$(BUILD_DIR)/%.o)
C_TARGET = $(BUILD_DIR)/libsemverx.a

# Python Sources
PY_SOURCES = dag.py

# Default target
all: c python validate

# Create build directory
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# C Library
c: $(BUILD_DIR) $(C_TARGET)

$(C_TARGET): $(C_OBJECTS)
	ar rcs $@ $^

$(BUILD_DIR)/%.o: %.c semverx_parser.h
	$(CC) $(CFLAGS) -c $< -o $@

# Python
python:
	$(PYTHON) -m py_compile $(PY_SOURCES)

# Rust (if rust-semverx exists)
rust:
	@if [ -d "$(RUST_DIR)" ]; then \
		cd $(RUST_DIR) && $(CARGO) build --release; \
	fi

# Validate JSON files
validate:
	@echo "Validating JSON schemas..."
	@$(PYTHON) -m json.tool schema.json > /dev/null || echo "schema.json invalid"
	@$(PYTHON) -m json.tool hot_swappable.json > /dev/null || echo "hot_swappable.json invalid"

# Tests
test: test-c test-python

test-c: c
	@echo "Running C tests..."
	@if [ -f "$(TEST_DIR)/test_semverx.c" ]; then \
		$(CC) $(CFLAGS) $(TEST_DIR)/test_semverx.c $(C_TARGET) -o $(BUILD_DIR)/test_semverx && \
		$(BUILD_DIR)/test_semverx; \
	fi

test-python:
	@echo "Running Python tests..."
	$(PYTHON) -m pytest tests/ -v || $(PYTHON) -m unittest discover -s tests

# Documentation
docs:
	doxygen Doxyfile || echo "Doxygen not found"
	$(PYTHON) -m pydoc -w dag

# Installation
install: all
	install -d /usr/local/lib /usr/local/include/semverx
	install -m 644 $(C_TARGET) /usr/local/lib/
	install -m 644 semverx_parser.h /usr/local/include/semverx/
	install -m 755 dag.py /usr/local/bin/semverx-dag

# Clean
clean:
	rm -rf $(BUILD_DIR) __pycache__ *.pyc
	@if [ -d "$(RUST_DIR)" ]; then \
		cd $(RUST_DIR) && $(CARGO) clean; \
	fi

# Development helpers
format:
	clang-format -i *.c *.h
	black *.py

lint:
	cppcheck --enable=all *.c
	pylint *.py

# Git helpers
push-mvps:
	git add .
	git commit -m "SemVerX: DAG resolver + NLM integration"
	git push origin main

push-rust:
	@if [ -d "../rust-semverx" ]; then \
		cd ../rust-semverx && \
		git add . && \
		git commit -m "SemVerX: Rust implementation update" && \
		git push origin main; \
	fi

.PHONY: all c python rust validate test test-c test-python docs install clean format lint push-mvps push-rust
