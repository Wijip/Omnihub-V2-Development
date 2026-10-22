@echo off
cd /d "%~dp0"
title OmniHub Reporting Server
set OMNIHUB_MANAGED_RESTART=1

:server_loop
cls
echo ========================================================
echo   Memulai OmniHub Reporting Server Control Center...
echo ========================================================
call npm run dev
set EXIT_STATUS=%ERRORLEVEL%

if "%EXIT_STATUS%"=="42" (
    echo.
    echo ========================================================
    echo  [RESTART] Sinyal reboot diterima (Kode 42).
    echo  Memulai ulang OmniHub Server dalam 1 detik...
    echo ========================================================
    timeout /t 1 /nobreak >nul
    goto server_loop
)

echo.
echo ========================================================
echo  Server OmniHub telah dinonaktifkan (Exit Code: %EXIT_STATUS%).
echo ========================================================
pause
