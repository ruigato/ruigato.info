@echo off
setlocal

set "XAMPP_ROOT=C:\xampp"
set "CLOUDFLARED=cloudflared"
set "TUNNEL_NAME=ruigato-prod"
set "TUNNEL_CONFIG=C:\Users\gator\.cloudflared\ruigato-prod.yml"

if not exist "%XAMPP_ROOT%\mysql\bin\mysqld.exe" (
    echo [ERROR] Nao encontrei %XAMPP_ROOT%\mysql\bin\mysqld.exe
    pause
    exit /b 1
)

if not exist "%XAMPP_ROOT%\apache\bin\httpd.exe" (
    echo [ERROR] Nao encontrei %XAMPP_ROOT%\apache\bin\httpd.exe
    pause
    exit /b 1
)

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

echo [1/3] A iniciar MySQL...
start "ruigato-mysql" /min "%XAMPP_ROOT%\mysql\bin\mysqld.exe" --defaults-file="%XAMPP_ROOT%\mysql\bin\my.ini" --standalone

echo [2/3] A iniciar Apache...
start "ruigato-apache" /min "%XAMPP_ROOT%\apache\bin\httpd.exe" -d "C:/xampp/apache"

timeout /t 4 >nul

echo [3/3] A iniciar tunnel ruigato-prod...
start "ruigato-tunnel" /min %CLOUDFLARED% tunnel --config "%TUNNEL_CONFIG%" run %TUNNEL_NAME%

echo.
echo Concluido. Verifica:
echo - http://localhost/
echo - https://ruigato.info/
echo.

endlocal
exit /b 0
