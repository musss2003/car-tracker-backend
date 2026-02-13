#!/bin/bash

# Car Tracker Security Monitoring Script
# Run this script to view current security status and threats

set -e

COLOR_RESET="\033[0m"
COLOR_RED="\033[0;31m"
COLOR_GREEN="\033[0;32m"
COLOR_YELLOW="\033[0;33m"
COLOR_BLUE="\033[0;34m"

echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}   Car Tracker Security Monitoring Report${COLOR_RESET}"
echo -e "${COLOR_BLUE}   Generated: $(date)${COLOR_RESET}"
echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"
echo ""

# Check if running as sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${COLOR_YELLOW}Warning: Some commands require sudo. Run with 'sudo ./monitor-security.sh' for full report.${COLOR_RESET}"
    echo ""
fi

# 1. Top Failed Access IPs
echo -e "${COLOR_GREEN}=== Top 10 Failed Access IPs (403/404/429) ===${COLOR_RESET}"
if [ -f /var/log/nginx/access.log ]; then
    grep -E " (403|404|429) " /var/log/nginx/access.log 2>/dev/null | \
      awk '{print $1}' | sort | uniq -c | sort -rn | head -10 | \
      while read count ip; do
        echo -e "  ${COLOR_RED}$ip${COLOR_RESET}: $count attempts"
      done
else
    echo -e "  ${COLOR_YELLOW}Nginx access log not found${COLOR_RESET}"
fi
echo ""

# 2. Blocked Scanner Attempts (Last 24h)
echo -e "${COLOR_GREEN}=== Blocked Scanner Attempts (Last 24h) ===${COLOR_RESET}"
if [ -f /var/log/nginx/access.log ]; then
    TODAY=$(date --date='1 day ago' '+%d/%b/%Y' 2>/dev/null || date -v-1d '+%d/%b/%Y')
    SCANNER_COUNT=$(grep "$TODAY" /var/log/nginx/access.log 2>/dev/null | \
      grep -E "(phpmyadmin|wp-admin|\.php|geoserver|containers|\.env|\.git)" | wc -l)
    echo -e "  ${COLOR_RED}$SCANNER_COUNT${COLOR_RESET} scanner requests blocked"
else
    echo -e "  ${COLOR_YELLOW}Nginx access log not found${COLOR_RESET}"
fi
echo ""

# 3. Rate Limit Blocks
echo -e "${COLOR_GREEN}=== Rate Limit Blocks (Last Hour) ===${COLOR_RESET}"
if [ -f /var/log/nginx/error.log ]; then
    HOUR=$(date --date='1 hour ago' '+%d/%b/%Y:%H' 2>/dev/null || date -v-1H '+%d/%b/%Y:%H')
    RATE_LIMIT_COUNT=$(grep "$HOUR" /var/log/nginx/error.log 2>/dev/null | \
      grep "limiting requests" | wc -l)
    echo -e "  ${COLOR_RED}$RATE_LIMIT_COUNT${COLOR_RESET} requests rate-limited"
else
    echo -e "  ${COLOR_YELLOW}Nginx error log not found${COLOR_RESET}"
fi
echo ""

# 4. Fail2ban Status
echo -e "${COLOR_GREEN}=== Fail2ban Status ===${COLOR_RESET}"
if command -v fail2ban-client &> /dev/null; then
    if [ "$EUID" -eq 0 ]; then
        # Get all jails
        JAILS=$(fail2ban-client status 2>/dev/null | grep "Jail list" | sed 's/.*://;s/,//g')
        
        TOTAL_BANNED=0
        for jail in $JAILS; do
            BANNED=$(fail2ban-client status $jail 2>/dev/null | grep "Currently banned" | awk '{print $NF}')
            TOTAL_BANNED=$((TOTAL_BANNED + BANNED))
            if [ "$BANNED" -gt 0 ]; then
                echo -e "  ${COLOR_YELLOW}$jail${COLOR_RESET}: ${COLOR_RED}$BANNED${COLOR_RESET} IPs banned"
            fi
        done
        
        echo -e "  ${COLOR_GREEN}Total Banned IPs:${COLOR_RESET} ${COLOR_RED}$TOTAL_BANNED${COLOR_RESET}"
    else
        echo -e "  ${COLOR_YELLOW}Run with sudo to see Fail2ban status${COLOR_RESET}"
    fi
else
    echo -e "  ${COLOR_YELLOW}Fail2ban not installed${COLOR_RESET}"
fi
echo ""

# 5. System Resources
echo -e "${COLOR_GREEN}=== System Resources ===${COLOR_RESET}"
echo -e "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo -e "  Memory: $(free -h | awk '/^Mem:/ {printf "%s / %s (%.1f%%)", $3, $2, $3/$2*100}')"
echo -e "  Disk Usage: $(df -h / | awk 'NR==2 {print $3 " / " $2 " (" $5 ")"}')"
echo ""

# 6. Recent Attack Patterns
echo -e "${COLOR_GREEN}=== Most Common Attack Patterns (Last 100 failures) ===${COLOR_RESET}"
if [ -f /var/log/nginx/access.log ]; then
    grep -E " (403|404) " /var/log/nginx/access.log 2>/dev/null | tail -100 | \
      awk '{print $7}' | grep -E "(phpmyadmin|wp-admin|\.php|geoserver|containers|\.env)" | \
      sort | uniq -c | sort -rn | head -5 | \
      while read count path; do
        echo -e "  ${COLOR_RED}$path${COLOR_RESET}: $count attempts"
      done
else
    echo -e "  ${COLOR_YELLOW}No recent patterns detected${COLOR_RESET}"
fi
echo ""

# 7. Nginx Status
echo -e "${COLOR_GREEN}=== Nginx Status ===${COLOR_RESET}"
if systemctl is-active --quiet nginx; then
    echo -e "  Status: ${COLOR_GREEN}Running${COLOR_RESET}"
    echo -e "  Active Connections: $(curl -s localhost/nginx_status 2>/dev/null | grep 'Active' || echo 'N/A')"
else
    echo -e "  Status: ${COLOR_RED}Not Running${COLOR_RESET}"
fi
echo ""

# 8. Backend Application Status
echo -e "${COLOR_GREEN}=== Backend Application Status ===${COLOR_RESET}"
if systemctl is-active --quiet car-tracker-backend 2>/dev/null || pgrep -f "node.*app.ts" > /dev/null; then
    echo -e "  Status: ${COLOR_GREEN}Running${COLOR_RESET}"
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null || echo "000")
    if [ "$HEALTH_STATUS" = "200" ]; then
        echo -e "  Health Check: ${COLOR_GREEN}OK${COLOR_RESET}"
    else
        echo -e "  Health Check: ${COLOR_RED}FAILED (HTTP $HEALTH_STATUS)${COLOR_RESET}"
    fi
else
    echo -e "  Status: ${COLOR_RED}Not Running${COLOR_RESET}"
fi
echo ""

# 9. Top User Agents
echo -e "${COLOR_GREEN}=== Top 5 User Agents (Failed Requests) ===${COLOR_RESET}"
if [ -f /var/log/nginx/access.log ]; then
    grep -E " (403|404) " /var/log/nginx/access.log 2>/dev/null | tail -100 | \
      awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head -5 | \
      while read count agent; do
        echo -e "  ${COLOR_YELLOW}$agent${COLOR_RESET}: $count requests"
      done
else
    echo -e "  ${COLOR_YELLOW}No data available${COLOR_RESET}"
fi
echo ""

# 10. Security Recommendations
echo -e "${COLOR_BLUE}=== Security Recommendations ===${COLOR_RESET}"
RECOMMENDATIONS=0

# Check if port 5001 is exposed
if netstat -tuln 2>/dev/null | grep -q "0.0.0.0:5001"; then
    echo -e "  ${COLOR_RED}⚠ Port 5001 is exposed to 0.0.0.0 (should be 127.0.0.1 only)${COLOR_RESET}"
    RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
fi

# Check if Fail2ban is installed
if ! command -v fail2ban-client &> /dev/null; then
    echo -e "  ${COLOR_YELLOW}⚠ Install Fail2ban for automatic IP blocking${COLOR_RESET}"
    RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
fi

# Check if UFW is enabled
if command -v ufw &> /dev/null; then
    if ! ufw status 2>/dev/null | grep -q "Status: active"; then
        echo -e "  ${COLOR_YELLOW}⚠ Enable UFW firewall for additional protection${COLOR_RESET}"
        RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
    fi
fi

# Check if SSL is configured
if [ -f /etc/nginx/sites-enabled/car-tracker ]; then
    if ! grep -q "ssl_certificate" /etc/nginx/sites-enabled/car-tracker; then
        echo -e "  ${COLOR_YELLOW}⚠ Configure SSL/TLS with Let's Encrypt${COLOR_RESET}"
        RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
    fi
fi

if [ "$RECOMMENDATIONS" -eq 0 ]; then
    echo -e "  ${COLOR_GREEN}✓ All security checks passed!${COLOR_RESET}"
fi
echo ""

echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}   Report Complete${COLOR_RESET}"
echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"

# Optional: Send email report (requires mailutils)
# if command -v mail &> /dev/null; then
#     echo "Send this report via email? (y/n)"
#     read -r SEND_EMAIL
#     if [ "$SEND_EMAIL" = "y" ]; then
#         $0 | mail -s "Car Tracker Security Report - $(date)" your@email.com
#         echo "Report sent to your@email.com"
#     fi
# fi
