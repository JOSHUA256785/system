@echo off
REM Quick Start Script for SERVICE COPS Backend
REM This script will help you set up and run the Flask backend

echo.
echo ============================================
echo   SERVICE COPS - Backend Setup & Run
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [OK] Python is installed
python --version
echo.

REM Check if we're in the right directory
if not exist "run.py" (
    echo [ERROR] run.py not found. Please run this from the project root directory.
    pause
    exit /b 1
)

echo [OK] Project files found
echo.

REM Install/Upgrade pip
echo Installing/Updating pip...
python -m pip install --upgrade pip
echo.

REM Install requirements
echo [STEP 1/2] Installing dependencies from requirements.txt...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully
echo.

REM Start Flask server
echo [STEP 2/2] Starting Flask Backend Server...
echo.
echo Server will run on: http://localhost:5000
echo.
echo To test registration, open: http://127.0.0.1:5500/register.html
echo.
echo Press CTRL+C to stop the server
echo.
python run.py
