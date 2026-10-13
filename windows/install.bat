@echo off
REM PocketstrikeAI Installer Launcher for Windows
REM Automatically invokes PowerShell installer with ExecutionPolicy Bypass

title PocketStrike AI - Windows Installer
cd /d "%~dp0.."

echo Launching PocketStrike AI Windows Installer...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred during installation.
    pause
)
