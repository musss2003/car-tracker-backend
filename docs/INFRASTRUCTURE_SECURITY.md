# 🔒 Infrastructure Security Hardening Guide

> **CRITICAL**: This guide addresses infrastructure-level security for your EC2 deployment. The application-level security (rate limiting, CORS, audit logging) is already implemented. This focuses on protecting the server itself.

---

## 🚨 Current Security Issues

Your EC2 instance is **publicly exposed** and being actively scanned by bots:

- ✅ **Application security**: Rate limiting, CORS, JWT auth ✓
- ❌ **Infrastructure security**: EC2 Security Groups, Nginx, Fail2ban ✗
- ❌ **Network security**: No CDN/WAF protection ✗

**Evidence from audit logs**:

```
GET /containers/json       # Docker API probe
GET /geoserver/web/        # GeoServer exploit attempt
GET /owa/auth/logon.aspx   # Outlook Web Access scan
PROPFIND /                 # WebDAV probe
POST /hello.world          # Generic scanner
```

---

## 📋 Implementation Checklist

### Phase 1: Immediate (30 minutes) - CRITICAL

- [ ] **1.1** Configure EC2 Security Groups
- [ ] **1.2** Install and configure Nginx reverse proxy
- [ ] **1.3** Restart backend to listen on localhost only

### Phase 2: High Priority (1 hour)

- [ ] **2.1** Install and configure Fail2ban
- [ ] **2.2** Set up automated log monitoring
- [ ] **2.3** Configure UFW firewall rules

### Phase 3: Recommended (2-4 hours)

- [ ] **3.1** Set up AWS CloudFront CDN
- [ ] **3.2** Configure AWS WAF (Web Application Firewall)
- [ ] **3.3** Implement SSL/TLS with Let's Encrypt
- [ ] **3.4** Set up CloudWatch alerts

---

## 🛡️ Phase 1: Immediate Security (CRITICAL)

### 1.1 EC2 Security Group Configuration

**AWS Console → EC2 → Security Groups → Your SG → Edit Inbound Rules**

```yaml
# BEFORE (INSECURE - DON'T DO THIS)
Type            Protocol    Port Range    Source
All Traffic     All         All           0.0.0.0/0

# AFTER (SECURE)
Type            Protocol    Port Range    Source              Description
SSH             TCP         22            YOUR_IP/32          Your IP only
HTTP            TCP         80            0.0.0.0/0           Public web traffic
HTTPS           TCP         443           0.0.0.0/0           Public web traffic (SSL)
Custom TCP      TCP         5001          127.0.0.1/32        App port (localhost only)
```

**Get your IP address**:

```bash
curl ifconfig.me
# Example output: 203.0.113.45
# Use: 203.0.113.45/32 in Security Group
```

**⚠️ NEVER expose port 5001 to 0.0.0.0/0**

---

### 1.2 Install Nginx Reverse Proxy

**On your EC2 instance**:

```bash
# 1. Install Nginx
sudo apt update
sudo apt install nginx -y

# 2. Create configuration
sudo nano /etc/nginx/sites-available/car-tracker
```

**Nginx Configuration** (`/etc/nginx/sites-available/car-tracker`):

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=2r/s;

# Block bad user agents
map $http_user_agent $bad_bot {
    default 0;
    ~*(bot|crawler|spider|scraper|scanner|nikto|sqlmap|masscan) 1;
    ~*(acunetix|nessus|openvas|qualys|nmap|metasploit) 1;
}

server {
    listen 80;
    server_name cartrackerbooo.mooo.com;  # Replace with your domain

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Block bad bots
    if ($bad_bot) {
        return 403 "Bot traffic not allowed";
    }

    # Block suspicious paths immediately
    location ~ /\. {
        deny all;
        return 404;
    }

    location ~ \.(php|aspx|asp|cgi|jsp)$ {
        deny all;
        return 403 "Forbidden file type";
    }

    location ~ /(wp-admin|wp-content|phpmyadmin|admin|geoserver|webui) {
        deny all;
        return 403 "Path not found";
    }

    # API endpoints - strict rate limiting
    location /api/auth {
        limit_req zone=auth_limit burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # All other API routes
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check - no rate limit
    location /health {
        proxy_pass http://127.0.0.1:5001;
        access_log off;
    }

    # Default route - block everything else
    location / {
        return 404 "Not found";
    }

    # Custom error pages
    error_page 403 /403.html;
    error_page 404 /404.html;
    error_page 429 /429.html;
    error_page 500 502 503 504 /50x.html;
}
```

**Enable and start**:

```bash
# 3. Enable the site
sudo ln -s /etc/nginx/sites-available/car-tracker /etc/nginx/sites-enabled/

# 4. Remove default site
sudo rm /etc/nginx/sites-enabled/default

# 5. Test configuration
sudo nginx -t

# 6. Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# 7. Check status
sudo systemctl status nginx
```

---

### 1.3 Configure Backend to Listen on Localhost Only

**Edit your backend `.env` or startup script**:

```bash
# /home/ubuntu/car-tracker-backend/.env
PORT=5001
HOST=127.0.0.1  # Add this line if not present
```

**Verify in app.ts (should already have this)**:

```typescript
server.listen(PORT, '0.0.0.0', () => {  // Change to '127.0.0.1'
```

Should be:

```typescript
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

**Restart backend**:

```bash
# Using PM2
pm2 restart car-tracker-backend

# Or systemd
sudo systemctl restart car-tracker-backend
```

---

## 🛡️ Phase 2: High Priority Security

### 2.1 Install Fail2ban (Auto-blocks malicious IPs)

```bash
# 1. Install
sudo apt install fail2ban -y

# 2. Create Nginx jail configuration
sudo nano /etc/fail2ban/jail.d/nginx.conf
```

**Fail2ban Configuration** (`/etc/fail2ban/jail.d/nginx.conf`):

```ini
[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 3
bantime  = 3600
findtime = 600

[nginx-noscript]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 5
bantime  = 7200

[nginx-badbots]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 2
bantime  = 86400
findtime = 60

[nginx-noproxy]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 2
bantime  = 86400

[nginx-req-limit]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
findtime = 60
bantime  = 3600
```

**Create custom filter for scanner detection**:

```bash
sudo nano /etc/fail2ban/filter.d/nginx-scanner.conf
```

**Content**:

```ini
[Definition]
failregex = ^<HOST> .*(GET|POST).*(phpmyadmin|wp-admin|\.php|\.env|\.git|geoserver|containers/json).*$
ignoreregex =
```

**Add scanner jail**:

```bash
sudo nano /etc/fail2ban/jail.d/scanner.conf
```

```ini
[nginx-scanner]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
filter   = nginx-scanner
maxretry = 1
bantime  = 604800  # 7 days
findtime = 60
```

**Start Fail2ban**:

```bash
# Restart to apply config
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status nginx-scanner

# View banned IPs
sudo fail2ban-client status nginx-badbots
```

---

### 2.2 Set Up Log Monitoring

**Create monitoring script** (`/home/ubuntu/monitor-security.sh`):

```bash
#!/bin/bash

echo "=== Security Monitoring Report ==="
echo "Generated: $(date)"
echo ""

echo "=== Top 10 Failed Access IPs ==="
grep -E "403|404|429" /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -10
echo ""

echo "=== Blocked Scanner Attempts (Last 24h) ==="
grep "$(date --date='1 day ago' '+%d/%b/%Y')" /var/log/nginx/access.log | \
  grep -E "(phpmyadmin|wp-admin|\.php|geoserver|containers)" | wc -l
echo ""

echo "=== Currently Banned IPs (Fail2ban) ==="
sudo fail2ban-client status nginx-scanner | grep "Banned IP" | wc -l
echo ""

echo "=== Top Banned IPs ==="
sudo fail2ban-client status nginx-scanner | grep "Banned IP list"
echo ""

echo "=== Rate Limit Blocks (Last Hour) ==="
grep "$(date --date='1 hour ago' '+%d/%b/%Y:%H')" /var/log/nginx/error.log | \
  grep "limiting requests" | wc -l
```

**Make executable and run**:

```bash
chmod +x /home/ubuntu/monitor-security.sh

# Run manually
./monitor-security.sh

# Or add to cron for daily email
crontab -e
# Add: 0 9 * * * /home/ubuntu/monitor-security.sh | mail -s "Security Report" your@email.com
```

---

### 2.3 Configure UFW Firewall

```bash
# Enable UFW
sudo ufw enable

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (your IP only)
sudo ufw allow from YOUR_IP_ADDRESS to any port 22

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status verbose

# Enable on boot
sudo systemctl enable ufw
```

---

## 🛡️ Phase 3: Advanced Security (Recommended)

### 3.1 AWS CloudFront CDN Setup

**Benefits**:

- Hides your EC2 IP address
- DDoS protection
- Global caching and performance
- SSL/TLS termination

**Steps**:

1. **AWS Console → CloudFront → Create Distribution**

2. **Origin Settings**:
   - Origin Domain: `your-ec2-ip.compute.amazonaws.com`
   - Protocol: HTTP only (Nginx handles SSL)
   - Origin Shield: Disabled (small traffic)

3. **Default Cache Behavior**:
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Cache Policy: CachingDisabled (for API)

4. **Distribution Settings**:
   - Alternate Domain Names (CNAMEs): `cartrackerbooo.mooo.com`
   - SSL Certificate: Request certificate via ACM

5. **Update DNS**:
   ```
   cartrackerbooo.mooo.com → CloudFront distribution domain
   ```

---

### 3.2 AWS WAF Configuration

**AWS Console → WAF → Create Web ACL**

**Managed Rules to Enable** (Free tier available):

- ✅ **Core Rule Set**: SQL injection, XSS protection
- ✅ **Known Bad Inputs**: Common attack patterns
- ✅ **IP Reputation List**: Known malicious IPs
- ✅ **Anonymous IP List**: VPNs, proxies, Tor

**Custom Rules**:

```json
{
  "Name": "BlockScannerPaths",
  "Priority": 1,
  "Statement": {
    "OrStatement": {
      "Statements": [
        {
          "ByteMatchStatement": {
            "SearchString": "phpmyadmin",
            "FieldToMatch": { "UriPath": {} },
            "TextTransformations": [{ "Priority": 0, "Type": "LOWERCASE" }]
          }
        },
        {
          "ByteMatchStatement": {
            "SearchString": "wp-admin",
            "FieldToMatch": { "UriPath": {} },
            "TextTransformations": [{ "Priority": 0, "Type": "LOWERCASE" }]
          }
        }
      ]
    }
  },
  "Action": { "Block": {} },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "BlockedScanners"
  }
}
```

**Estimated Cost**: $5-10/month for small traffic

---

### 3.3 SSL/TLS with Let's Encrypt

```bash
# 1. Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# 2. Obtain certificate
sudo certbot --nginx -d cartrackerbooo.mooo.com

# 3. Auto-renewal (already configured)
sudo systemctl status certbot.timer

# 4. Test renewal
sudo certbot renew --dry-run
```

**Nginx will be auto-updated to**:

```nginx
server {
    listen 443 ssl http2;
    server_name cartrackerbooo.mooo.com;

    ssl_certificate /etc/letsencrypt/live/cartrackerbooo.mooo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cartrackerbooo.mooo.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}

server {
    listen 80;
    server_name cartrackerbooo.mooo.com;
    return 301 https://$server_name$request_uri;
}
```

---

### 3.4 CloudWatch Alerts

**Create SNS Topic**:

```bash
aws sns create-topic --name car-tracker-security-alerts
aws sns subscribe --topic-arn arn:aws:sns:REGION:ACCOUNT:car-tracker-security-alerts \
  --protocol email --notification-endpoint your@email.com
```

**CloudWatch Alarms**:

1. **High CPU usage** (>80% for 5 min)
2. **High network traffic** (DDoS indicator)
3. **Failed SSH attempts** (brute force)
4. **Disk usage** (>85%)

---

## 📊 Verification & Testing

### After Implementation Checklist

```bash
# 1. Test Nginx is blocking scanners
curl http://your-domain/phpmyadmin
# Expected: 403 Forbidden

# 2. Test rate limiting
for i in {1..30}; do curl http://your-domain/api/auth/login; done
# Expected: 429 Too Many Requests after ~10 requests

# 3. Verify Fail2ban is working
sudo fail2ban-client status nginx-scanner
# Expected: Banned IPs listed

# 4. Check backend is only on localhost
sudo netstat -tulpn | grep 5001
# Expected: 127.0.0.1:5001 (NOT 0.0.0.0:5001)

# 5. Test from external IP
curl your-domain:5001/api/health
# Expected: Connection refused (good!)

# 6. Test through Nginx
curl your-domain/api/health
# Expected: 200 OK
```

---

## 🚨 Incident Response

### If You're Under Attack

```bash
# 1. View current attacking IPs
sudo tail -f /var/log/nginx/access.log | grep -E "403|404|429"

# 2. Ban specific IP immediately
sudo fail2ban-client set nginx-scanner banip 203.0.113.45

# 3. View all banned IPs
sudo fail2ban-client status nginx-scanner

# 4. Unban IP (if false positive)
sudo fail2ban-client set nginx-scanner unbanip 203.0.113.45

# 5. Increase rate limits temporarily (in Nginx config, then reload)
sudo systemctl reload nginx
```

### Emergency Mode - Block All Non-Essential Traffic

```nginx
# Add to Nginx config temporarily
location / {
    # Whitelist your IP only
    allow YOUR_IP/32;
    deny all;

    proxy_pass http://127.0.0.1:5001;
}
```

---

## 📈 Expected Results

**Before Implementation**:

```
Audit Logs:
✗ anonymous | GET / | SUCCESS (bot traffic)
✗ anonymous | GET /phpmyadmin | SUCCESS (scanner)
✗ anonymous | PROPFIND / | SUCCESS (WebDAV probe)
```

**After Implementation**:

```
Audit Logs:
✅ anonymous | 🚨 BLOCKED: GET /phpmyadmin | FAILURE
✅ anonymous | 403 FORBIDDEN: GET /wp-admin | FAILURE
✅ anonymous | 404 NOT FOUND: GET /geoserver | FAILURE

Nginx Logs:
✅ 203.0.113.45 - - [13/Feb/2026] "GET /phpmyadmin" 403 (blocked by Nginx)
✅ 198.51.100.22 - - [13/Feb/2026] "GET /containers/json" 403 (blocked)

Fail2ban:
✅ Banned IPs: 45
✅ Last 24h: 12 scanner IPs auto-blocked
```

---

## 🎯 Summary

| Security Layer      | Before               | After                        | Status            |
| ------------------- | -------------------- | ---------------------------- | ----------------- |
| EC2 Security Groups | ❌ Port 5001 exposed | ✅ Localhost only            | **CRITICAL**      |
| Nginx Reverse Proxy | ❌ None              | ✅ Rate limiting + filtering | **ESSENTIAL**     |
| Fail2ban            | ❌ None              | ✅ Auto-blocks malicious IPs | **HIGH PRIORITY** |
| Firewall (UFW)      | ❌ Disabled          | ✅ Strict rules              | **RECOMMENDED**   |
| SSL/TLS             | ❌ HTTP only         | ✅ Let's Encrypt HTTPS       | **RECOMMENDED**   |
| CloudFront + WAF    | ❌ Direct exposure   | ⚠️ Optional ($5/mo)          | **NICE TO HAVE**  |

---

## 💰 Cost Impact

| Item                        | Monthly Cost  |
| --------------------------- | ------------- |
| Nginx Reverse Proxy         | **$0** (free) |
| Fail2ban                    | **$0** (free) |
| UFW Firewall                | **$0** (free) |
| Let's Encrypt SSL           | **$0** (free) |
| CloudFront (optional)       | ~$1-3         |
| AWS WAF (optional)          | ~$5-10        |
| **Total (without CDN/WAF)** | **$0**        |
| **Total (with CDN/WAF)**    | **~$6-13**    |

---

## 📚 Additional Resources

- [Nginx Security Hardening](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)
- [Fail2ban Documentation](https://www.fail2ban.org/wiki/index.php/Main_Page)
- [AWS WAF Best Practices](https://docs.aws.amazon.com/waf/latest/developerguide/waf-security-practices.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: February 13, 2026  
**Maintainer**: Car Tracker Backend Team
