#!/bin/bash
# =================================================================
# RIFT Governance Validation Framework - Setup Script
# OBINexus AEGIS Methodology Compliance
# Systematic dependency resolution and environment configuration
# =================================================================

set -e  # Exit on any error

# AEGIS Configuration
SCRIPT_VERSION="1.0.0"
AEGIS_COMPLIANCE="ENABLED"
RIFT_VERSION="1.6.0"

# Color codes for professional output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Logging function
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_phase() {
    echo -e "${MAGENTA}[PHASE]${NC} $1"
}

# Display banner
display_banner() {
    echo -e "${BOLD}${BLUE}"
    echo "======================================================================"
    echo "RIFT Governance Validation Framework - Setup Script"
    echo "OBINexus Computing - AEGIS Methodology Compliance"
    echo "Version: $SCRIPT_VERSION | RIFT Version: $RIFT_VERSION"
    echo "======================================================================"
    echo -e "${NC}"
}

# Platform detection
detect_platform() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            PLATFORM="debian"
            PACKAGE_MANAGER="apt"
        elif [ -f /etc/redhat-release ]; then
            PLATFORM="redhat"
            PACKAGE_MANAGER="yum"
        elif [ -f /etc/arch-release ]; then
            PLATFORM="arch"
            PACKAGE_MANAGER="pacman"
        else
            PLATFORM="linux"
            PACKAGE_MANAGER="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
        PACKAGE_MANAGER="brew"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        PLATFORM="windows"
        PACKAGE_MANAGER="choco"
    else
        PLATFORM="unknown"
        PACKAGE_MANAGER="unknown"
    fi
    
    log_info "Platform detected: $PLATFORM ($PACKAGE_MANAGER)"
}

# Check if running in WSL
check_wsl() {
    if grep -qi microsoft /proc/version 2>/dev/null; then
        WSL_ENVIRONMENT="true"
        log_info "WSL environment detected"
        PLATFORM="wsl-$PLATFORM"
    else
        WSL_ENVIRONMENT="false"
    fi
}

# Check for required tools
check_build_tools() {
    log_phase "Phase 1: Build Tools Validation"
    
    local tools=("gcc" "make" "pkg-config" "cmake")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
            log_warning "$tool not found"
        else
            log_success "$tool found: $(command -v $tool)"
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing build tools: ${missing_tools[*]}"
        return 1
    fi
    
    log_success "All build tools validated"
    return 0
}

# Install dependencies based on platform
install_dependencies() {
    log_phase "Phase 2: Dependency Installation"
    
    case $PLATFORM in
        "debian"|"wsl-debian")
            log_info "Installing dependencies for Debian/Ubuntu..."
            sudo apt update
            sudo apt install -y \
                build-essential \
                cmake \
                pkg-config \
                libcjson-dev \
                libssl-dev \
                libcjson1 \
                openssl \
                git \
                curl \
                wget
            ;;
        "redhat"|"wsl-redhat")
            log_info "Installing dependencies for RedHat/CentOS/Fedora..."
            if command -v dnf &> /dev/null; then
                sudo dnf install -y \
                    gcc gcc-c++ make cmake \
                    pkg-config \
                    cjson-devel \
                    openssl-devel \
                    git curl wget
            else
                sudo yum install -y \
                    gcc gcc-c++ make cmake \
                    pkg-config \
                    cjson-devel \
                    openssl-devel \
                    git curl wget
            fi
            ;;
        "arch"|"wsl-arch")
            log_info "Installing dependencies for Arch Linux..."
            sudo pacman -S --noconfirm \
                base-devel \
                cmake \
                pkg-config \
                cjson \
                openssl \
                git \
                curl \
                wget
            ;;
        "macos")
            log_info "Installing dependencies for macOS..."
            if ! command -v brew &> /dev/null; then
                log_error "Homebrew not found. Please install Homebrew first:"
                log_error "https://brew.sh/"
                return 1
            fi
            brew install \
                cmake \
                pkg-config \
                cjson \
                openssl \
                git \
                curl \
                wget
            ;;
        "windows")
            log_info "Installing dependencies for Windows..."
            if ! command -v choco &> /dev/null; then
                log_error "Chocolatey not found. Please install Chocolatey first:"
                log_error "https://chocolatey.org/install"
                return 1
            fi
            choco install -y \
                mingw \
                cmake \
                pkgconfiglite \
                openssl \
                git \
                curl \
                wget
            ;;
        *)
            log_error "Unsupported platform: $PLATFORM"
            log_info "Please install the following dependencies manually:"
            log_info "  - build-essential (gcc, make, etc.)"
            log_info "  - cmake"
            log_info "  - pkg-config"
            log_info "  - libcjson-dev"
            log_info "  - libssl-dev"
            return 1
            ;;
    esac
    
    log_success "Dependencies installed successfully"
}

# Verify dependencies
verify_dependencies() {
    log_phase "Phase 3: Dependency Verification"
    
    # Check pkg-config packages
    local required_packages=("libcjson" "openssl")
    local missing_packages=()
    
    for package in "${required_packages[@]}"; do
        if pkg-config --exists "$package"; then
            local version=$(pkg-config --modversion "$package")
            log_success "$package found: version $version"
        else
            missing_packages+=("$package")
            log_warning "$package not found in pkg-config"
        fi
    done
    
    # Special handling for different cjson package names
    if [[ " ${missing_packages[*]} " =~ " libcjson " ]]; then
        # Try alternative package names
        if pkg-config --exists "cjson"; then
            log_success "cjson found (alternative name)"
            missing_packages=("${missing_packages[@]/libcjson}")
        elif pkg-config --exists "libcjson-dev"; then
            log_success "libcjson-dev found"
            missing_packages=("${missing_packages[@]/libcjson}")
        fi
    fi
    
    if [ ${#missing_packages[@]} -ne 0 ]; then
        log_error "Missing pkg-config packages: ${missing_packages[*]}"
        
        # Provide troubleshooting information
        log_info "Troubleshooting steps:"
        log_info "1. Check PKG_CONFIG_PATH: $PKG_CONFIG_PATH"
        log_info "2. Search for .pc files:"
        find /usr -name "*.pc" 2>/dev/null | grep -E "(cjson|ssl)" | head -5
        
        return 1
    fi
    
    log_success "All dependencies verified"
    return 0
}

# Setup project directory structure
setup_directories() {
    log_phase "Phase 4: Directory Structure Setup"
    
    local dirs=("build" "bin" "lib" "obj" "logs" "governance" "irift")
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_success "Created directory: $dir"
        else
            log_info "Directory exists: $dir"
        fi
    done
    
    # Create stage-specific object directories
    for stage in {0..6}; do
        mkdir -p "obj/rift-$stage"
        mkdir -p "obj/stage-$stage"
    done
    
    log_success "Directory structure setup complete"
}

# Create minimal governance files for testing
create_test_governance_files() {
    log_phase "Phase 5: Test Governance Files Creation"
    
    # Create primary .riftrc file
    if [ ! -f ".riftrc" ]; then
        cat > .riftrc << 'EOF'
{
  "package_name": "rift-governance-poc",
  "version": "1.0.0",
  "timestamp": "2025-06-20T00:00:00Z",
  "stage": 0,
  "stage_type": "experimental",
  "semverx_lock": false,
  "entry_point": "governance/rift_governance_validator.c",
  "nlink_enabled": false,
  "custom_stages": []
}
EOF
        log_success "Created .riftrc file"
    else
        log_info ".riftrc file already exists"
    fi
    
    # Create stage-specific configuration files
    for stage in {0..6}; do
        if [ ! -f ".riftrc.$stage" ]; then
            cat > ".riftrc.$stage" << EOF
{
  "package_name": "rift-stage-$stage",
  "version": "1.0.0",
  "timestamp": "2025-06-20T00:00:00Z",
  "stage": $stage,
  "stage_type": "experimental",
  "semverx_lock": false,
  "entry_point": "src/core/stage-$stage/",
  "nlink_enabled": false
}
EOF
            log_success "Created .riftrc.$stage file"
        fi
    done
    
    # Create Stage 5 optimizer governance file
    if [ ! -f "gov.optimizer.stage.riftrc.5" ]; then
        cat > gov.optimizer.stage.riftrc.5 << 'EOF'
{
  "package_name": "rift-optimizer",
  "version": "1.0.0",
  "timestamp": "2025-06-20T00:00:00Z",
  "stage": 5,
  "stage_type": "stable",
  "semverx_lock": true,
  "entry_point": "src/core/stage-5/optimizer.c",
  "nlink_enabled": true,
  "stage_5_optimizer": {
    "optimizer_model": "AST-aware-minimizer-v2",
    "minimization_verified": true,
    "path_hash": "d4f2c1a8b3e9f7c6d2a5e8b1c4f7d3a6e9b2c5f8d1a4e7b0c3f6d9a2e5b8c1f4",
    "post_optimization_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    "audit_enabled": true,
    "security_level": "exploit_elimination",
    "semantic_equivalence_proof": true
  }
}
EOF
        log_success "Created gov.optimizer.stage.riftrc.5 file"
    fi
    
    log_success "Test governance files created"
}

# Test build process
test_build() {
    log_phase "Phase 6: Build Test"
    
    log_info "Testing governance validator compilation..."
    
    # Try to compile with direct gcc command first
    if gcc -std=c11 -Wall -Wextra -Wpedantic \
        $(pkg-config --cflags libcjson openssl || pkg-config --cflags cjson openssl) \
        -o bin/rift_governance_validator \
        rift_governance_validator.c \
        $(pkg-config --libs libcjson openssl || pkg-config --libs cjson openssl) 2>/dev/null; then
        log_success "Direct compilation successful"
        
        # Test the validator
        if [ -x "bin/rift_governance_validator" ]; then
            log_info "Testing governance validator..."
            ./bin/rift_governance_validator . --verbose || log_warning "Validator test completed with warnings"
            log_success "Governance validator test completed"
        fi
    else
        log_error "Direct compilation failed"
        log_info "Attempting with alternative package names..."
        
        # Try alternative compilation
        if gcc -std=c11 -Wall -Wextra -Wpedantic \
            $(pkg-config --cflags cjson openssl) \
            -o bin/rift_governance_validator \
            rift_governance_validator.c \
            $(pkg-config --libs cjson openssl) 2>/dev/null; then
            log_success "Alternative compilation successful"
        else
            log_error "Compilation failed. Manual intervention required."
            return 1
        fi
    fi
    
    # Test Makefile build
    log_info "Testing Makefile build process..."
    if make clean && make; then
        log_success "Makefile build successful"
    else
        log_warning "Makefile build encountered issues"
    fi
    
    log_success "Build test completed"
}

# Setup PKG_CONFIG_PATH for common locations
setup_pkg_config_path() {
    log_phase "PKG_CONFIG_PATH Configuration"
    
    local pkg_paths=(
        "/usr/lib/pkgconfig"
        "/usr/lib/x86_64-linux-gnu/pkgconfig"
        "/usr/local/lib/pkgconfig"
        "/opt/local/lib/pkgconfig"
        "/usr/share/pkgconfig"
    )
    
    local existing_paths=""
    
    for path in "${pkg_paths[@]}"; do
        if [ -d "$path" ]; then
            if [ -z "$existing_paths" ]; then
                existing_paths="$path"
            else
                existing_paths="$existing_paths:$path"
            fi
            log_info "Found pkg-config directory: $path"
        fi
    done
    
    if [ -n "$existing_paths" ]; then
        export PKG_CONFIG_PATH="$existing_paths:$PKG_CONFIG_PATH"
        log_success "PKG_CONFIG_PATH configured: $PKG_CONFIG_PATH"
        
        # Save to .bashrc for persistence
        if ! grep -q "PKG_CONFIG_PATH.*$existing_paths" ~/.bashrc 2>/dev/null; then
            echo "export PKG_CONFIG_PATH=\"$existing_paths:\$PKG_CONFIG_PATH\"" >> ~/.bashrc
            log_success "PKG_CONFIG_PATH added to ~/.bashrc"
        fi
    fi
}

# Main setup function
main() {
    display_banner
    
    log_info "Starting RIFT Governance POC setup..."
    log_info "Working directory: $(pwd)"
    
    # Platform detection
    detect_platform
    check_wsl
    
    # Setup PKG_CONFIG_PATH
    setup_pkg_config_path
    
    # Check if tools exist, install if needed
    if ! check_build_tools; then
        log_info "Installing missing build tools..."
        install_dependencies
        
        # Re-check after installation
        if ! check_build_tools; then
            log_error "Build tools still missing after installation"
            exit 1
        fi
    fi
    
    # Install and verify dependencies
    if ! verify_dependencies; then
        log_info "Installing missing dependencies..."
        install_dependencies
        
        # Re-verify after installation
        if ! verify_dependencies; then
            log_error "Dependencies still missing after installation"
            log_info "Please check the installation manually"
            exit 1
        fi
    fi
    
    # Setup project structure
    setup_directories
    create_test_governance_files
    
    # Test the build
    test_build
    
    # Final summary
    echo -e "${BOLD}${GREEN}"
    echo "======================================================================"
    echo "RIFT Governance POC Setup Complete"
    echo "======================================================================"
    echo -e "${NC}"
    
    log_success "Setup completed successfully!"
    log_info "You can now run: make"
    log_info "Or test directly: ./bin/rift_governance_validator . --verbose"
    
    echo ""
    log_info "Next steps:"
    log_info "1. Run 'make' to build the complete project"
    log_info "2. Run 'make validate-governance' to test governance validation"
    log_info "3. Check logs/ directory for detailed validation reports"
}

# Command line argument parsing
case "${1:-}" in
    --help|-h)
        echo "RIFT Governance POC Setup Script"
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --deps-only   Install dependencies only"
        echo "  --test-only   Run tests only (requires prior setup)"
        echo ""
        exit 0
        ;;
    --deps-only)
        display_banner
        detect_platform
        check_wsl
        setup_pkg_config_path
        install_dependencies
        verify_dependencies
        log_success "Dependencies setup complete"
        exit 0
        ;;
    --test-only)
        display_banner
        setup_directories
        create_test_governance_files
        test_build
        log_success "Test phase complete"
        exit 0
        ;;
    *)
        main
        ;;
esac
