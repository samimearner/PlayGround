#!/usr/bin/env bash

# PocketstrikeAI Installer Script for macOS (Homebrew)
# Designed to set up macOS system dependencies and Python environments.

# Ensure standard macOS and Homebrew binary paths are available
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH"
if [ -x "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null)" || true
elif [ -x "/usr/local/bin/brew" ]; then
    eval "$(/usr/local/bin/brew shellenv 2>/dev/null)" || true
fi

# Resolve project root directory safely across bash, zsh, and sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Define colors for output
BLUE='\033[38;5;39m' # Vibrant Cyber Blue
GREEN='\033[38;5;46m' # Bright Green
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}  _____            _        _    _____ _        _ _     ${NC}"
echo -e "${BLUE} |  __ \\          | |      | |  / ____| |      (_) |    ${NC}"
echo -e "${BLUE} | |__) |__   ___ | | _____| |_| (___ | |_ _ __ _| | ___ ${NC}"
echo -e "${BLUE} |  ___/ _ \\ / __|| |/ / _ \\ __|\\___ \\| __| '__| | |/ / ${NC}"
echo -e "${BLUE} | |  | (_) | (__ |   <  __/ |_ ____) | |_| |  | |   <  ${NC}"
echo -e "${BLUE} |_|   \\___/ \\___||_|\\_\\___|\\__|_____/ \\__|_|  |_|_|\\_\\${NC}"
echo -e "       🍎 ${BLUE}Pocket${GREEN}Strike-AI ${NC}— ${BLUE}macOS Initializer (Homebrew)${NC} 🍎"
echo -e "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
echo -e "🚀 Starting macOS high-performance system deployment..."
echo -e "💻 Target OS: macOS (Apple Silicon M1/M2/M3/M4 & Intel)"
echo -e "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}\n"

# 1. Check for Homebrew (optional on macOS, but provides nmap and modern python)
if [ ! -x "$(command -v brew)" ]; then
    echo -e "${YELLOW}Notice: Homebrew not detected.${NC}"
    echo -e "${CYAN}Proceeding with native macOS Python virtual environment deployment...${NC}"
    echo -e "${CYAN}(To install security tools like nmap later, visit https://brew.sh)${NC}\n"
else
    # Update Homebrew formulae & deploy tools
    echo -e "${BLUE}⚡ [1/4] Checking Homebrew formulae...${NC}"
    brew update 2>/dev/null || true
    echo -e "\n${BLUE}⚡ [2/4] Deploying macOS security toolchain via brew...${NC}"
    brew install python3 git nmap 2>/dev/null || echo -e "${YELLOW}Warning: Homebrew packages already installed or up-to-date.${NC}"
fi

# Create workspace directory
echo -e "\n${BLUE}📁 Initializing macOS workspace directory (~/PocketStrike-AI/workspace)...${NC}"
mkdir -p "$PROJECT_ROOT/workspace" || true
mkdir -p "$HOME/PocketStrike-AI/workspace" 2>/dev/null || true

# 4. Install Python dependencies
echo -e "\n${BLUE}⚡ [3/4] Installing Python dependency layers...${NC}"

# Prioritize Homebrew Python, Python.org framework Python, or system python3
PYTHON_CMD=""
for p in "/opt/homebrew/bin/python3" "/usr/local/bin/python3" "/Library/Frameworks/Python.framework/Versions/Current/bin/python3" "$(command -v python3 2>/dev/null)" "/usr/bin/python3"; do
    if [ -n "$p" ] && [ -x "$p" ]; then
        PYTHON_CMD="$p"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    PYTHON_CMD="$(command -v python3 || echo '/usr/bin/python3')"
fi

echo -e "Using Python interpreter: ${CYAN}${PYTHON_CMD}${NC}"

# Deploy dedicated virtual environment in $PROJECT_ROOT/.venv
VENV_DIR="$PROJECT_ROOT/.venv"
echo -e "${BLUE}Configuring isolated Python virtual environment at ${CYAN}$VENV_DIR${NC}...${NC}"

if [ ! -d "$VENV_DIR" ] || [ ! -x "$VENV_DIR/bin/python" ]; then
    rm -rf "$VENV_DIR" 2>/dev/null || true
    "$PYTHON_CMD" -m venv "$VENV_DIR" 2>/dev/null || python3 -m venv "$VENV_DIR" 2>/dev/null || true
fi

# Ensure pip exists in the virtual environment
if [ -x "$VENV_DIR/bin/python" ] && [ ! -x "$VENV_DIR/bin/pip" ]; then
    echo -e "${CYAN}Bootstrapping pip inside virtual environment...${NC}"
    "$VENV_DIR/bin/python" -m ensurepip --upgrade 2>/dev/null || true
    if [ ! -x "$VENV_DIR/bin/pip" ]; then
        curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py 2>/dev/null && \
        "$VENV_DIR/bin/python" /tmp/get-pip.py 2>/dev/null || true
        rm -f /tmp/get-pip.py 2>/dev/null || true
    fi
fi

# Determine pip and python binaries
if [ -x "$VENV_DIR/bin/pip" ]; then
    PIP_EXEC="$VENV_DIR/bin/pip"
    PY_EXEC="$VENV_DIR/bin/python"
elif [ -x "$VENV_DIR/bin/python" ]; then
    PIP_EXEC="$VENV_DIR/bin/python -m pip"
    PY_EXEC="$VENV_DIR/bin/python"
elif command -v pip3 &>/dev/null; then
    PIP_EXEC="pip3"
    PY_EXEC="$PYTHON_CMD"
else
    PIP_EXEC="$PYTHON_CMD -m pip"
    PY_EXEC="$PYTHON_CMD"
fi

# Upgrade pip inside environment
$PY_EXEC -m ensurepip --upgrade 2>/dev/null || true
$PIP_EXEC install --upgrade pip 2>/dev/null || true

# Install core required packages
echo -e "${BLUE}Installing required packages: flask, requests, SpeechRecognition, urllib3...${NC}"
$PIP_EXEC install flask requests SpeechRecognition urllib3 || \
$PY_EXEC -m pip install --break-system-packages flask requests SpeechRecognition urllib3 || \
$PY_EXEC -m pip install flask requests SpeechRecognition urllib3 || \
$PIP_EXEC install --no-cache-dir flask requests SpeechRecognition urllib3 || true

# Install optional packages (opencv-python) without aborting on Apple Silicon compile issues
echo -e "${BLUE}Installing optional packages (opencv-python)...${NC}"
$PIP_EXEC install opencv-python 2>/dev/null || \
$PY_EXEC -m pip install --break-system-packages opencv-python 2>/dev/null || \
echo -e "${YELLOW}Notice: opencv-python is optional and was skipped.${NC}"

# 5. Set execution permissions
echo -e "\n${BLUE}⚡ [4/4] Setting execution system permissions...${NC}"
chmod +x "$PROJECT_ROOT/mac/launch.sh" 2>/dev/null || true
chmod +x "$PROJECT_ROOT/mac/install.sh" 2>/dev/null || true
chmod +x "$PROJECT_ROOT/launch.sh" 2>/dev/null || true
chmod +x "$PROJECT_ROOT/install.sh" 2>/dev/null || true
chmod +x "$PROJECT_ROOT/setup.py" 2>/dev/null || true

echo -e "\n${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
echo -e "       ✨ ${BLUE}Pocket${GREEN}Strike-AI ${NC}— ${GREEN}macOS Deployment Complete!${NC} ✨"
echo -e "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
echo -e "You can now initialize the setup wizard and launch the AI on macOS."
echo -e "To launch, run: ${YELLOW}./mac/launch.sh${NC} or ${YELLOW}python3 server.py${NC}"
echo -e "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
