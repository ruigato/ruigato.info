@echo off
setlocal

set "CLOUDFLARED=cloudflared"
set "TUNNEL_NAME=ruigato-prod"
set "TUNNEL_CONFIG=C:\Users\gator\.cloudflared\ruigato-prod.yml"

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

netstat -ano | findstr /r /c:":80 .*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Apache parece nao estar a ouvir na porta 80.
    echo O tunnel vai arrancar, mas o site pode nao responder ate iniciares o Apache.
)

start "ruigato-prod-tunnel" /min %CLOUDFLARED% tunnel --config "%TUNNEL_CONFIG%" run %TUNNEL_NAME%
echo Tunnel "%TUNNEL_NAME%" iniciado em janela minimizada.

endlocal
exit /b 0
