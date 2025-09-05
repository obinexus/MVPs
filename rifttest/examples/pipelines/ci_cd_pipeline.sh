#!/bin/bash
# CI/CD Pipeline for RIFT Applications

set -e

echo "=== RIFT CI/CD Pipeline ==="

# Step 1: Compile RIFT code
echo "1. Compiling RIFT application..."
rift.exe compile housing_assist.rift -o build/housing_assist.c

# Step 2: Run QA validation
echo "2. Running QA validation..."
riftest --stage 4 --vector LOVE_SYMBOL --policy housing-rights > qa_results.json

# Check QA results
if grep -q '"qa_bound": "PANIC"' qa_results.json; then
    echo "❌ QA PANIC detected - aborting deployment"
    exit 1
fi

# Step 3: Apply policy seals
echo "3. Applying policy seals..."
cat qa_results.json | riftraf --seal --policy configs/obinexus.json > seal_results.json

# Verify seals
if ! grep -q '"sealed": true' seal_results.json; then
    echo "❌ Policy seal failed - review violations"
    cat seal_results.json
    exit 1
fi

# Step 4: Build final binary
echo "4. Building application..."
gcc -O3 build/housing_assist.c -lrift_runtime -o build/housing_assist

# Step 5: Run integration tests
echo "5. Running integration tests..."
./build/housing_assist --test <<TEST_DATA
{
  "applicant": {
    "name": "Test User",
    "age": 45,
    "housing_status": "street_homeless",
    "disabilities": ["mobility"],
    "dependents": 2
  }
}
TEST_DATA

echo "✅ All checks passed - ready for deployment"
