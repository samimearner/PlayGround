# PocketstrikeAI Launcher Script for Windows 10 / 11
# Shows a terminal dashboard menu to configure or start the server.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "PocketStrike AI - Windows Dashboard"

# Resolve project root directory
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Colors (UI-Matching Cyber Theme)
$ESC = [char]27
$BLUE   = "$ESC[38;5;39m"
$CYAN   = "$ESC[0;36m"
$YELLOW = "$ESC[1;33m"
$RED    = "$ESC[0;31m"
$NC     = "$ESC[0m"
$GREEN  = "$ESC[38;5;46m"
$WHITE  = "$ESC[38;5;255m"

# Find Python executable
$PYTHON = "python"
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $PYTHON = "py"
    }
}

function Show-DashboardMenu {
    Clear-Host
    $configPath = Join-Path $projectRoot "config.json"
    $configExists = Test-Path $configPath

    if ($configExists) {
        $setupStatus = "${CYAN}[ Configured ]${NC}"
    } else {
        $setupStatus = "${RED}[ Unconfigured ]${NC}"
    }

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

    Write-Host "${BLUE}$BANNER${NC}"
    Write-Host "       [+] ${BLUE}Pocket${GREEN}Strike-AI ${NC}- ${BLUE}Windows Dashboard${NC} [+]"
    Write-Host "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
    Write-Host " Status: $setupStatus"

    if ($configExists) {
        try {
            $cfg = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($cfg.provider_name -and $cfg.model) {
                $pName = $cfg.provider_name.ToUpper()
                $mName = $cfg.model
                Write-Host " Active Model: ${CYAN}$pName ($mName)${NC}"
            }
            if ($cfg.PSObject.Properties['voice_enabled']) {
                $vStatus = if ($cfg.voice_enabled) { "Active (Hey Strike)" } else { "Disabled" }
                Write-Host " Voice Assistant: ${CYAN}$vStatus${NC}"
            }
        } catch {
            Write-Host " Active Model: ${CYAN}Unknown${NC}"
        }
    }

    Write-Host "${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
    Write-Host " Please choose an option:`n"
    Write-Host "  [1] Run Interactive Setup Wizard"
    Write-Host "  [2] Launch PocketstrikeAI Server & Bot"
    Write-Host "  [3] Exit"
    Write-Host "`n${GREEN}──────────────────────────────────────────────────────────────────────────${NC}"
}

function Run-Setup {
    & $PYTHON setup.py
    Write-Host "`nPress Enter to return to menu..."
    [void][System.Console]::ReadLine()
}

function Launch-Server {
    $configPath = Join-Path $projectRoot "config.json"
    if (-not (Test-Path $configPath)) {
        Write-Host "`n${RED}Error: Setup is not completed yet!${NC}"
        Write-Host "Please run the Setup Wizard (Option 1) first."
        $ans = Read-Host "`nWould you like to run it now? (y/n)"
        if ($ans -match "^[Yy]") {
            Run-Setup
        }
        return
    }

    Write-Host "`n${CYAN}Starting PocketstrikeAI Server on Windows...${NC}"
    & $PYTHON server.py
}

# Main event loop (only if invoked directly)
if ($MyInvocation.InvocationName -ne '.' -and $MyInvocation.InvocationName -ne '&') {
    while ($true) {
        Show-DashboardMenu
        $opt = Read-Host "Enter choice [1-3]"
        switch ($opt.Trim()) {
            "1" { Run-Setup }
            "2" { Launch-Server; break }
            "3" {
                Write-Host "`n${BLUE}Goodbye!${NC}"
                exit 0
            }
            default {
                Write-Host "`n${RED}Invalid option. Press Enter to try again.${NC}"
                [void][System.Console]::ReadLine()
            }
        }
    }
}
