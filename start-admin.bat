@echo off
cd /d "%~dp0"
start "" "http://localhost:4173/admin.html"
node admin-server.js
pause
