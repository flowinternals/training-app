@echo off
echo Killing any processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Killing process %%a
    taskkill /f /pid %%a
)

echo Starting development server...
npm run dev

pause
