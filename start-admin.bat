@echo off
cd /d "%~dp0"
if not defined HOST set "HOST=127.0.0.1"
if not defined DATA_DIR set "DATA_DIR=%~dp0.render-data"
if not defined ADMIN_PASSWORD set "ADMIN_PASSWORD=local-admin"
echo Local editor password: %ADMIN_PASSWORD%
start "" "http://localhost:4173/admin.html"
node admin-server.js
pause
