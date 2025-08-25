@echo off
echo 🏋️ Starting TrainerLocator...
echo.

echo 📡 Starting Backend Server...
start "TrainerLocator Server" cmd /k "cd server && npm run dev"

echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

echo 🌐 Starting Frontend Client...
start "TrainerLocator Client" cmd /k "cd client && npm run dev"

echo.
echo ✅ TrainerLocator is starting up!
echo 📍 Server: http://localhost:5000
echo 🌐 Client: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul 