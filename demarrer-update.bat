@echo off
echo.
echo ========================================
echo   SLFP - Demarrer la mise a jour auto
echo ========================================
echo.
echo Ce script surveille votre dossier et
echo met a jour le site automatiquement.
echo.
echo Appuyez sur une touche pour demarrer...
pause > nul

powershell -ExecutionPolicy Bypass -File "%~dp0auto-update.ps1"
