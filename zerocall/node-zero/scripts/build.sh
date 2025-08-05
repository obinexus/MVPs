#!/bin/bash
# build.sh - Build script for Node-Zero

set -e # Exit on any error

# Print colored messages
function print_step() {
  echo -e "\e[1;34m===> $1\e[0m"
}

function print_success() {
  echo -e "\e[1;32m===> $1\e[0m"
}

function print_error() {
  echo -e "\e[1;31m===> ERROR: $1\e[0m"
}

# Check if the script is running from the project root
if [ ! -f "package.json" ]; then
  print_error "Please run this script from the project root directory"
  exit 1
fi

# Start the build process
print_step "Starting Node-Zero build process"

# Clean up previous build artifacts
print_step "Cleaning up previous build"
rm -rf dist || true
mkdir -p dist/cjs
mkdir -p dist/esm

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "$1" == "--fresh" ]; then
  print_step "Installing dependencies"
  npm ci
fi

# Run the TypeScript compiler
print_step "Compiling TypeScript"
npx tsc --project tsconfig.json
npx tsc --project tsconfig.esm.json

# Copy package.json and adjust for build
print_step "Preparing package files"
cp package.json dist/
# Update package.json in dist to include correct paths and types
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./dist/package.json', 'utf8'));
pkg.main = 'cjs/index.js';
pkg.module = 'esm/index.js';
pkg.types = 'cjs/index.d.ts';
pkg.type = 'module';
pkg.exports = {
  '.': {
    'import': './esm/index.js',
    'require': './cjs/index.js',
    'types': './cjs/index.d.ts'
  }
};
fs.writeFileSync('./dist/package.json', JSON.stringify(pkg, null, 2));
"

# Copy other necessary files
print_step "Copying additional files"
cp README.md dist/ || echo "No README.md found"
cp LICENSE dist/ || echo "No LICENSE found"

# Create required binary files
print_step "Setting up bin files"
mkdir -p bin
cat > bin/zero.js << 'EOL'
#!/usr/bin/env node
/**
 * Zero Knowledge Proof CLI
 * 
 * Command-line interface for the Zero library
 * providing ID creation, verification, and ZKP operations.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

// Set up module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import the required modules
import { runCliApp } from '../dist/esm/cli/index.js';

// Run the CLI application
async function main() {
  try {
    await runCliApp();
  } catch (err) {
    console.error(`Error starting Zero CLI: ${err.message}`);
    process.exit(1);
  }
}

main();
EOL

# Make the bin file executable
chmod +x bin/zero.js

# Update the main package.json to include the bin
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
if (!pkg.bin) pkg.bin = {};
pkg.bin.zero = './bin/zero.js';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

# Add tsconfig.esm.json if it doesn't exist
if [ ! -f "tsconfig.esm.json" ]; then
  print_step "Creating tsconfig.esm.json"
  cat > tsconfig.esm.json << 'EOL'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "dist/esm",
    "declaration": false
  }
}
EOL
fi

# Test the build
print_step "Running build verification tests"
if [ -f "dist/cjs/index.js" ] && [ -f "dist/esm/index.js" ]; then
  print_success "Build appears successful"
else
  print_error "Build verification failed - key files are missing"
  exit 1
fi

# Link for development if requested
if [ "$1" == "--link" ] || [ "$2" == "--link" ]; then
  print_step "Creating global symlink for development"
  npm link
  print_success "Linked package globally, you can now use 'zero' command"
fi

print_success "Build completed successfully!"
echo "You can now install the package with:"
echo "  npm install -g ."
echo "Or use it directly with:"
echo "  npx zero"