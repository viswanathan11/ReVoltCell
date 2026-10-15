@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges to unblock ESP32...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo [1/3] Setting Wi-Fi network 'sooraj' to Private...
powershell -Command "Set-NetConnectionProfile -Name 'sooraj' -NetworkCategory Private"

echo [2/3] Disabling Node.js inbound block rule...
powershell -Command "Get-NetFirewallRule -DisplayName '*node*' | Where-Object { $_.Action -eq 'Block' } | Disable-NetFirewallRule"

echo [3/3] Adding Inbound Allow Rule for ReVoltCell Port 3000...
netsh advfirewall firewall delete rule name="ReVoltCell ESP32 Port 3000" >nul 2>&1
netsh advfirewall firewall add rule name="ReVoltCell ESP32 Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any

echo.
echo ============================================================
echo SUCCESS: Network and Firewall configured for ReVoltCell ESP32!
echo Your ESP32 at 192.168.1.11 can now connect to 192.168.1.10:3000!
echo ============================================================
timeout /t 5
