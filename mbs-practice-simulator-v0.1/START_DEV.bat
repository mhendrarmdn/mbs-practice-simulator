@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   MBS Practice Simulator v0.1
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js belum terpasang atau belum masuk PATH.
  echo Install Node.js 18+ lalu jalankan file ini lagi.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/2] Menginstall dependency...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install gagal.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Dependency sudah tersedia.
)

echo [2/2] Menjalankan development server...
call npm run dev
