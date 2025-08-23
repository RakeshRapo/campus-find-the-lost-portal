@echo off
chcp 65001 >nul
title Campus Find the Lost Portal - Deployment Script

echo 🎯 Campus Find the Lost Portal - Deployment Script
echo ==================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo [INFO] Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Dependencies installed successfully!
)

echo [INFO] Testing the application locally...
npm run migrate

echo [INFO] Starting Excel backend server...
start /B npm run start:excel

REM Wait for server to start
timeout /t 5 /nobreak >nul

echo.
echo 🎉 Your application is ready for deployment!
echo.
echo 📋 Next steps:
echo 1. Push your code to GitHub:
echo    git add .
echo    git commit -m "Prepare for deployment"
echo    git push origin main
echo.
echo 2. Choose a deployment platform:
echo    🌟 Heroku (Recommended for beginners):
echo       - Go to heroku.com and create an account
echo       - Install Heroku CLI
echo       - Run: heroku create your-app-name
echo       - Run: git push heroku main
echo.
echo    🚄 Railway:
echo       - Go to railway.app and sign in with GitHub
echo       - Create new project from GitHub repo
echo.
echo    🎨 Render:
echo       - Go to render.com and sign in with GitHub
echo       - Create new web service from GitHub repo
echo.
echo    ⚡ Vercel:
echo       - Go to vercel.com and sign in with GitHub
echo       - Import your repository
echo.
echo 📚 For detailed instructions, see DEPLOYMENT.md
echo.

REM Ask user if they want to stop the local server
set /p stop_server="Do you want to stop the local server? (y/n): "
if /i "%stop_server%"=="y" (
    echo [INFO] Stopping local server...
    taskkill /f /im node.exe >nul 2>&1
    echo [SUCCESS] Local server stopped.
) else (
    echo [INFO] Local server is still running at http://localhost:3000
    echo [INFO] You can stop it later by closing the terminal or running: taskkill /f /im node.exe
)

echo.
echo [SUCCESS] Deployment preparation completed! 🚀
echo Check DEPLOYMENT.md for detailed deployment instructions.
echo.
pause
