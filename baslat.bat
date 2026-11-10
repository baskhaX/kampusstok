@echo off
chcp 65001 >nul
echo ========================================================
echo  KAMPÜSSTOK - KIRTASİYE TALEP VE DEPO YÖNETİM SİSTEMİ
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js sisteminizde kurulu bulunamadı!
    echo Lütfen https://nodejs.org adresinden Node.js 20+ sürümünü kurunuz.
    pause
    exit /b 1
)

if not exist ".env" (
    echo [.env Bulunamadı] .env.example dosyasından .env oluşturuluyor...
    copy .env.example .env >nul
)

if not exist "node_modules" (
    echo [Bağımlılıklar Eksik] Paketler yükleniyor...
    call npm install
)

echo.
echo [BAŞLATILIYOR] Sistem yerel ağa ve localhost'a açılıyor...
echo Tarayıcınızdan http://localhost:3001 adresini açabilirsiniz.
echo.
call npm start
pause
