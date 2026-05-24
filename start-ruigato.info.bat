@echo off
setlocal

set "CLOUDFLARED=cloudflared"
set "TUNNEL_NAME=ruigato-prod"
set "TUNNEL_CONFIG=C:\Users\gator\.cloudflared\ruigato-prod.yml"
set "START_DEV_SCRIPT=%~dp0start-dev.bat"

where %CLOUDFLARED% >nul 2>&1
if errorlevel 1 (
    echo [ERROR] cloudflared nao encontrado no PATH.
    echo Instala ou adiciona cloudflared ao PATH e tenta novamente.
    pause
    exit /b 1
)

if not exist "%TUNNEL_CONFIG%" (
    echo [ERROR] Ficheiro de config nao encontrado:
    echo %TUNNEL_CONFIG%
    pause
    exit /b 1
)

if not exist "%START_DEV_SCRIPT%" (
    echo [ERROR] Ficheiro nao encontrado:
    echo %START_DEV_SCRIPT%
    pause
    exit /b 1
)

echo [1/2] A iniciar o front-end novo em localhost:80...
start "ruigato-web" /min "%START_DEV_SCRIPT%"

timeout /t 4 >nul

echo [2/2] A iniciar tunnel ruigato-prod...
start "ruigato-tunnel" /min %CLOUDFLARED% tunnel --config "%TUNNEL_CONFIG%" run %TUNNEL_NAME%

echo.
echo Concluido. Verifica:
echo - http://localhost/
echo - https://ruigato.info/
echo.

endlocal
exit /b 0
