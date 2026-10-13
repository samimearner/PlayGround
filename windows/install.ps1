# PocketstrikeAI Installer Script for Windows 10 / 11
# Sets up Windows Python environment, security dependencies, and workspace directories.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "PocketStrike AI - Windows Installer"

# Resolve project root directory
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Define ANSI colors
$ESC = [char]27
$BLUE   = "$ESC[38;5;39m"
$GREEN  = "$ESC[38;5;46m"
$CYAN   = "$ESC[0;36m"
$YELLOW = "$ESC[1;33m"
$RED    = "$ESC[0;31m"
$NC     = "$ESC[0m"
$WHITE  = "$ESC[38;5;255m"

$BANNER = @'
██████╗  ██████╗  ██████╗██╗  ██╗███████╗████████╗
██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝
██████╔╝██║   ██║██║     █████╔╝ █████╗     ██║   
██╔═══╝ ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║   
██║     ╚██████╔╝╚██████╗██║  ██╗███████╗   ██║   
╚═╝      ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   
███████╗████████╗██████╗ ██╗██╗  ██╗███████╗     █████╗ ██╗
██╔════╝╚══██╔══╝██╔══██╗██║██║ ██╔╝██╔════╝    ██╔══██╗██║
███████╗   ██║   ██████╔╝██║█████╔╝ █████╗      ███████║██║
╚════██║   ██║   ██╔══██╗██║██╔═██╗ ██╔══╝      ██╔══██║██║
███████║   ██║   ██║  ██║██║██║  ██╗███████╗    ██║  ██║██║
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝
'@

Clear-Host
Write-Host "${BLUE}$BANNER${NC}"
Write-Host "       [+] ${BLUE}Pocket${GREEN}Strike-AI ${NC}- ${BLUE}Windows Initializer${NC} [+]"
Write-Host "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
Write-Host "Starting Windows high-performance system deployment..."
Write-Host "Target OS: Windows 10 / Windows 11"
Write-Host "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}`n"

# 1. Check for Python
Write-Host "${BLUE}[1/4] Checking Python runtime...${NC}"
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
}

if (-not $pythonCmd) {
    Write-Host "${RED}Error: Python 3 was not found in your system PATH.${NC}"
    Write-Host "${YELLOW}Please install Python 3.10+ from https://www.python.org or Microsoft Store.${NC}"
    Write-Host "${YELLOW}Make sure to check 'Add python.exe to PATH' during installation.${NC}"
    exit 1
}

$pyVer = & $pythonCmd --version 2>&1
Write-Host "${GREEN}[v] Found: $pyVer${NC}"

# 2. Check for optional security tools
Write-Host "`n${BLUE}[2/4] Checking Windows tools & package managers...${NC}"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "${GREEN}[v] Git: Installed${NC}"
} else {
    Write-Host "${YELLOW}[!] Git: Not detected in PATH (Recommended: install via 'winget install Git.Git')${NC}"
}

if (Get-Command curl -ErrorAction SilentlyContinue) {
    Write-Host "${GREEN}[v] Curl: Installed${NC}"
} else {
    Write-Host "${YELLOW}[!] Curl: Not detected in PATH${NC}"
}

if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Host "${GREEN}[v] Android ADB: Installed (Phone automation ready)${NC}"
} else {
    Write-Host "${CYAN}[i] Android ADB: Optional (Install to enable wireless phone control)${NC}"
}

# 3. Create local workspace directory
Write-Host "`n${BLUE}[3/4] Initializing workspace directory (./workspace)...${NC}"
$workspaceDir = Join-Path $projectRoot "workspace"
if (-not (Test-Path $workspaceDir)) {
    New-Item -ItemType Directory -Path $workspaceDir -Force | Out-Null
    Write-Host "${GREEN}[v] Created: $workspaceDir${NC}"
} else {
    Write-Host "${GREEN}[v] Workspace ready: $workspaceDir${NC}"
}

# 4. Install Python requirements
Write-Host "`n${BLUE}[4/4] Installing Python dependency layers...${NC}"
& $pythonCmd -m pip install --upgrade pip
& $pythonCmd -m pip install flask requests SpeechRecognition opencv-python urllib3

# 5. Verification
$testResult = & $pythonCmd -c "import flask, requests; print('OK')" 2>&1
if ($testResult -match "OK") {
    Write-Host "${GREEN}[v] Core frameworks verified successfully!${NC}"
} else {
    Write-Host "${RED}[!] Verification check reported issues: $testResult${NC}"
}

Write-Host "`n${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
Write-Host "       [+] ${BLUE}Pocket${GREEN}Strike-AI ${NC}- ${GREEN}Windows Deployment Complete!${NC} [+]"
Write-Host "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
Write-Host "You can now initialize the setup wizard and launch the AI on Windows."
Write-Host "To launch, run: ${YELLOW}.\windows\launch.bat${NC} or ${YELLOW}$pythonCmd server.py${NC}"
Write-Host "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}`n"
