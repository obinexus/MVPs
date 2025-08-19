#!/bin/bash

# Script to clean up and fix duplicate files in the NexusSearch project

# Set colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Cleaning up NexusSearch project...${NC}"

# Remove duplicate CacheManager files
echo -e "${YELLOW}Removing duplicate CacheManager files...${NC}"
if [ -f "src/core/storage/CacheManager2.ts" ]; then
  rm src/core/storage/CacheManager2.ts
  echo -e "${GREEN}✓ Removed CacheManager2.ts${NC}"
fi

# Remove duplicate IndexedDocument files
echo -e "${YELLOW}Removing duplicate IndexedDocument files...${NC}"
if [ -f "src/core/storage/IndexedDocument2.ts" ]; then
  rm src/core/storage/IndexedDocument2.ts
  echo -e "${GREEN}✓ Removed IndexedDocument2.ts${NC}"
fi

# Remove IndexDCacheAdapter.ts which seems to be a misspelled file
echo -e "${YELLOW}Removing typo files...${NC}"
if [ -f "src/core/storage/IndexDCacheAdapter.ts" ]; then
  rm src/core/storage/IndexDCacheAdapter.ts
  echo -e "${GREEN}✓ Removed IndexDCacheAdapter.ts${NC}"
fi

# Create directories if they don't exist
echo -e "${YELLOW}Ensuring directory structure...${NC}"
mkdir -p src/storage

# Create symlink from src/storage to src/core/storage for backward compatibility
echo -e "${YELLOW}Setting up compatibility symlinks...${NC}"
if [ ! -f "src/storage/CacheManager.ts" ]; then
  cat > src/storage/CacheManager.ts << 'EOL'
// src/storage/CacheManager.ts
// This file re-exports the CacheManager from src/core/storage/CacheManager
export * from '../core/storage/CacheManager';
export { CacheManager as default } from '../core/storage/CacheManager';
EOL
  echo -e "${GREEN}✓ Created CacheManager.ts compatibility export${NC}"
fi

if [ ! -f "src/storage/index.ts" ]; then
  cat > src/storage/index.ts << 'EOL'
// src/storage/index.ts
// This file re-exports the storage modules from src/core/storage
export * from '../core/storage';
EOL
  echo -e "${GREEN}✓ Created storage/index.ts compatibility export${NC}"
fi

# Check if node_modules exists and run npm install if not
echo -e "${YELLOW}Ensuring dependencies are installed...${NC}"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Run the build to verify fixes
echo -e "${YELLOW}Running build to verify fixes...${NC}"
npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build successful! All issues fixed.${NC}"
else
  echo -e "${RED}⨯ Build failed. Please check the error messages.${NC}"
fi

echo -e "${GREEN}Cleanup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. If any build errors remain, check the specific import paths causing issues"
echo -e "  2. Try running the tests with 'npm test' to ensure everything works correctly"
echo -e "  3. Run the IoC test script with 'npx ts-node tests/ioc-test.ts' if you set up IoC"