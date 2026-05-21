@echo off
REM ============================================================
REM entrópica · local dev launcher
REM ------------------------------------------------------------
REM double-click this file to start the dev server.
REM it handles the windows tls cert workaround automatically.
REM ============================================================

cd /d "%~dp0"
set "NODE_EXTRA_CA_CERTS=%~dp0..\.windows-ca.pem"

echo.
echo  entrópica dev server
echo  ----------------------------------------
echo  english: http://localhost:4321
echo  spanish: http://localhost:4321/es
echo  ----------------------------------------
echo  press ctrl+c to stop.
echo.

call npm run dev

pause
