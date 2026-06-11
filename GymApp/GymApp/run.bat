@echo off
cd /d "%~dp0"
if not exist "data\plan.json" (
    echo Importing Excel plan...
    .venv\Scripts\python.exe import_plan.py
)
echo Starting GymApp...
start http://127.0.0.1:8765
.venv\Scripts\python.exe server.py
