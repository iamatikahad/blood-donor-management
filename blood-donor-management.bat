@echo off
title Blood Donor Management System
color 0A
echo ===================================
echo   ব্লাড ডোনার ম্যানেজমেন্ট সিস্টেম
echo ===================================
echo.

C:
cd /d "C:\Users\User\Pictures\blood-donor-management"

echo [✓] ফোল্ডারে ঢুকলাম: %cd%
echo.

echo npm ইনস্টল চেক করছি...
call npm install > nul 2>&1
echo [✓] npm ইনস্টল ঠিক আছে
echo.

echo সার্ভার স্টার্ট হচ্ছে...
echo [i] ব্রাউজারে http://localhost:3000 ওপেন হবে
echo.

start cmd /k "npm start"
timeout /t 2 > nul
start "" "http://localhost:3000"

echo.
echo ===================================
echo [✓] সবকিছু ঠিক আছে!
echo [i] সার্ভার চলছে - ব্রাউজার খুলেছে
echo [i] এই উইন্ডো বন্ধ করতে যেকোনো কী চাপুন
echo ===================================
pause > nul
exit