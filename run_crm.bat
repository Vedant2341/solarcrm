@echo off
title Solar Ahmedabad CRM Launcher
echo ==============================================
echo       Solar Ahmedabad CRM Launcher
echo ==============================================
echo.
echo Starting development server...

cd /d "%~dp0"

:: Start the Vite server in the background of this terminal
start /b npm run dev

echo Waiting for server to initialize...
timeout /t 2 /nobreak > nul

echo Opening CRM in your default browser...
start http://localhost:5173/

echo.
echo ==============================================
echo Solar Ahmedabad CRM is now active!
echo.
echo -> Keep this command window open while using the CRM.
echo -> Close this window (or press Ctrl+C) to turn off the server.
echo ==============================================
echo.

:: Keep window open so the background npm process doesn't terminate immediately
pause > nul
