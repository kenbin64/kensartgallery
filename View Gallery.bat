@echo off
rem Double-click this file to look at the gallery on this computer.
rem It starts the small local server (serve.js) and opens the gallery in your browser.
rem Leave this window open while you look. Close it when you are done.
cd /d "%~dp0"
echo Starting the gallery at http://localhost:8080 ...
start "" http://localhost:8080
node serve.js
pause
