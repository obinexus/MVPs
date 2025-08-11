# Git-RAF Auto-Tag System Documentation

## Executive Summary

The Git-RAF (RIFTlang-Aware Framework) Auto-Tag system provides automated semantic versioning and stability classification for the DIRAM project. By integrating build verification, entropy analysis, and trie-based tag resolution, this system ensures only stable, verified builds receive official release tags.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Git-RAF Auto-Tag Pipeline                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Build Trigger    2. Artifact Verification              │
│       ↓                    ↓                                │
│  ┌─────────┐         ┌──────────┐                         │
│  │  Make   │  ────>  │ Validate │                         │
│  │ Release │         │ Binaries │                         │
│  └─────────┘         └──────────┘                         │
│                            ↓                                │
│  3. Sinphase Calc    4. Trie Navigation                   │
│       ↓                    ↓                                │
│  ┌─────────┐         ┌──────────┐                         │
│  │Stability│  ────>  │  Tag     │                         │
│  │ Metric  │         │Classify  │                         │
│  └─────────┘         └──────────┘                         │
│                            ↓                                │
│  5. Governance       6. Tag Creation                       │
│       ↓                    ↓                                │
│  ┌─────────┐         ┌──────────┐                         │
│  │   RAF   │  ────>  │  Apply   │                         │
│  │Metadata │         │   Tag    │                         │
│  └─────────┘         └──────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Sinphase Metric (σ)

The sinphase is a stability metric calculated as:

```
σ = (artifact_count × test_pass_rate) / (total_tests × 10)
```

Where:
- `artifact_count`: Number of successfully compiled objects
- `test_pass_rate`: Number of passing tests
- `total_tests`: Total test suite size

**Threshold**: σ ≥ 0.5 required for stable tagging

### 2. Trie-Based Tag Classification

The system uses a binary trie structure for efficient tag resolution:

```
                    Root
                   /    \
                  0      1
                 /\      /\
                0  1    0  1
              (rc)(stable)(hotfix)(release)
            
Trie Paths:
- "0"   → alpha   (σ < 0.2)
- "1"   → beta    (0.2 ≤ σ < 0.4)
- "00"  → rc      (0.4 ≤ σ < 0.6)
- "01"  → stable  (0.6 ≤ σ < 0.8)
- "10"  → hotfix  (special case)
- "11"  → release (σ ≥ 0.8)
```

### 3. Semantic Versioning Rules

Version bumping follows these rules:
- **Major**: API changes in `include/` directory
- **Minor**: Core functionality changes in `src/core/`
- **Patch**: All other changes

Format: `v{major}.{minor}.{patch}-{stability}`

## Implementation Details

### Required Artifacts

The following build artifacts must exist for tagging:
1. `build/release/bin/diram` - Main executable
2. `build/release/lib/libdiram.so.1` - Shared library
3. `build/release/lib/libdiram.a` - Static library
4. `build/release/config/diram.drc` - Configuration

### Governance Metadata Structure

Each tag includes RAF governance metadata:

```yaml
Policy-Tag: "{stability_level}"
Governance-Ref: diram_build_policy.rift.gov
Entropy-Checksum: {sha3_hash_of_manifest}
Governance-Vector: 
  - build_risk: {1 - sinphase}
  - rollback_cost: 0.15
  - stability_impact: {sinphase}
AuraSeal: {hmac_sha256_signature}
RIFTlang-Compilation-Proof: verified_stable_build
Build-Timestamp: {ISO8601_timestamp}
Artifact-Count: {number_of_artifacts}
```

## Usage Guide

### Initial Setup

1. Install the git-raf tool:
```bash
cp git-raf /usr/local/bin/
chmod +x /usr/local/bin/git-raf
```

2. Install Git hooks:
```bash
git-raf --install-hooks
```

### Manual Tagging

```bash
# Build the project
make release

# Create stable tag if criteria met
git-raf --tag

# Push tags to remote
git push origin --tags
```

### Automated Workflow

With hooks installed, the system automatically:
1. Detects commits affecting build files
2. Triggers `make release`
3. Evaluates sinphase metric
4. Creates and pushes tags for stable builds

### Verification Commands

```bash
# Check current sinphase value
git-raf --sinphase

# Verify build artifacts
git-raf --verify

# View last tag metadata
git show $(git describe --tags --abbrev=0)
```

## Integration with DIRAM

### Build System Integration

Add to your Makefile:

```makefile
.PHONY: release-tag
release-tag: release
	@echo "Creating stable release tag..."
	@git-raf --tag || echo "Build not stable enough for tagging"
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Auto-Tag Stable Builds
on:
  push:
    branches: [main]
    
jobs:
  tag-stable:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Release
        run: make release
      - name: Auto-Tag if Stable
        run: |
          ./tools/git-raf --tag
        env:
          GIT_RAF_SIGN: true
```

## Security Considerations

### AuraSeal Verification

The AuraSeal provides cryptographic attestation:
```bash
# Verify AuraSeal
echo -n "$ARTIFACT_MANIFEST" | \
  openssl dgst -sha256 -hmac "OBINexus-DIRAM" -verify
```

### GPG Signing

When GPG is available, tags are automatically signed:
```bash
# Verify signed tag
git tag -v diram-stable-v1.0.0-stable
```

## Troubleshooting

### Common Issues

1. **Sinphase Below Threshold**
   - Run more tests: `make test`
   - Fix failing tests before tagging
   - Ensure all artifacts build successfully

2. **Missing Artifacts**
   - Run `make clean && make release`
   - Check build logs in `logs/diram_errors.log`

3. **Tag Already Exists**
   - Increment version manually in code
   - Use `--force` flag (not recommended)

### Debug Mode

Enable verbose logging:
```bash
DEBUG=1 git-raf --tag
```

## Advanced Configuration

### Custom Sinphase Calculation

Override the default calculation by creating `.git/raf-config`:

```bash
# Custom sinphase formula
SINPHASE_FORMULA='($ARTIFACTS * $COVERAGE) / ($COMPLEXITY * 5)'
SINPHASE_THRESHOLD=0.7
```

### Tag Naming Schemes

Customize tag format in `.git/raf-config`:
```bash
TAG_PREFIX="diram"
TAG_FORMAT="${PREFIX}-${VERSION}-${STABILITY}-${DATE}"
```

## Conclusion

The Git-RAF Auto-Tag system provides a robust, governance-aware approach to release management. By combining build verification, stability metrics, and cryptographic attestation, it ensures only high-quality, stable builds receive official release tags.

For questions or contributions, contact the OBINexus team.