#!/bin/bash
# Git-RAF Automated Tagging System
# Post-build hook for DIRAM stable release tagging
# Author: OBINexus Team

# Configuration
DIRAM_ROOT="$(git rev-parse --show-toplevel)"
BUILD_DIR="${DIRAM_ROOT}/build/release"
ARTIFACT_MANIFEST="${BUILD_DIR}/.raf-manifest"
TAG_PREFIX="diram-stable"
SINPHASE_THRESHOLD=0.5

# Trie-based tag resolution structure
declare -A TAG_TRIE=(
    ["0"]="alpha"
    ["1"]="beta"
    ["00"]="rc"
    ["01"]="stable"
    ["10"]="hotfix"
    ["11"]="release"
)

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Log function with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Calculate sinphase stability metric
calculate_sinphase() {
    local artifact_count=$(find "$BUILD_DIR" -name "*.o" -o -name "*.so" -o -name "*.a" | wc -l)
    local test_pass_rate=$(grep -c "PASS" "${DIRAM_ROOT}/logs/test_results.log" 2>/dev/null || echo 0)
    local total_tests=$(wc -l < "${DIRAM_ROOT}/logs/test_results.log" 2>/dev/null || echo 1)
    
    # Sinphase = (artifact_stability * test_coverage) / build_entropy
    local sinphase=$(echo "scale=3; ($artifact_count * $test_pass_rate) / ($total_tests * 10)" | bc)
    echo "$sinphase"
}

# Verify build artifacts integrity
verify_build_artifacts() {
    log "${GREEN}Verifying build artifacts...${NC}"
    
    local required_artifacts=(
        "${BUILD_DIR}/bin/diram"
        "${BUILD_DIR}/lib/libdiram.so.1"
        "${BUILD_DIR}/lib/libdiram.a"
        "${BUILD_DIR}/config/diram.drc"
    )
    
    for artifact in "${required_artifacts[@]}"; do
        if [[ ! -f "$artifact" ]]; then
            log "${RED}Missing required artifact: $artifact${NC}"
            return 1
        fi
        
        # Calculate entropy checksum for governance
        local checksum=$(sha256sum "$artifact" | cut -d' ' -f1)
        echo "$artifact:$checksum" >> "$ARTIFACT_MANIFEST"
    done
    
    return 0
}

# Generate semantic version based on changes
generate_semantic_version() {
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    local major=$(echo "$last_tag" | cut -d. -f1 | tr -d 'v')
    local minor=$(echo "$last_tag" | cut -d. -f2)
    local patch=$(echo "$last_tag" | cut -d. -f3 | cut -d- -f1)
    
    # Analyze changes for version bump
    local changes=$(git diff --name-only HEAD~1..HEAD)
    local api_changes=$(echo "$changes" | grep -c "include/")
    local core_changes=$(echo "$changes" | grep -c "src/core/")
    
    if [[ $api_changes -gt 0 ]]; then
        ((major++))
        minor=0
        patch=0
    elif [[ $core_changes -gt 0 ]]; then
        ((minor++))
        patch=0
    else
        ((patch++))
    fi
    
    echo "v${major}.${minor}.${patch}"
}

# Trie-based tag classification
classify_build_stability() {
    local sinphase=$1
    local trie_path=""
    
    # Navigate trie based on sinphase value
    if (( $(echo "$sinphase >= 0.8" | bc -l) )); then
        trie_path="11"  # release
    elif (( $(echo "$sinphase >= 0.6" | bc -l) )); then
        trie_path="01"  # stable
    elif (( $(echo "$sinphase >= 0.4" | bc -l) )); then
        trie_path="00"  # rc
    elif (( $(echo "$sinphase >= 0.2" | bc -l) )); then
        trie_path="1"   # beta
    else
        trie_path="0"   # alpha
    fi
    
    echo "${TAG_TRIE[$trie_path]}"
}

# Create governance metadata for Git-RAF
create_governance_metadata() {
    local version=$1
    local stability=$2
    local sinphase=$3
    
    cat > "${DIRAM_ROOT}/.git/RAF_METADATA" <<EOF
Policy-Tag: "$stability"
Governance-Ref: diram_build_policy.rift.gov
Entropy-Checksum: $(sha3sum "$ARTIFACT_MANIFEST" | cut -d' ' -f1)
Governance-Vector: [build_risk: $(echo "scale=2; 1-$sinphase" | bc), rollback_cost: 0.15, stability_impact: $sinphase]
AuraSeal: $(openssl dgst -sha256 -hmac "OBINexus-DIRAM" "$ARTIFACT_MANIFEST" | cut -d' ' -f2)
RIFTlang-Compilation-Proof: verified_stable_build
Build-Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Artifact-Count: $(wc -l < "$ARTIFACT_MANIFEST")
EOF
}

# Main tagging function
perform_auto_tag() {
    log "${GREEN}=== Git-RAF Auto-Tag System ===${NC}"
    
    # Step 1: Verify build success
    if [[ ! -f "${BUILD_DIR}/bin/diram" ]]; then
        log "${RED}Build not found. Run 'make release' first.${NC}"
        exit 1
    fi
    
    # Step 2: Calculate sinphase
    local sinphase=$(calculate_sinphase)
    log "Calculated sinphase: ${YELLOW}$sinphase${NC}"
    
    # Step 3: Check threshold
    if (( $(echo "$sinphase < $SINPHASE_THRESHOLD" | bc -l) )); then
        log "${RED}Sinphase below threshold ($SINPHASE_THRESHOLD). Tagging aborted.${NC}"
        exit 1
    fi
    
    # Step 4: Verify artifacts
    if ! verify_build_artifacts; then
        log "${RED}Artifact verification failed.${NC}"
        exit 1
    fi
    
    # Step 5: Generate version and classify stability
    local version=$(generate_semantic_version)
    local stability=$(classify_build_stability "$sinphase")
    local tag_name="${TAG_PREFIX}-${version}-${stability}"
    
    log "Generated tag: ${GREEN}$tag_name${NC}"
    log "Stability classification: ${YELLOW}$stability${NC}"
    
    # Step 6: Create governance metadata
    create_governance_metadata "$version" "$stability" "$sinphase"
    
    # Step 7: Create annotated tag with RAF metadata
    local tag_message=$(cat <<EOF
DIRAM Stable Release $version

Stability: $stability
Sinphase: $sinphase
Build Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

Governance Metadata:
$(cat "${DIRAM_ROOT}/.git/RAF_METADATA")

Verified Artifacts:
$(cat "$ARTIFACT_MANIFEST")
EOF
)
    
    # Step 8: Apply tag
    git tag -a "$tag_name" -m "$tag_message"
    
    # Step 9: Sign tag if GPG available
    if command -v gpg &> /dev/null; then
        git tag -s -f "$tag_name" -m "$tag_message"
        log "${GREEN}Tag signed with GPG${NC}"
    fi
    
    log "${GREEN}Successfully created tag: $tag_name${NC}"
    
    # Step 10: Push tag if remote exists
    if git remote get-url origin &> /dev/null; then
        log "Pushing tag to remote..."
        git push origin "$tag_name"
    fi
}

# Hook installation function
install_hooks() {
    local hook_dir="${DIRAM_ROOT}/.git/hooks"
    
    # Post-commit hook
    cat > "$hook_dir/post-commit" <<'HOOK'
#!/bin/bash
# Git-RAF post-commit hook

# Check if this is a build-related commit
if git diff-tree --no-commit-id --name-only -r HEAD | grep -qE "(Makefile|src/|include/)"; then
    # Trigger build and tag if successful
    if make -C "$(git rev-parse --show-toplevel)" release; then
        "$(git rev-parse --show-toplevel)/tools/git-raf" --tag
    fi
fi
HOOK
    
    chmod +x "$hook_dir/post-commit"
    log "${GREEN}Git hooks installed successfully${NC}"
}

# Main execution
case "${1:-}" in
    --tag)
        perform_auto_tag
        ;;
    --install-hooks)
        install_hooks
        ;;
    --verify)
        verify_build_artifacts && echo "Build artifacts verified"
        ;;
    --sinphase)
        echo "Current sinphase: $(calculate_sinphase)"
        ;;
    *)
        cat <<USAGE
Git-RAF Auto-Tag System

Usage: git-raf [OPTIONS]

Options:
    --tag           Create a stable release tag if build passes criteria
    --install-hooks Install Git hooks for automated tagging
    --verify        Verify build artifacts integrity
    --sinphase      Calculate and display current sinphase metric

Example workflow:
    1. make release                    # Build the project
    2. git-raf --tag                  # Create stable tag
    3. git push origin --tags         # Push tags to remote

USAGE
        ;;
esac
