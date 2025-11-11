# Security Implementation

## 🚨 Security Threats Identified

### Attack Pattern Analysis from Nginx Logs

Your server was targeted by **automated vulnerability scanners**. These are not targeted attacks, but automated bots scanning the internet for vulnerable systems.

#### 1. SonicWall SSL VPN Exploit Attempts
```
GET /sonicos/is-sslvpn-enabled
```
- **Source**: 141.98.11.xxx (3 attempts)
- **Target**: SonicWall firewall vulnerability
- **Risk**: Low (you don't run SonicWall)
- **Action Taken**: Blocked entire IP range 141.98.11.0/24

#### 2. PHPUnit Remote Code Execution Attempts
```
GET /vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php
```
- **Source**: 154.26.155.xxx
- **Target**: PHPUnit testing framework vulnerability
- **Risk**: Critical if vulnerable version exists
- **Action Taken**: 
  - Blocked IP range 154.26.155.0/24
  - Added path blocking for `/phpunit`, `/vendor`, `/eval-stdin`

#### 3. Other Common Attack Vectors Observed
- WordPress admin panel access attempts
- Environment file exposure attempts (`.env`)
- Various SQL injection patterns

---

## 🛡️ Security Measures Implemented

### 1. Nginx Rate Limiting

Implemented three-tier rate limiting to prevent DDoS and brute force attacks:

```nginx
# API endpoints - strict limits
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# General traffic - moderate limits
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# Socket.IO - higher limits for real-time features
limit_req_zone $binary_remote_addr zone=socketio_limit:10m rate=50r/s;
```

**Protection Against**:
- Brute force login attempts
- API abuse
- DDoS attacks
- Credential stuffing

### 2. IP Blocking (Geo-based)

Blocked malicious IP ranges identified from attack logs:

```nginx
geo $block_ip {
    default 0;
    141.98.11.0/24 1;    # SonicWall exploit attempts
    154.26.155.0/24 1;   # PHPUnit RCE attempts
}
```

**How to Add More IPs**:
```nginx
# Add new blocked IPs/ranges here:
X.X.X.X/24 1;  # Description of why blocked
```

### 3. Suspicious Path Blocking

Blocks common exploit paths before they reach your application:

```nginx
# Block exploit paths
location ~* (phpunit|eval-stdin|sonicos|\.env|wp-admin|wp-login|xmlrpc) {
    return 404;
}
```

**Blocked Patterns**:
- PHPUnit exploit paths
- WordPress admin panels
- Environment file access
- SonicWall exploit paths
- XML-RPC endpoints (WordPress)

### 4. Security Headers

Added comprehensive security headers:

```nginx
# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevent MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Enable XSS protection
add_header X-XSS-Protection "1; mode=block" always;

# Enforce HTTPS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Referrer policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

### 5. Server Information Hiding

```nginx
server_tokens off;  # Hides nginx version
```

**Note**: Need to also enable this in `/etc/nginx/nginx.conf` line 18

### 6. HTTP/2 Protocol

Enabled for better performance and security:
```nginx
listen 443 ssl http2;
```

---

## ⏳ Pending Tasks

### IMMEDIATE (HIGH PRIORITY)

#### 1. Fix Nginx Configuration Error
**Issue**: Duplicate `ssl_session_timeout` directive causing nginx reload to fail.

**Solution**: Edit `/etc/nginx/sites-available/default` and remove lines 30-32:
```nginx
# Remove these lines (duplicate of what's in options-ssl-nginx.conf):
# Additional SSL Security
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

**Commands**:
```bash
sudo nano /etc/nginx/sites-available/default
# Remove the duplicate lines
sudo nginx -t
sudo systemctl reload nginx
```

### MEDIUM PRIORITY

#### 2. Update Main Nginx Config
Edit `/etc/nginx/nginx.conf` line 18:
```bash
sudo nano /etc/nginx/nginx.conf
# Change: # server_tokens off;
# To:     server_tokens off;
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🔒 Additional Security Recommendations

### A. Application-Level Security

#### 1. Implement CAPTCHA on Login
**Why**: Prevent automated brute force attacks  
**Where**: Login and registration forms  
**Recommendation**: Google reCAPTCHA v3 (invisible) or hCaptcha

```typescript
// Example implementation location:
// car-tracker-frontend/src/features/auth/components/LoginForm.tsx
```

#### 2. Account Lockout Policy
**Why**: Limit brute force attack attempts  
**Implementation**: After 5 failed login attempts, lock account for 15 minutes

```typescript
// Backend: car-tracker-backend/src/controllers/auth.ts
// Track failed attempts in database or Redis
// Example structure:
interface LoginAttempt {
  username: string;
  attempts: number;
  lockedUntil?: Date;
}
```

#### 3. Two-Factor Authentication (2FA)
**Why**: Additional layer of security for user accounts  
**Options**:
- TOTP (Time-based One-Time Password) - Google Authenticator, Authy
- SMS-based (less secure but more user-friendly)
- Email-based codes

**Libraries**:
- `speakeasy` for TOTP generation
- `qrcode` for QR code generation

#### 4. Input Validation & Sanitization
**Current Risk**: SQL injection, XSS attacks

**Recommendations**:
```typescript
// Install validation library
npm install joi express-validator

// Backend validation example:
import { body, validationResult } from 'express-validator';

router.post('/api/users/update',
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().matches(/^[0-9+\-\s()]+$/),
  body('address').optional().trim().escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process validated data
  }
);
```

#### 5. Secure Session Management
**Current**: JWT tokens  
**Enhancements**:
- Implement token rotation
- Add refresh token expiration
- Store refresh tokens with device fingerprinting
- Clear tokens on logout from all devices feature

```typescript
// Example: car-tracker-backend/src/models/RefreshToken.ts
// Add fields:
@Column()
deviceFingerprint: string;

@Column({ type: 'timestamp' })
expiresAt: Date;
```

### B. Infrastructure Security

#### 6. Firewall Configuration (UFW)
```bash
# Install UFW if not already installed
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow your backend port (only from localhost)
# No need to open externally - nginx proxies it

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### 7. Fail2Ban - Automatic IP Blocking
**Why**: Automatically ban IPs after repeated failed attempts

```bash
# Install Fail2Ban
sudo apt update
sudo apt install fail2ban

# Create configuration
sudo nano /etc/fail2ban/jail.local
```

Add configuration:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 7200

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
```

```bash
# Start Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

#### 8. SSL/TLS Hardening
Your Let's Encrypt setup is good, but can be improved:

**Test current SSL rating**:
```bash
# Visit: https://www.ssllabs.com/ssltest/
# Enter: cartrackerbooo.mooo.com
```

**Improvements**:
```nginx
# Add to /etc/nginx/sites-available/default
# After the include /etc/letsencrypt/options-ssl-nginx.conf; line

# Disable weak protocols (already in Let's Encrypt config, but verify)
ssl_protocols TLSv1.2 TLSv1.3;

# Use strong ciphers only
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers on;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/cartrackerbooo.mooo.com/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

#### 9. Database Security

**Current Risk**: If PostgreSQL is exposed to internet

**Check**:
```bash
sudo netstat -tlnp | grep 5432
```

**Should show**:
```
tcp  0  0  127.0.0.1:5432  0.0.0.0:*  LISTEN  (only localhost)
```

**If exposed to 0.0.0.0:5432**, secure it:
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
# Change: listen_addresses = '*'
# To:     listen_addresses = 'localhost'

sudo systemctl restart postgresql
```

**PostgreSQL authentication**:
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Ensure:
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
# No entries for 0.0.0.0/0 or ::/0
```

#### 10. Regular Security Updates
```bash
# Create update script
sudo nano /usr/local/bin/security-updates.sh
```

Add:
```bash
#!/bin/bash
apt update
apt upgrade -y
apt autoremove -y
systemctl restart nginx
# Add your application restart commands
```

```bash
sudo chmod +x /usr/local/bin/security-updates.sh

# Schedule weekly updates (cron)
sudo crontab -e
# Add:
0 3 * * 0 /usr/local/bin/security-updates.sh >> /var/log/security-updates.log 2>&1
```

### C. Monitoring & Logging

#### 11. Set Up Log Monitoring
```bash
# Install logwatch
sudo apt install logwatch

# Configure daily email reports
sudo nano /etc/cron.daily/00logwatch
```

Add:
```bash
#!/bin/bash
/usr/sbin/logwatch --output mail --mailto your-email@example.com --detail high
```

#### 12. Monitor Nginx Access Patterns
```bash
# Create monitoring script
nano ~/monitor-attacks.sh
```

Add:
```bash
#!/bin/bash
echo "=== Failed Login Attempts ==="
grep "401" /var/log/nginx/access.log | tail -20

echo "=== Rate Limited IPs ==="
grep "limiting requests" /var/log/nginx/error.log | tail -20

echo "=== Blocked Exploit Attempts ==="
grep -E "(phpunit|eval-stdin|wp-admin|sonicos)" /var/log/nginx/access.log | tail -20

echo "=== Top IPs by Request Count ==="
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

```bash
chmod +x ~/monitor-attacks.sh
# Run weekly or after suspicious activity
```

#### 13. Application Error Tracking
**Recommendation**: Integrate error tracking service

**Options**:
- Sentry (free tier available)
- Rollbar
- LogRocket

```typescript
// Install Sentry
npm install @sentry/react @sentry/node

// Frontend: car-tracker-frontend/src/app/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
});

// Backend: car-tracker-backend/src/app.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});
```

### D. Code Security

#### 14. Dependency Scanning
```bash
# Frontend
cd car-tracker-frontend
npm audit
npm audit fix

# Backend
cd car-tracker-backend
npm audit
npm audit fix
```

**Automate**:
```bash
# Add to package.json scripts:
"scripts": {
  "security-check": "npm audit --audit-level=moderate"
}
```

#### 15. Environment Variables Security
**Current Risk**: Sensitive data in environment variables

**Recommendations**:
```bash
# Use secrets management
# Option 1: HashiCorp Vault
# Option 2: AWS Secrets Manager
# Option 3: Docker secrets (if using Docker)

# Ensure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Set restrictive permissions
chmod 600 .env
```

#### 16. Code Security Scanner
```bash
# Install OWASP Dependency Check
npm install -g snyk

# Authenticate
snyk auth

# Scan projects
cd car-tracker-frontend
snyk test

cd ../car-tracker-backend
snyk test

# Monitor continuously
snyk monitor
```

### E. Backup & Recovery

#### 17. Automated Database Backups
```bash
# Create backup script
sudo nano /usr/local/bin/backup-database.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump car_tracker | gzip > $BACKUP_DIR/car_tracker_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: car_tracker_$DATE.sql.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-database.sh

# Schedule daily backups
sudo crontab -e
# Add:
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/db-backup.log 2>&1
```

#### 18. Application Code Backups
**Current**: Using Git (good!)

**Additional**:
- Set up automated GitHub backups to separate location
- Consider AWS S3 or similar for critical file backups

---

## ✅ Testing Checklist

### Security Features Testing

#### Rate Limiting Test
```bash
# Test API rate limiting (should get 429 after 10 requests/second)
for i in {1..20}; do
  curl -I https://cartrackerbooo.mooo.com/api/cars
  sleep 0.05
done
```

#### IP Blocking Test
```bash
# Verify blocked IPs can't access (need access to blocked IP to test)
# Alternative: Check nginx logs after attacks
grep "403" /var/log/nginx/access.log
```

#### Path Blocking Test
```bash
# Should return 404
curl -I https://cartrackerbooo.mooo.com/phpunit
curl -I https://cartrackerbooo.mooo.com/wp-admin
curl -I https://cartrackerbooo.mooo.com/.env
curl -I https://cartrackerbooo.mooo.com/sonicos
```

#### Security Headers Test
```bash
# Check headers are present
curl -I https://cartrackerbooo.mooo.com

# Should see:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains
```

#### SSL Test
```bash
# Test SSL configuration
openssl s_client -connect cartrackerbooo.mooo.com:443 -tls1_2

# Or use online tool:
# https://www.ssllabs.com/ssltest/analyze.html?d=cartrackerbooo.mooo.com
```

### Application Testing

- [ ] User can login successfully
- [ ] User profile loads without errors
- [ ] Phone number saves and persists after reload
- [ ] Address saves and persists after reload
- [ ] Dark theme switches properly
- [ ] Dark theme persists after page refresh
- [ ] System theme detection works
- [ ] Socket.IO real-time features work
- [ ] All API endpoints respond correctly

---

## 📊 Security Monitoring Dashboard

### Key Metrics to Track

1. **Failed Login Attempts**: Monitor for brute force attacks
2. **Rate Limit Hits**: Track IPs hitting rate limits
3. **Blocked Path Attempts**: Count exploit attempts
4. **Unusual Traffic Patterns**: Spike in requests from single IP
5. **Geographic Anomalies**: Requests from unexpected countries

### Tools to Consider

- **Grafana + Prometheus**: Metrics visualization
- **ELK Stack**: Log aggregation and analysis
- **Cloudflare**: DDoS protection and WAF (free tier available)
- **Uptime Monitoring**: UptimeRobot, Pingdom

---

## 🎯 Priority Action Plan

### This Week
1. ✅ Fix nginx SSL duplicate error
2. ✅ Run database migration
3. ✅ Test user profile data persistence
4. ✅ Test dark theme functionality
5. ⬜ Update main nginx.conf (server_tokens)
6. ⬜ Install and configure UFW firewall
7. ⬜ Install and configure Fail2Ban

### Next Week
1. ⬜ Implement CAPTCHA on login
2. ⬜ Add account lockout policy
3. ⬜ Set up database backups
4. ⬜ Configure log monitoring
5. ⬜ Run SSL test and optimize

### This Month
1. ⬜ Implement 2FA
2. ⬜ Set up error tracking (Sentry)
3. ⬜ Implement input validation throughout app
4. ⬜ Security audit with npm audit / snyk
5. ⬜ Set up monitoring dashboard

---

## 📚 Resources

### Security Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Nginx Security Best Practices](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

### Tools
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Security Headers Check](https://securityheaders.com/)
- [Observatory by Mozilla](https://observatory.mozilla.org/)

### Documentation
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)
- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [Fail2Ban Documentation](https://www.fail2ban.org/wiki/index.php/Main_Page)

---

## 🔍 Incident Response Plan

### If You Detect an Attack

1. **Immediate Actions**:
   ```bash
   # Block attacking IP
   sudo nano /etc/nginx/sites-available/default
   # Add to geo $block_ip section: X.X.X.X 1;
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. **Investigate**:
   ```bash
   # Check logs
   tail -f /var/log/nginx/access.log
   tail -f /var/log/nginx/error.log
   
   # Find attack pattern
   grep "<attacking-ip>" /var/log/nginx/access.log
   ```

3. **Document**:
   - Save relevant log entries
   - Note attack type and time
   - Document mitigation steps taken

4. **Notify**:
   - If serious breach, notify users
   - Report to hosting provider if needed
   - Consider filing abuse report at [AbuseIPDB](https://www.abuseipdb.com/)

---

## 📝 Git Commits Summary

### Backend Changes
```
Commit: 178f21b
Message: "Add phone and address fields to User model and controller"
Files:
  - src/models/User.ts (added phone, address columns)
  - src/controllers/user.ts (updated updateUser, getUser)
  - migrations/add_phone_address_to_users.sql (new)
```

### Frontend Changes
```
Commit: 6a314a6
Message: "Fix dark theme implementation in SettingsTab"
Files:
  - src/shared/utils/initTheme.ts (new)
  - src/app/main.tsx (import initTheme)
  - src/features/users/components/SettingsTab.tsx (refactored)
```

---

## 🤝 Support & Questions

If you need help with any of these implementations or have security concerns:

1. **Backend Issues**: Check `car-tracker-backend/README.md`
2. **Frontend Issues**: Check `car-tracker-frontend/README.md`
3. **Nginx Issues**: Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. **Database Issues**: Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`

---

**Last Updated**: November 12, 2025  
**Next Review**: After completing immediate tasks
