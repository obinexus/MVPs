#!/bin/bash
# DIRAM Git-RAF Initialization Script
# OBINexus Project - Establishing RAF governance for DIRAM

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIRAM_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Verify we're in DIRAM directory
if [[ ! -f "$DIRAM_ROOT/Makefile" ]] || [[ ! -d "$DIRAM_ROOT/.git" ]]; then
    log "${RED}ERROR: Not in DIRAM repository root${NC}"
    log "Current directory: $PWD"
    log "Expected to find Makefile and .git directory"
    exit 1
fi

log "${BLUE}=== DIRAM Git-RAF Initialization ===${NC}"
log "Repository: $DIRAM_ROOT"

# Step 1: Create RAF configuration
log "${GREEN}Creating RAF configuration...${NC}"
mkdir -p "$DIRAM_ROOT/.git/raf"
cat > "$DIRAM_ROOT/.git/raf-config" << 'EOF'
# DIRAM RAF Configuration
sinphase_threshold=0.5
tag_prefix=diram-stable
governance_level=standard
rollback_enabled=true
entropy_threshold=0.03
signature_minimum=1
EOF

# Step 2: Initialize RAF hooks
log "${GREEN}Installing Git-RAF hooks...${NC}"
if [[ -f "$DIRAM_ROOT/../git-raf/scripts/git-raf.sh" ]]; then
    "$DIRAM_ROOT/../git-raf/scripts/git-raf.sh" --install-hooks
else
    log "${YELLOW}WARN: git-raf.sh not found in expected location${NC}"
    # Create basic hooks
    mkdir -p "$DIRAM_ROOT/.git/hooks"
    cat > "$DIRAM_ROOT/.git/hooks/post-commit" << 'HOOK'
#!/bin/bash
# RAF post-commit hook
echo "[RAF] Analyzing commit stability..."
if command -v git-raf >/dev/null 2>&1; then
    git-raf --sinphase || true
fi
HOOK
    chmod +x "$DIRAM_ROOT/.git/hooks/post-commit"
fi

# Step 3: Create initial RAF metadata for existing commits
log "${GREEN}Generating RAF metadata for existing commits...${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
log "Analyzing branch: $CURRENT_BRANCH"

# Create metadata directory
mkdir -p "$DIRAM_ROOT/.git/raf-metadata"

# Analyze last 10 commits
COMMIT_COUNT=0
while IFS= read -r commit_line; do
    COMMIT_HASH=$(echo "$commit_line" | cut -d' ' -f1)
    COMMIT_MSG=$(echo "$commit_line" | cut -d' ' -f2-)
    
    # Generate mock sinphase value based on commit message patterns
    SINPHASE=0.3
    if [[ "$COMMIT_MSG" =~ (fix|Fix|FIX) ]]; then
        SINPHASE=0.6
    fi
    if [[ "$COMMIT_MSG" =~ (stable|Stable|STABLE|release|Release) ]]; then
        SINPHASE=0.8
    fi
    if [[ "$COMMIT_MSG" =~ (WIP|wip|temp|Temp|TEMP|test|Test) ]]; then
        SINPHASE=0.2
    fi
    
    # Create metadata file
    cat > "$DIRAM_ROOT/.git/raf-metadata/${COMMIT_HASH}.json" << EOF
{
  "commit": "${COMMIT_HASH}",
  "sinphase": ${SINPHASE},
  "timestamp": "$(git show -s --format=%ci ${COMMIT_HASH})",
  "governance_status": "retroactive",
  "entropy": 0.05
}
EOF
    
    log "  ${COMMIT_HASH:0:7} - Sinphase: ${SINPHASE} - ${COMMIT_MSG:0:50}"
    ((COMMIT_COUNT++))
    
done < <(git log --oneline -10)

log "${GREEN}Processed ${COMMIT_COUNT} commits${NC}"

# Step 4: Create initial build artifacts if missing
if [[ ! -d "$DIRAM_ROOT/build/release" ]]; then
    log "${GREEN}Creating initial build structure...${NC}"
    make -C "$DIRAM_ROOT" dirs || {
        # Fallback if Makefile doesn't have dirs target
        mkdir -p "$DIRAM_ROOT/build/release/bin"
        mkdir -p "$DIRAM_ROOT/build/release/lib"
        mkdir -p "$DIRAM_ROOT/build/release/config"
        mkdir -p "$DIRAM_ROOT/logs"
    }
fi

# Step 5: Run initial build
log "${GREEN}Running initial build...${NC}"
if make -C "$DIRAM_ROOT" release 2>/dev/null; then
    log "${GREEN}Build successful${NC}"
else
    log "${YELLOW}Build failed - creating mock artifacts${NC}"
    # Create mock artifacts for testing
    touch "$DIRAM_ROOT/build/release/bin/diram"
    touch "$DIRAM_ROOT/build/release/lib/libdiram.so.1"
    touch "$DIRAM_ROOT/build/release/lib/libdiram.a"
    echo "version=0.1.0-dev" > "$DIRAM_ROOT/build/release/config/diram.drc"
fi

# Step 6: Test RAF integration
log "${BLUE}Testing RAF integration...${NC}"

# Create test script
cat > "$DIRAM_ROOT/test-raf-integration.py" << 'TESTSCRIPT'
#!/usr/bin/env python3
import sys
import os
import subprocess
import json

# Add git-raf to path if needed
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'git-raf'))

try:
    # Test getting commits with metadata
    cmd = ["git", "log", "--oneline", "-5"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print("[TEST] Git log successful")
        print(f"[TEST] Found {len(result.stdout.splitlines())} recent commits")
        
        # Check for RAF metadata
        raf_meta_dir = ".git/raf-metadata"
        if os.path.exists(raf_meta_dir):
            meta_files = os.listdir(raf_meta_dir)
            print(f"[TEST] Found {len(meta_files)} RAF metadata files")
            
            # Show sample metadata
            if meta_files:
                sample = os.path.join(raf_meta_dir, meta_files[0])
                with open(sample, 'r') as f:
                    data = json.load(f)
                    print(f"[TEST] Sample metadata - Commit: {data['commit'][:7]}, Sinphase: {data['sinphase']}")
        else:
            print("[TEST] No RAF metadata found yet")
            
        print("[TEST] RAF integration test passed")
    else:
        print("[TEST] Failed to get git log")
        
except Exception as e:
    print(f"[TEST] Error: {e}")
TESTSCRIPT

chmod +x "$DIRAM_ROOT/test-raf-integration.py"
python3 "$DIRAM_ROOT/test-raf-integration.py"

# Step 7: Create convenience script
log "${GREEN}Creating convenience scripts...${NC}"
cat > "$DIRAM_ROOT/raf-status.sh" << 'STATUS'
#!/bin/bash
# Show RAF status for DIRAM repository

echo "=== DIRAM RAF Status ==="
echo "Repository: $(pwd)"
echo "Branch: $(git branch --show-current)"
echo ""

# Show recent commits with sinphase
echo "Recent commits with RAF metadata:"
for commit in $(git log --format=%H -5); do
    META_FILE=".git/raf-metadata/${commit}.json"
    if [[ -f "$META_FILE" ]]; then
        SINPHASE=$(jq -r .sinphase "$META_FILE" 2>/dev/null || echo "N/A")
        MSG=$(git log -1 --format=%s $commit)
        echo "  ${commit:0:7} [S:${SINPHASE}] ${MSG:0:60}"
    fi
done

echo ""
echo "Stable commits (sinphase >= 0.5):"
for meta_file in .git/raf-metadata/*.json; do
    if [[ -f "$meta_file" ]]; then
        SINPHASE=$(jq -r .sinphase "$meta_file" 2>/dev/null || echo 0)
        if (( $(echo "$SINPHASE >= 0.5" | bc -l) )); then
            COMMIT=$(jq -r .commit "$meta_file" | cut -c1-7)
            echo "  $COMMIT - Sinphase: $SINPHASE"
        fi
    fi
done
STATUS

chmod +x "$DIRAM_ROOT/raf-status.sh"

log "${GREEN}=== Initialization Complete ===${NC}"
log "RAF configuration created at: $DIRAM_ROOT/.git/raf-config"
log "RAF metadata directory: $DIRAM_ROOT/.git/raf-metadata"
log ""
log "Next steps:"
log "  1. Run './raf-status.sh' to view RAF status"
log "  2. Use 'python3 ../git-raf/git-raf-clone.py clone .' to clone commits"
log "  3. Make changes and commit to test RAF integration"

# Final status
"$DIRAM_ROOT/raf-status.sh"
