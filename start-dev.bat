@echo off
setlocal
cd /d "%~dp0web"

where npm >nul 2>nul || (
  echo [ERRO] npm nao encontrado. Instala Node.js ^(LTS^) e volta a tentar.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo A instalar dependencias npm...
  call npm install || exit /b 1
)

echo.
echo A arrancar o servidor de desenvolvimento em http://localhost/
echo Fecha esta janela ou Ctrl+C para parar.
echo.
call npm run dev
