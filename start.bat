@echo off
title MoneyPM
cd /d "%~dp0"

echo.
echo  Starting MoneyPM...
echo.

:: Ouverture du navigateur apres 4 secondes (laisse le temps au serveur de demarrer)
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Lancement du serveur Nuxt (bloque jusqu'a Ctrl+C)
npm run dev
