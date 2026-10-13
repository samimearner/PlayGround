#!/usr/bin/env bash

# PocketstrikeAI Launcher Script for Termux
# Shows a menu to configure or start the server.

# Auto-detect macOS (Darwin) and delegate to mac/launch.sh
case "$(uname -s 2>/dev/null)" in
    Darwin*)
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
        if [ -f "$SCRIPT_DIR/mac/launch.sh" ]; then
            chmod +x "$SCRIPT_DIR/mac/launch.sh" 2>/dev/null || true
            exec "$SCRIPT_DIR/mac/launch.sh" "$@"
        fi
        ;;
esac

# Auto-detect Linux (Debian/Ubuntu/Arch/Fedora/Kali) when not running in Termux
if [ ! -x "$(command -v pkg)" ] && { [ -f "/etc/os-release" ] || [ -f "/etc/debian_version" ]; }; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
    if [ -f "$SCRIPT_DIR/linux/launch.sh" ]; then
        chmod +x "$SCRIPT_DIR/linux/launch.sh" 2>/dev/null || true
        exec "$SCRIPT_DIR/linux/launch.sh" "$@"
    fi
fi

# Resolve project root directory safely
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Resolve exact Python interpreter (prioritize venv, then python3, then python)
PYTHON_BIN="python3"
if [ -x "$SCRIPT_DIR/.venv/bin/python3" ]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python3"
elif [ -x "$SCRIPT_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON_BIN="python3"
elif command -v python &>/dev/null; then
    PYTHON_BIN="python"
fi

# Colors (UI-Matching Cyber Theme)
BLUE='\033[38;5;39m' # Vibrant Cyber Blue
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
GREEN='\033[38;5;46m' # Bright Green
WHITE='\033[38;5;255m'

show_menu() {
    clear
    # Check if config.json exists
    if [ -f "config.json" ]; then
        SETUP_STATUS="${CYAN}[ Configured ]${NC}"
        CONFIG_EXISTS=true
    else
        SETUP_STATUS="${RED}[ Unconfigured ]${NC}"
        CONFIG_EXISTS=false
    fi

    echo -e "${BLUE}██████╗  ██████╗  ██████╗██╗  ██╗███████╗████████╗${NC}"
    echo -e "${BLUE}██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝${NC}"
    echo -e "${BLUE}██████╔╝██║   ██║██║     █████╔╝ █████╗     ██║   ${NC}"
    echo -e "${BLUE}██╔═══╝ ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║   ${NC}"
    echo -e "${BLUE}██║     ╚██████╔╝╚██████╗██║  ██╗███████╗   ██║   ${NC}"
    echo -e "${BLUE}╚═╝      ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ${NC}"
    echo -e "${WHITE}███████╗████████╗██████╗ ██╗██╗  ██╗███████╗     █████╗ ██╗${NC}"
    echo -e "${WHITE}██╔════╝╚══██╔══╝██╔══██╗██║██║ ██╔╝██╔════╝    ██╔══██╗██║${NC}"
    echo -e "${WHITE}███████╗   ██║   ██████╔╝██║█████╔╝ █████╗      ███████║██║${NC}"
    echo -e "${WHITE}╚════██║   ██║   ██╔══██╗██║██╔═██╗ ██╔══╝      ██╔══██║██║${NC}"
    echo -e "${WHITE}███████║   ██║   ██║  ██║██║██║  ██╗███████╗    ██║  ██║██║${NC}"
    echo -e "${WHITE}╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝${NC}"
    echo -e "       ${BLUE}Pocket${GREEN}Strike-AI ${NC}— ${BLUE}Dashboard${NC}"
    echo -e "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
    echo -e " Status: $SETUP_STATUS"
    
    if [ "$CONFIG_EXISTS" = true ]; then
        INFO=$("$PYTHON_BIN" -c '
import json
try:
    with open("config.json") as f:
        cfg = json.load(f)
        p = cfg.get("provider_name", "Unknown").upper()
        m = cfg.get("model", "Unknown")
        print(p + " (" + m + ")")
except Exception:
    print("Invalid Configuration")
' 2>/dev/null)
        echo -e " Active Model: ${CYAN}${INFO}${NC}"
        VOICE_INFO=$("$PYTHON_BIN" -c '
import json
try:
    with open("config.json") as f:
        cfg = json.load(f)
        v = cfg.get("voice_enabled", True)
        print("Active (Hey Strike)" if v else "Disabled")
except Exception:
    print("Disabled")
' 2>/dev/null)
        echo -e " Voice Assistant: ${CYAN}${VOICE_INFO}${NC}"
    fi
    echo -e "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
    echo -e " Please choose an option:\n"
    echo -e "  [1] Run Interactive Setup Wizard"
    echo -e "  [2] Launch PocketstrikeAI Server & Bot"
    echo -e "  [3] Exit"
    echo -e "\n${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
}

run_setup() {
    "$PYTHON_BIN" setup.py
    echo -e "\nPress Enter to return to menu..."
    read -r
}

launch_server() {
    if [ ! -f "config.json" ]; then
        echo -e "\n${RED}Error: Setup is not completed yet!${NC}"
        echo -e "Please run the Setup Wizard (Option 1) first."
        echo -e "\nWould you like to run it now? (y/n): "
        read -r choice
        case "$choice" in
            [Yy]*) run_setup ;;
        esac
        return
    fi

    echo -e "\n${CYAN}Starting PocketstrikeAI Server using ($PYTHON_BIN)...${NC}"
    "$PYTHON_BIN" server.py
}

while true; do
    show_menu
    echo -n "Enter choice [1-3]: "
    read -r opt
    case $opt in
        1)
            run_setup
            ;;
        2)
            launch_server
            break
            ;;
        3)
            echo -e "\n${BLUE}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "\n${RED}Invalid option. Press Enter to try again.${NC}"
            read -r
            ;;
    esac
done
