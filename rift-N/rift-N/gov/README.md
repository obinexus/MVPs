# RIFT Governance Validation Framework - Proof of Concept

**OBINexus Computing - AEGIS Methodology Compliance**  
**Version:** 1.0.0  
**Authors:** Nnamdi Michael Okpala & AEGIS Development Team

## Overview

The RIFT Governance Validation Framework implements systematic governance enforcement for compiler pipeline stages through machine-verifiable configuration contracts. This proof-of-concept demonstrates deterministic governance validation across all RIFT compiler stages (0-6) while enforcing stakeholder authorization requirements and semverx_lock compliance.

## Technical Architecture

### Core Components

- **Governance Validator Engine** (`rift_governance_validator.c`): C-based validation framework with comprehensive governance checking
- **Schema Definition** (`schema.json`): JSON Schema defining governance contracts and Stage 5 security requirements
- **Build Integration** (`CMakeLists.txt`, `Makefile`): Phase-gated build process with systematic validation
- **Setup Automation** (`setup.sh`): Platform-aware dependency resolution and environment configuration

### AEGIS Methodology Integration

The framework implements a systematic waterfall approach through five distinct phase gates:

1. **Phase Gate 1**: Requirements validation and dependency verification
2. **Phase Gate 2**: Governance structure validation
3. **Phase Gate 3**: Validator compilation and preliminary testing
4. **Phase Gate 4**: SemVerX compliance through NLink integration
5. **Phase Gate 5**: Complete pipeline validation

## Quick Start

### Prerequisites

- GCC 11 or later with C11 support
- CMake 3.16 or later
- pkg-config
- libcjson development libraries
- OpenSSL development libraries

### Installation

#### Automated Setup (Recommended)

```bash
# Run automated setup script
make setup

# Verify installation
make validate-governance
```

#### Manual Setup

```bash
# Install dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install build-essential cmake pkg-config libcjson-dev libssl-dev

# Build governance validator
make

# Run validation
./bin/rift_governance_validator . --verbose
```

## Build System Integration

### Primary Targets

| Target | Description |
|--------|-------------|
| `make setup` | Automated dependency resolution and environment setup |
| `make` | Complete phase-gated build with governance validation |
| `make validate-governance` | Run governance validation tests |
| `make validate-governance-strict` | Run strict governance validation |
| `make clean` | Remove all build artifacts |

### Phase Gate Targets

| Phase Gate | Target | Description |
|------------|--------|-------------|
| Phase 1 | `make phase-gate-1` | Requirements and dependency validation |
| Phase 2 | `make phase-gate-2` | Governance structure validation |
| Phase 3 | `make phase-gate-3` | Validator build and preliminary testing |
| Phase 4 | `make phase-gate-4` | SemVerX and NLink integration validation |
| Phase 5 | `make phase-gate-5` | Complete pipeline validation |

## Governance Configuration

### Schema Overview

The governance system uses JSON-based configuration files following the naming convention:

```
.riftrc                           # Primary project configuration
.riftrc.{N}                      # Stage-specific configuration (N=0-6)
gov.{substage}.stage.riftrc.{N}  # Substage governance contracts
```

### Required Fields

All governance files must include:

- `package_name`: Unique package identifier
- `version`: Semantic version string
- `timestamp`: ISO 8601 timestamp for lifecycle management
- `stage`: Pipeline stage number (0-6)

### Stage 5 Security Requirements

Stage 5 (Optimizer) requires additional security governance:

```json
{
  "stage_5_optimizer": {
    "optimizer_model": "AST-aware-minimizer-v2",
    "minimization_verified": true,
    "path_hash": "sha256_before_optimization",
    "post_optimization_hash": "sha256_after_optimization",
    "audit_enabled": true,
    "security_level": "exploit_elimination",
    "semantic_equivalence_proof": true
  }
}
```

## Stakeholder Authorization Model

The framework implements a three-tier authorization model:

### Stakeholder Classes

1. **User**: Individuals/organizations compiling with `-lrift.{a,so}`
2. **Developer**: Maintainers and internal project contributors
3. **Vendor**: Package distributors (@obinexus/rift, winget, Microsoft Store)

### semverx_lock Enforcement

When `semverx_lock: true`, all schema fields become frozen contracts requiring explicit stakeholder authorization for modifications.

## Usage Examples

### Basic Governance Validation

```bash
# Validate current project governance
./bin/rift_governance_validator . --verbose

# Strict validation mode
./bin/rift_governance_validator . --strict --verbose

# Validate specific stage
make validate-stage-5
```

### Integration with Existing Projects

```bash
# Add governance validation to existing RIFT project
cp rift_governance_validator.c /path/to/project/
cp rift_governance.h /path/to/project/
cp schema.json /path/to/project/

# Create minimal governance files
cat > .riftrc << 'EOF'
{
  "package_name": "my-rift-project",
  "version": "1.0.0",
  "timestamp": "2025-06-20T00:00:00Z",
  "stage": 0,
  "stage_type": "experimental",
  "semverx_lock": false,
  "entry_point": "src/main.c",
  "nlink_enabled": false
}
EOF

# Validate
./bin/rift_governance_validator . --verbose
```

## Development Workflow

### Adding New Governance Rules

1. **Schema Update**: Modify `schema.json` with new governance requirements
2. **Validator Enhancement**: Update `rift_governance_validator.c` validation logic
3. **Test Creation**: Add comprehensive test cases
4. **Documentation**: Update configuration examples and usage documentation

### Custom Stage Development

```json
{
  "custom_stages": [
    {
      "name": "my_custom_stage",
      "stage_id": "custom-001",
      "description": "Custom processing stage",
      "activated": true,
      "dependencies": ["stage-6"],
      "governance_required": true,
      "machine_verifiable": true
    }
  ]
}
```

## Testing and Quality Assurance

### Test Suite

```bash
# Run complete test suite
make test-governance

# Individual test categories
make test-governance-parsing
make test-timestamp-validation
make test-semverx-integration
make test-stage5-security
```

### Quality Assurance

```bash
# Comprehensive QA validation
make qa-governance

# Generate validation reports
make validate > logs/governance_validation_report.txt
```

## Platform Support

### Supported Platforms

- **Linux**: Ubuntu, Debian, CentOS, RHEL, Arch Linux
- **WSL**: All Linux distributions under Windows Subsystem for Linux
- **macOS**: Intel and Apple Silicon (requires Homebrew)
- **Windows**: MinGW, MSYS2 (requires Chocolatey)

### Platform-Specific Setup

#### Ubuntu/Debian
```bash
sudo apt install build-essential cmake pkg-config libcjson-dev libssl-dev
```

#### CentOS/RHEL/Fedora
```bash
sudo dnf install gcc gcc-c++ cmake pkg-config cjson-devel openssl-devel
```

#### macOS
```bash
brew install cmake pkg-config cjson openssl
```

#### Windows (MSYS2)
```bash
pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-cmake mingw-w64-x86_64-pkg-config
```

## Troubleshooting

### Common Issues

#### libcjson Not Found

```bash
# Check pkg-config search paths
pkg-config --variable pc_path pkg-config

# Search for cjson packages
find /usr -name "*cjson*.pc" 2>/dev/null

# Set PKG_CONFIG_PATH manually
export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:$PKG_CONFIG_PATH"
```

#### Phase Gate Failures

```bash
# Check specific phase gate status
make phase-gate-1  # Requirements validation
make phase-gate-2  # Governance structure
make phase-gate-3  # Validator build

# Review logs
cat logs/governance_validation.log
cat logs/phase_gate_*.marker
```

#### Governance File Issues

```bash
# Validate JSON syntax
jsonlint-php .riftrc

# Schema validation
python3 -c "import json, jsonschema; jsonschema.validate(json.load(open('.riftrc')), json.load(open('schema.json')))"

# Check file permissions
ls -la .riftrc*
```

## API Reference

### Core Functions

#### `rift_validation_init()`
```c
validation_result_t rift_validation_init(validation_context_t *ctx, const char *project_root);
```
Initialize validation context with project root directory.

#### `parse_governance_file()`
```c
validation_result_t parse_governance_file(const char *file_path, governance_config_t *config);
```
Parse JSON governance configuration file into structured format.

#### `validate_complete_pipeline()`
```c
validation_result_t validate_complete_pipeline(validation_context_t *ctx);
```
Validate governance across all RIFT pipeline stages (0-6).

### Return Codes

| Code | Description |
|------|-------------|
| `VALIDATION_SUCCESS` | All validation passed |
| `VALIDATION_SCHEMA_VIOLATION` | JSON schema validation failed |
| `VALIDATION_EXPIRED_GOVERNANCE` | Governance timestamp expired |
| `VALIDATION_SEMVERX_VIOLATION` | SemVerX compliance violation |
| `VALIDATION_MISSING_GOVERNANCE` | Required governance files missing |
| `VALIDATION_CRITICAL_FAILURE` | Critical system failure |

## Contributing

### Development Environment Setup

```bash
# Clone and setup development environment
git clone https://github.com/obinexus/rift.git
cd rift/poc/gov
make setup

# Run development tests
make validate-governance-strict
make qa-governance
```

### Code Style

- Follow C11 standards with AEGIS security compliance flags
- Comprehensive error handling and logging
- Systematic documentation with Doxygen comments
- Waterfall methodology compliance in development process

### Pull Request Process

1. **Requirements Phase**: Document requirements and technical specifications
2. **Design Phase**: Review architectural impact and integration points
3. **Implementation Phase**: Systematic development with comprehensive testing
4. **Validation Phase**: Complete test suite execution and QA validation
5. **Documentation Phase**: Update all relevant documentation and examples

## License

This proof-of-concept is part of the OBINexus RIFT ecosystem and follows the project licensing terms.

## Support

For technical support and collaborative development:

- **Project Repository**: https://github.com/obinexus/rift
- **Issue Tracking**: GitHub Issues for systematic problem reporting
- **Development Coordination**: Direct collaboration with Nnamdi Michael Okpala

## Version History

### v1.0.0 (Current)
- Initial proof-of-concept implementation
- Systematic governance validation framework
- Phase-gated build integration
- Platform-aware dependency resolution
- Comprehensive test suite and documentation

---

**AEGIS Methodology Compliance**: This project follows systematic waterfall development principles with comprehensive phase gate validation and stakeholder authorization enforcement.