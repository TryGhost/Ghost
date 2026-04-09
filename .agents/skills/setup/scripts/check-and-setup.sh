#!/usr/bin/env bash
# Ghost Development Environment Setup Script
# Checks for required dependencies and installs missing ones.
# Designed for Ubuntu/Debian Linux, with detection for macOS.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

REQUIRED_NODE_MAJOR=22
RECOMMENDED_NODE_VERSION="22.18.0"
ERRORS=()
WARNINGS=()
INSTALLED=()

print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_ok() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_warn() {
    echo -e "  ${YELLOW}!${NC} $1"
}

print_fail() {
    echo -e "  ${RED}✗${NC} $1"
}

print_info() {
    echo -e "  ${BLUE}→${NC} $1"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/os-release ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

#
# 1. Check Git
#
print_header "Checking Git"

if command -v git &>/dev/null; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    print_ok "Git $GIT_VERSION installed"
else
    print_fail "Git is not installed"
    if [[ "$OS" == "linux" ]]; then
        print_info "Installing git..."
        sudo apt-get update -qq && sudo apt-get install -y -qq git
        if command -v git &>/dev/null; then
            INSTALLED+=("git")
            print_ok "Git installed successfully"
        else
            ERRORS+=("Failed to install git")
        fi
    elif [[ "$OS" == "macos" ]]; then
        print_info "Install Xcode Command Line Tools: xcode-select --install"
        ERRORS+=("Git not installed — run: xcode-select --install")
    fi
fi

#
# 2. Check Node.js
#
print_header "Checking Node.js"

install_nvm_and_node() {
    print_info "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

    # Load nvm into current shell
    export NVM_DIR="${HOME}/.nvm"
    # shellcheck disable=SC1091
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    print_info "Installing Node.js $RECOMMENDED_NODE_VERSION via nvm..."
    nvm install "$RECOMMENDED_NODE_VERSION"
    nvm use "$RECOMMENDED_NODE_VERSION"
    nvm alias default "$RECOMMENDED_NODE_VERSION"
    INSTALLED+=("nvm" "node-$RECOMMENDED_NODE_VERSION")
    print_ok "Node.js $RECOMMENDED_NODE_VERSION installed via nvm"
}

# Source nvm if it exists but isn't loaded
if [ -s "${HOME}/.nvm/nvm.sh" ] && ! command -v nvm &>/dev/null; then
    export NVM_DIR="${HOME}/.nvm"
    # shellcheck disable=SC1091
    \. "$NVM_DIR/nvm.sh"
fi

if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
    if [[ "$NODE_MAJOR" -eq "$REQUIRED_NODE_MAJOR" ]]; then
        print_ok "Node.js $NODE_VERSION installed (major version $REQUIRED_NODE_MAJOR ✓)"
    else
        print_warn "Node.js $NODE_VERSION found, but Ghost requires Node.js $REQUIRED_NODE_MAJOR.x"
        if command -v nvm &>/dev/null; then
            print_info "Installing Node.js $RECOMMENDED_NODE_VERSION via nvm..."
            nvm install "$RECOMMENDED_NODE_VERSION"
            nvm use "$RECOMMENDED_NODE_VERSION"
            INSTALLED+=("node-$RECOMMENDED_NODE_VERSION")
            print_ok "Switched to Node.js $RECOMMENDED_NODE_VERSION"
        else
            install_nvm_and_node
        fi
    fi
else
    print_fail "Node.js is not installed"
    if command -v nvm &>/dev/null; then
        print_info "nvm found, installing Node.js $RECOMMENDED_NODE_VERSION..."
        nvm install "$RECOMMENDED_NODE_VERSION"
        nvm use "$RECOMMENDED_NODE_VERSION"
        INSTALLED+=("node-$RECOMMENDED_NODE_VERSION")
        print_ok "Node.js $RECOMMENDED_NODE_VERSION installed"
    else
        install_nvm_and_node
    fi
fi

# Verify node is available after installation
if ! command -v node &>/dev/null; then
    ERRORS+=("Node.js installation failed or not available in PATH")
fi

#
# 3. Check Yarn
#
print_header "Checking Yarn"

if command -v yarn &>/dev/null; then
    YARN_VERSION=$(yarn --version)
    YARN_MAJOR=$(echo "$YARN_VERSION" | cut -d. -f1)
    if [[ "$YARN_MAJOR" -eq 1 ]]; then
        print_ok "Yarn $YARN_VERSION installed (v1 classic ✓)"
    else
        print_warn "Yarn $YARN_VERSION found, but Ghost requires Yarn v1 (classic)"
        print_info "Installing Yarn v1 globally..."
        npm install -g yarn@1
        if yarn --version | grep -q "^1\."; then
            INSTALLED+=("yarn-v1")
            print_ok "Yarn v1 installed successfully"
        else
            ERRORS+=("Failed to install Yarn v1")
        fi
    fi
else
    print_fail "Yarn is not installed"
    if command -v npm &>/dev/null; then
        print_info "Installing Yarn v1 via npm..."
        npm install -g yarn@1
        if command -v yarn &>/dev/null; then
            INSTALLED+=("yarn-v1")
            print_ok "Yarn v1 installed successfully"
        else
            # npm global bin might not be in PATH
            print_warn "Yarn installed but not in PATH. Trying to locate..."
            NPM_BIN=$(npm config get prefix)/bin
            if [ -x "$NPM_BIN/yarn" ]; then
                export PATH="$NPM_BIN:$PATH"
                INSTALLED+=("yarn-v1")
                print_ok "Yarn v1 installed at $NPM_BIN/yarn"
                WARNINGS+=("You may need to add $NPM_BIN to your PATH")
            else
                ERRORS+=("Yarn installation succeeded but binary not found")
            fi
        fi
    else
        ERRORS+=("Cannot install Yarn: npm is not available")
    fi
fi

#
# 4. Check Docker
#
print_header "Checking Docker"

install_docker_linux() {
    print_info "Installing Docker Engine..."

    # Install prerequisites
    sudo apt-get update -qq
    sudo apt-get install -y -qq ca-certificates curl gnupg

    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    # Determine the distro - use Ubuntu as fallback for derivatives
    if [ -f /etc/os-release ]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        DISTRO_ID="${ID}"
        DISTRO_CODENAME="${VERSION_CODENAME:-}"
        # For Ubuntu derivatives, use the Ubuntu upstream codename
        if [ -n "${UBUNTU_CODENAME:-}" ]; then
            DISTRO_ID="ubuntu"
            DISTRO_CODENAME="$UBUNTU_CODENAME"
        fi
    else
        DISTRO_ID="ubuntu"
        DISTRO_CODENAME="jammy"
    fi

    # Set up the repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO_ID} \
        ${DISTRO_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    # Add current user to docker group
    if ! groups "$USER" | grep -q docker; then
        sudo usermod -aG docker "$USER"
        WARNINGS+=("Added $USER to docker group. You may need to log out and back in, or run 'newgrp docker' for this to take effect.")
        # Use newgrp to apply group change in current session
        print_info "Applying docker group membership for current session..."
    fi

    INSTALLED+=("docker")
    print_ok "Docker Engine installed successfully"
}

if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
    print_ok "Docker $DOCKER_VERSION installed"

    # Check if Docker daemon is running
    if docker info &>/dev/null; then
        print_ok "Docker daemon is running"
    else
        print_warn "Docker is installed but the daemon is not running"
        if [[ "$OS" == "linux" ]]; then
            print_info "Starting Docker daemon..."
            sudo systemctl start docker
            if docker info &>/dev/null; then
                print_ok "Docker daemon started"
            else
                ERRORS+=("Failed to start Docker daemon")
            fi
        elif [[ "$OS" == "macos" ]]; then
            ERRORS+=("Docker daemon not running — please open Docker Desktop")
        fi
    fi
else
    print_fail "Docker is not installed"
    if [[ "$OS" == "linux" ]]; then
        install_docker_linux
    elif [[ "$OS" == "macos" ]]; then
        print_info "Docker Desktop is required on macOS"
        print_info "Download from: https://www.docker.com/products/docker-desktop/"
        ERRORS+=("Docker not installed — install Docker Desktop for macOS")
    fi
fi

# Check Docker Compose
print_header "Checking Docker Compose"

if docker compose version &>/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || docker compose version | awk '{print $NF}')
    print_ok "Docker Compose $COMPOSE_VERSION installed"
else
    print_fail "Docker Compose v2 is not available"
    ERRORS+=("Docker Compose v2 plugin not found. It should be included with Docker Engine. Try reinstalling Docker.")
fi

#
# 5. Check build tools (needed for native modules on host)
#
print_header "Checking build tools"

NEED_BUILD_TOOLS=false

if ! command -v make &>/dev/null; then
    NEED_BUILD_TOOLS=true
fi

if ! command -v g++ &>/dev/null && ! command -v gcc &>/dev/null; then
    NEED_BUILD_TOOLS=true
fi

if ! command -v python3 &>/dev/null; then
    NEED_BUILD_TOOLS=true
fi

if [[ "$NEED_BUILD_TOOLS" == true ]]; then
    print_warn "Some build tools are missing (needed for native Node.js modules)"
    if [[ "$OS" == "linux" ]]; then
        print_info "Installing build-essential and python3..."
        sudo apt-get update -qq && sudo apt-get install -y -qq build-essential python3
        INSTALLED+=("build-essential" "python3")
        print_ok "Build tools installed"
    elif [[ "$OS" == "macos" ]]; then
        print_info "Install Xcode Command Line Tools if not already installed: xcode-select --install"
        WARNINGS+=("Build tools may be missing — run: xcode-select --install")
    fi
else
    print_ok "Build tools available (make, gcc/g++, python3)"
fi

#
# 6. Run yarn setup
#
print_header "Setting up Ghost project"

if [[ ${#ERRORS[@]} -gt 0 ]]; then
    print_fail "Skipping project setup due to earlier errors"
else
    cd "$PROJECT_ROOT"
    print_info "Running 'yarn setup' (this installs dependencies and initializes submodules)..."
    print_info "This may take a few minutes on first run..."
    echo ""

    if yarn setup; then
        print_ok "Ghost project setup complete"
        INSTALLED+=("ghost-dependencies")

        # Verify sqlite3 native module is built (needed for local dev/testing)
        if [ -d "$PROJECT_ROOT/node_modules/sqlite3" ]; then
            if [ -f "$PROJECT_ROOT/node_modules/sqlite3/build/Release/node_sqlite3.node" ]; then
                print_ok "sqlite3 native module is built"
            elif find "$PROJECT_ROOT/node_modules/sqlite3/lib/binding" -name "node_sqlite3.node" 2>/dev/null | grep -q .; then
                print_ok "sqlite3 prebuilt binary found"
            else
                print_warn "sqlite3 binary missing, building..."
                (cd "$PROJECT_ROOT/node_modules/sqlite3" && npm run install)
                if [ -f "$PROJECT_ROOT/node_modules/sqlite3/build/Release/node_sqlite3.node" ]; then
                    print_ok "sqlite3 native module built successfully"
                else
                    WARNINGS+=("sqlite3 native module may not have built correctly — some tests may fail")
                fi
            fi
        fi
    else
        ERRORS+=("'yarn setup' failed — check the output above for details")
    fi
fi

#
# Final Summary
#
echo ""
echo -e "${BLUE}==============================${NC}"
echo -e "${BLUE}  Setup Summary${NC}"
echo -e "${BLUE}==============================${NC}"

if [[ ${#INSTALLED[@]} -gt 0 ]]; then
    echo ""
    echo -e "${GREEN}Installed:${NC}"
    for item in "${INSTALLED[@]}"; do
        echo -e "  ${GREEN}✓${NC} $item"
    done
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}Warnings:${NC}"
    for item in "${WARNINGS[@]}"; do
        echo -e "  ${YELLOW}!${NC} $item"
    done
fi

if [[ ${#ERRORS[@]} -gt 0 ]]; then
    echo ""
    echo -e "${RED}Errors:${NC}"
    for item in "${ERRORS[@]}"; do
        echo -e "  ${RED}✗${NC} $item"
    done
    echo ""
    echo -e "${RED}Setup incomplete — please resolve the errors above and try again.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}All dependencies installed and Ghost project is set up!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run 'yarn dev' to start Ghost"
    echo "  2. Visit http://localhost:2368/ghost/ to create your admin account"
    echo "  3. Mailpit (test emails): http://localhost:8025"
    echo ""
    echo "Optional:"
    echo "  - Run 'yarn reset:data' to seed test data (1000 members, 100 posts)"
    echo "  - Run 'yarn dev:analytics' to include Tinybird analytics"
    echo "  - Run 'yarn dev:storage' to include MinIO S3 storage"
    exit 0
fi
