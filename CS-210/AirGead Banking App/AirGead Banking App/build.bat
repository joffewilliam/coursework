@echo off
chcp 65001>nul
C:\MinGW\bin\g++.exe -fdiagnostics-color=always -g "C:\Users\dragg\source\repos\AirGead Banking App\main.cpp" "C:\Users\dragg\source\repos\AirGead Banking App\InvestmentCalculator.cpp" "C:\Users\dragg\source\repos\AirGead Banking App\BankingUI.cpp" -o "C:\Users\dragg\source\repos\AirGead Banking App\main.exe"
if %ERRORLEVEL% EQU 0 (
    echo Build successful!
    echo Running program...
    "C:\Users\dragg\source\repos\AirGead Banking App\main.exe"
) else (
    echo Build failed!
)
pause
