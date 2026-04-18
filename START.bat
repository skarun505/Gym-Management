@echo off
title GymPro - Gym Management System

echo.
echo  ============================================
echo    GymPro Gym Management System
echo  ============================================
echo.

REM Kill any existing node processes on our ports
echo  [1/4] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

timeout /t 1 /nobreak >nul

REM Start Backend
echo  [2/4] Starting Backend API (port 3001)...
start "GymPro Backend :3001" cmd /k "cd /d "%~dp0server" && echo Starting GymPro Backend... && node src/app.js"

REM Wait for backend to be ready
echo  [3/4] Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

REM Start Frontend
echo  [4/4] Starting Frontend (port 5173)...
start "GymPro Frontend :5173" cmd /k "cd /d "%~dp0client" && echo Starting GymPro Frontend... && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ============================================
echo    GymPro is RUNNING!
echo  ============================================
echo.
echo    Web App  :  http://localhost:5173
echo    API      :  http://localhost:3001/api
echo    Health   :  http://localhost:3001/api/health
echo.
echo    Login    :  admin@gym.com
echo    Password :  admin123
echo.
echo    Roles Available:
echo      Admin     - Full access (all modules)
echo      Trainer   - Members + Attendance
echo      Reception - Members + Attendance + Subscriptions
echo.
echo  ============================================
echo  Close this window to keep servers running.
echo  Close the two terminal windows to STOP.
echo  ============================================
echo.
pause
