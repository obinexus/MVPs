#!/bin/bash
# Fix SemVerX header naming inconsistency

echo "🔧 Fixing SemVerX header naming issue..."

# Check current state
if [ -f "semver_parser.h" ] && [ ! -f "semverx_parser.h" ]; then
    echo "Found semver_parser.h but missing semverx_parser.h"
    echo "Renaming semver_parser.h to semverx_parser.h..."
    mv semver_parser.h semverx_parser.h
    echo "✅ Header renamed successfully"
elif [ -f "semverx_parser.h" ]; then
    echo "✅ semverx_parser.h already exists"
else
    echo "❌ No header file found!"
    exit 1
fi

# Clean and rebuild
echo "🧹 Cleaning build directory..."
make clean 2>/dev/null || rm -rf build lib bin

echo "🔨 Building SemVerX..."
make all

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Test the build
    if [ -f "bin/semverx" ]; then
        echo "🧪 Testing executable..."
        ./bin/semverx "1.2.3-stable"
    fi
else
    echo "❌ Build failed. Checking for issues..."
    
    # Debug information
    echo "Files in directory:"
    ls -la *.h *.c
    
    echo -e "\nFirst few lines of semverx_parser.c:"
    head -n 5 semverx_parser.c
fi
