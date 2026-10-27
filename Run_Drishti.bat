@echo off
title Drishti Glaucoma Detection System
color 0A

echo =======================================================
echo     DRISHTI GLAUCOMA DETECTION SYSTEM LAUNCHER
echo =======================================================
echo.

:: Check if MySQL is running on port 3306
netstat -ano | findstr :3306 >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] MySQL is running on port 3306.
) else (
    echo [WARNING] MySQL is not detected on port 3306!
    echo.
    echo Please open XAMPP Control Panel and click "Start" next to MySQL.
    echo Opening XAMPP Control Panel now...
    if exist "C:\xampp\xampp-control.exe" (
        start "" "C:\xampp\xampp-control.exe"
    )
    echo.
    echo After starting MySQL in XAMPP, press any key to continue...
    pause >nul
)

echo.
echo [INFO] Starting Drishti web application...
echo [INFO] Opening browser at http://127.0.0.1:8000 ...

:: Launch browser in 2 seconds
start "" timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000

:: Start Flask app with virtual environment python
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" app.py
) else (
    python app.py
)

pause
