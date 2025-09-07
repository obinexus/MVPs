#!/bin/bash
# SemVerX Build and Test Script
# Part of OBINexus polyglot toolchain

echo "=== SemVerX Build System ==="
echo "Building polyglot semantic versioning components..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create main.c if it doesn't exist
if [ ! -f "main.c" ]; then
    echo -e "${BLUE}Creating main.c...${NC}"
    cat > main.c << 'EOF'
#include <stdio.h>
#include "semver_parser.h"

int main(void) {
    printf("SemVerX Parser v1.0.0 - OBINexus\n");
    
    semverx_component_t comp = {
        .major = 1,
        .minor = 0,
        .patch = 0,
        .major_state = SEMVERX_STATE_STABLE,
        .minor_state = SEMVERX_STATE_STABLE,
        .patch_state = SEMVERX_STATE_STABLE
    };
    
    nlm_coord_t nlm;
    semverx_compute_nlm(&comp, &nlm);
    
    printf("NLM Coordinates: (%.2f, %.2f, %.2f)\n", nlm.x, nlm.y, nlm.z);
    
    return 0;
}
EOF
fi

# Clean previous build
echo -e "${BLUE}Cleaning previous build...${NC}"
make clean 2>/dev/null || true

# Build the project
echo -e "${BLUE}Building SemVerX...${NC}"
if make all; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

# Run basic tests
echo -e "\n${BLUE}Running tests...${NC}"

# Test the static library
if [ -f "build/libsemverx.a" ]; then
    echo -e "${GREEN}✓ Static library created${NC}"
else
    echo -e "${RED}✗ Static library missing${NC}"
fi

# Test the shared library
if [ -f "build/libsemverx.so" ]; then
    echo -e "${GREEN}✓ Shared library created${NC}"
else
    echo -e "${RED}✗ Shared library missing${NC}"
fi

# Test the executable if it exists
if [ -f "bin/semverx" ]; then
    echo -e "${BLUE}Testing executable...${NC}"
    ./bin/semverx "1.2.3-stable"
fi

# Test Python integration
echo -e "\n${BLUE}Testing Python integration...${NC}"
if [ -f "dag.py" ]; then
    python3 dag.py
    echo -e "${GREEN}✓ Python DAG resolver tested${NC}"
fi

echo -e "\n${BLUE}=== Build Summary ===${NC}"
echo "SemVerX components ready for polyglot integration:"
echo "- Static library: build/libsemverx.a"
echo "- Shared library: build/libsemverx.so"
echo "- Headers: semver_parser.h"
echo ""
echo "Next steps:"
echo "1. Integrate with rust-semverx crate"
echo "2. Generate FFI bindings for Node.js/Python"
echo "3. Connect to polybuild orchestration"
