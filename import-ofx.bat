@echo off
title MoneyPM — Import OFX
cd /d "%~dp0"

if "%~1"=="" (
  echo.
  echo  Usage : import-ofx.bat ^<dossier^> [--recurse]
  echo.
  echo  Exemples :
  echo    import-ofx.bat sources_OFX\2026
  echo    import-ofx.bat sources_OFX --recurse
  echo.
  pause
  exit /b 1
)

echo.
npm run import-ofx -- %*
echo.
pause
