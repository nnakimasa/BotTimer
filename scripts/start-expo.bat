@echo off
cd /d "%~dp0.."

echo ============================================
echo  BotTimer Expo Dev Server
echo ============================================
echo.
echo Expo Go: Scan QR code with Expo Go app
echo Web    : Press 'w'
echo Android: Press 'a'
echo iOS    : Press 'i'
echo Stop   : Press Ctrl+C
echo.

call npx expo start

echo.
echo Server stopped.
pause
