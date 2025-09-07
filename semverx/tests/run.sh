#!/bin/bash
# SemVerX Runtime Test Script

echo "=== Testing SemVerX Components ==="

# Test 1: Run executable with proper library path
echo -e "\n1. Testing C executable..."
if [ -f "./bin/semverx" ]; then
    LD_LIBRARY_PATH=./lib:./build ./bin/semverx "1.2.3-stable"
    if [ $? -eq 0 ]; then
        echo "✅ C executable works!"
    else
        echo "❌ C executable failed"
    fi
else
    echo "❌ Executable not found"
fi

# Test 2: Test Python DAG resolver
echo -e "\n2. Testing Python DAG resolver..."
if [ -f "./dag.py" ]; then
    python3 -c "
import sys
sys.path.insert(0, '.')
from dag import SemVerXResolver
print('✅ Python import successful!')
resolver = SemVerXResolver()
print('✅ DAG resolver instantiated!')
"
else
    echo "❌ dag.py not found"
fi

# Test 3: Run Python tests
echo -e "\n3. Running Python tests..."
if [ -f "./tests/test_dag.py" ]; then
    PYTHONPATH=. python3 tests/test_dag.py
    if [ $? -eq 0 ]; then
        echo "✅ Python tests passed!"
    else
        echo "❌ Python tests failed"
    fi
else
    echo "❌ test_dag.py not found"
fi

# Test 4: Check library dependencies
echo -e "\n4. Checking library dependencies..."
echo "Executable dependencies:"
ldd ./bin/semverx | grep -E "(libsemverx|not found)"

echo -e "\n5. Library locations:"
find . -name "libsemverx.*" -type f 2>/dev/null

echo -e "\n=== Summary ==="
echo "To run the executable directly, use:"
echo "  LD_LIBRARY_PATH=./lib ./bin/semverx <version>"
echo ""
echo "To run Python tests, use:"
echo "  PYTHONPATH=. python3 tests/test_dag.py"
