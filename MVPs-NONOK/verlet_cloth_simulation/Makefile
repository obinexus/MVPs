# Makefile for OBINexus Quantum Cloth Simulation
CC = gcc
CXX = g++
CFLAGS = -Wall -g -pthread -D_GNU_SOURCE
CXXFLAGS = -Wall -g -std=c++17 -pthread

# SDL2 configuration
SDL2_CFLAGS := $(shell sdl2-config --cflags 2>/dev/null)
SDL2_LIBS := $(shell sdl2-config --libs 2>/dev/null)

ifeq ($(SDL2_LIBS),)
    $(error SDL2 not found. Install with: sudo apt install libsdl2-dev)
endif

CFLAGS += $(SDL2_CFLAGS)
LDFLAGS = $(SDL2_LIBS) -lpthread -lm

# Directories
BUILD_DIR = build
BIN_DIR = $(BUILD_DIR)/bin
OBJ_DIR = $(BUILD_DIR)/obj

# Source files
C_SOURCES = cloth_simulation.c main.c
CPP_SOURCES = OBINexusIntegration.cpp QuatumClothSimulation.cpp

# Object files
C_OBJECTS = $(patsubst %.c,$(OBJ_DIR)/%.o,$(C_SOURCES))
CPP_OBJECTS = $(patsubst %.cpp,$(OBJ_DIR)/%.o,$(CPP_SOURCES))
ALL_OBJECTS = $(C_OBJECTS) $(CPP_OBJECTS)

# Targets
TARGET = $(BIN_DIR)/obinexus_cloth
DETACHED_TARGET = $(BIN_DIR)/obinexus_cloth_detached

.PHONY: all clean detach check-deps

all: check-deps $(TARGET) $(DETACHED_TARGET)

# Check dependencies
check-deps:
	@echo "Checking SDL2 installation..."
	@which sdl2-config > /dev/null || (echo "ERROR: SDL2 not found" && exit 1)
	@echo "SDL2 found: $(SDL2_CFLAGS)"

# Create directories
$(BUILD_DIR) $(BIN_DIR) $(OBJ_DIR):
	mkdir -p $@

# Compile C files
$(OBJ_DIR)/%.o: %.c | $(OBJ_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

# Compile C++ files
$(OBJ_DIR)/%.o: %.cpp | $(OBJ_DIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Link main executable
$(TARGET): $(ALL_OBJECTS) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

# Create detached version
$(DETACHED_TARGET): $(TARGET)
	cp $(TARGET) $(DETACHED_TARGET)
	chmod +x $(DETACHED_TARGET)

# Run detached
detach: $(DETACHED_TARGET)
	@echo "Launching OBINexus Cloth Simulation in detached mode..."
	./$(DETACHED_TARGET) --detach --fork-mode=thread --pid-transfer=child

clean:
	rm -rf $(BUILD_DIR)

# Install SDL2 dependencies (Debian/Ubuntu/WSL)
deps:
	sudo apt update
	sudo apt install -y libsdl2-dev libsdl2-2.0-0
	@echo "SDL2 installed successfully"

# WSL-specific setup
wsl-setup:
	@echo "Setting up WSL environment..."
	@echo "export DISPLAY=\$$(cat /etc/resolv.conf | grep nameserver | awk '{print \$$2}'):0" >> ~/.bashrc
	@echo "WSL display configured. Restart terminal or run: source ~/.bashrc"

# Debug build
debug: CFLAGS += -DDEBUG -O0
debug: CXXFLAGS += -DDEBUG -O0
debug: all

# Release build
release: CFLAGS += -O3 -DNDEBUG
release: CXXFLAGS += -O3 -DNDEBUG
release: all
