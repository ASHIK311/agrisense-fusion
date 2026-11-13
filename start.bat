@echo off
title AgriSense Fusion — NASA Space Apps 2026 Launcher
echo ===========================================================================
echo   AgriSense Fusion (Field Shift - High Barind Tract AEZ-26)
echo   Starting Express API Server (:5000) & Vite React 3D Twin UI (:5173)...
echo ===========================================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/3] Installing backend dependencies...
    call npm install
)

if not exist "frontend\node_modules" (
    echo [2/3] Installing frontend dependencies...
    call npm --prefix frontend install
)

echo [3/3] Launching backend and frontend servers...
start "AgriSense Fusion Backend (:5000)" cmd /k "cd /d "%~dp0" && node server/index.js"
start "AgriSense Fusion Frontend (:5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo Both services are starting!
echo   - Frontend UI: http://localhost:5173
echo   - Backend API: http://localhost:5000/api/health
echo.
pause
