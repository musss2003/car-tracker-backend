# Car Tracker Infrastructure Configuration

This directory contains ready-to-use configuration files for securing your EC2 backend deployment.

## 📁 Files Overview

| File | Purpose | Deployment Location |
|------|---------|---------------------|
| `nginx-car-tracker.conf` | Nginx reverse proxy configuration | `/etc/nginx/sites-available/car-tracker` |
| `fail2ban-nginx.conf` | Fail2ban jail configurations | `/etc/fail2ban/jail.d/nginx.local` |
| `fail2ban-nginx-scanner-filter.conf` | Custom scanner detection filter | `/etc/fail2ban/filter.d/nginx-scanner.conf` |
| `monitor-security.sh` | Security monitoring script | Can run from anywhere |

---

## 🚀 Quick Start (30 Minutes)

### Step 1: Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

### Step 2: Deploy Nginx Configuration
```bash
# Copy the configuration file
sudo cp ~/car-tracker-backend/infrastructure/nginx-car-tracker.conf /etc/nginx/sites-available/car-tracker

# Edit the configuration to set your domain (if needed)
sudo nano /etc/nginx/sites-available/car-tracker
# Verify: server_name cartrackerbooo.mooo.com;
# (Already set correctly - no need to change)

# Enable the site
sudo ln -s /etc/nginx/sites-available/car-tracker /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 3: Update Backend to Listen on Localhost
```bash
# Edit your backend .env file (or docker-compose.yml environment variables)
nano ~/car-tracker-backend/.env

# Add or modify:
HOST=127.0.0.1
PORT=5001

# If using docker-compose, update docker-compose.yml:
# services:
#   backend:
#     environment:
#       - HOST=127.0.0.1
#       - PORT=5001
#     ports:
#       - "127.0.0.1:5001:5001"  # Bind to localhost only

# Restart your Docker container
docker-compose down
docker-compose up -d
# OR if using standalone Docker:
# docker stop car-tracker-backend
# docker rm car-tracker-backend
# docker run -d --name car-tracker-backend -p 127.0.0.1:5001:5001 --env-file .env your-image:tag
```

### Step 4: Update EC2 Security Groups
1. Open AWS Console → EC2 → Security Groups
2. Select your backend security group
3. **Edit Inbound Rules**:
   - **SSH (22)**: Change source from `0.0.0.0/0` to `YOUR_IP/32`
   - **Port 5001**: **DELETE THIS RULE** (backend should only listen on localhost)
   - **HTTP (80)**: Keep as `0.0.0.0/0` or `::/0` (Nginx will handle requests)
   - **HTTPS (443)**: Add if using SSL - `0.0.0.0/0` or `::/0`

### Step 5: Verify Security
```bash
# Test that port 5001 is NOT publicly accessible
curl http://YOUR_EC2_PUBLIC_IP:5001/api/health
# Should fail with "Connection refused"

# Test that Nginx is working
curl http://YOUR_EC2_PUBLIC_IP/api/health
# OR
curl http://YOUR_DOMAIN.com/api/health
# Should return 200 OK

# Check backend is listening on localhost only
netstat -tuln | grep 5001
# Should show: 127.0.0.1:5001 (NOT 0.0.0.0:5001)

# For Docker, verify port binding
docker ps --format "table {{.Names}}\t{{.Ports}}"
# Should show: 127.0.0.1:5001->5001/tcp (NOT 0.0.0.0:5001->5001/tcp)
```

---

## 🛡️ Install Fail2ban (1 Hour)

### Step 1: Install Fail2ban
```bash
sudo apt install fail2ban -y
```

### Step 2: Deploy Configurations
```bash
# Copy jail configuration
sudo cp fail2ban-nginx.conf /etc/fail2ban/jail.d/nginx.local

# Copy custom scanner filter
sudo cp fail2ban-nginx-scanner-filter.conf /etc/fail2ban/filter.d/nginx-scanner.conf

# Restart Fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### Step 3: Verify Fail2ban
```bash
# Check status
sudo fail2ban-client status

# Check specific jails
sudo fail2ban-client status nginx-scanner
sudo fail2ban-client status nginx-badbots

# View banned IPs
sudo fail2ban-client status nginx-scanner | grep "Banned IP"
```

### Step 4: Unban an IP (if needed)
```bash
sudo fail2ban-client set nginx-scanner unbanip YOUR_IP
```

---

## 📊 Security Monitoring

### Run the Security Report
```bash
# From this directory
./monitor-security.sh

# Or with sudo for full details
sudo ./monitor-security.sh
```

### Schedule Daily Reports (Optional)
```bash
# Edit crontab
crontab -e

# Add this line to run daily at 8 AM
0 8 * * * /home/ubuntu/car-tracker-backend/infrastructure/monitor-security.sh | mail -s "Security Report" your@email.com
```

---

## 🔒 Configuration Details

### Nginx Rate Limiting
The configuration includes two rate limiting zones:

1. **Auth Endpoints** (`/api/auth`): 2 requests/second with burst of 5
2. **API Endpoints** (`/api`): 10 requests/second with burst of 20

If a client exceeds these limits, they receive a `429 Too Many Requests` response.

### Fail2ban Jails

| Jail | Trigger | Ban Time | Purpose |
|------|---------|----------|---------|
| `nginx-scanner` | Access to malicious paths (phpmyadmin, wp-admin, etc.) | 7 days | Blocks scanners immediately |
| `nginx-badbots` | Known bot user agents | 24 hours | Blocks automated tools |
| `nginx-noscript` | Script-based attacks | 2 hours | Blocks injection attempts |
| `nginx-http-auth` | Failed HTTP authentication | 1 hour | Blocks brute force |
| `sshd` | Failed SSH login | 24 hours | Blocks SSH brute force |

### Blocked Paths
Nginx automatically blocks (403 Forbidden):
- `*.php`, `*.asp`, `*.aspx`, `*.cgi`, `*.jsp`
- `/wp-admin/*`, `/phpmyadmin/*`, `/geoserver/*`
- `/containers/*`, `/webui/*`, `/owa/*`
- Hidden files (`/.git`, `/.env`)

### Security Headers
All responses include:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Blocks XSS attempts
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information

---

## 🧪 Testing Security

### Test 1: Rate Limiting
```bash
# Should succeed
for i in {1..5}; do curl http://YOUR_DOMAIN/api/health; done

# Should return 429 after burst limit
for i in {1..30}; do curl http://YOUR_DOMAIN/api/auth/login -X POST; done
```

### Test 2: Scanner Blocking
```bash
# Should return 403 Forbidden
curl http://YOUR_DOMAIN/phpmyadmin
curl http://YOUR_DOMAIN/wp-admin
curl http://YOUR_DOMAIN/test.php

# Check if IP was banned by Fail2ban (run on server)
sudo fail2ban-client status nginx-scanner
```

### Test 3: Bad Bot Blocking
```bash
# Should return 403 Forbidden
curl -A "python-requests/2.31.0" http://YOUR_DOMAIN/api/health
curl -A "Nikto" http://YOUR_DOMAIN/api/health
```

### Test 4: Backend Not Exposed
```bash
# Should fail (connection refused)
curl http://YOUR_EC2_PUBLIC_IP:5001/api/health

# Should succeed (through Nginx)
curl http://YOUR_EC2_PUBLIC_IP/api/health
```

---

## 🆘 Troubleshooting

### Nginx Won't Start
```bash
# Check configuration syntax
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check if port 80 is already in use
sudo netstat -tuln | grep :80
```

### Backend Returns 502 Bad Gateway
```bash
# Check if backend container is running
docker ps | grep car-tracker
# OR
docker-compose ps

# Check container logs
docker logs car-tracker-backend
# OR
docker-compose logs backend

# Check if backend is listening on localhost
netstat -tuln | grep 5001
# Should show 127.0.0.1:5001

# Test backend directly
curl http://127.0.0.1:5001/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart container if needed
docker-compose restart backend
```

### Fail2ban Not Banning IPs
```bash
# Check jail status
sudo fail2ban-client status nginx-scanner

# Test the filter manually
sudo fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-scanner.conf

# Check Fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

### Legitimate Users Getting Blocked
```bash
# Unban an IP
sudo fail2ban-client set nginx-scanner unbanip 203.0.113.45

# Whitelist an IP (add to /etc/fail2ban/jail.local)
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 YOUR_IP/32
```

---

## 💰 Cost Impact

- **Nginx**: Free and open-source
- **Fail2ban**: Free and open-source
- **No additional AWS costs** for basic setup
- **Optional CloudFront + WAF**: See main `INFRASTRUCTURE_SECURITY.md` for details

---

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Fail2ban Manual](https://www.fail2ban.org/wiki/index.php/Main_Page)
- [OWASP Security Best Practices](https://owasp.org/www-project-web-security-testing-guide/)
- Car Tracker Main Security Guide: `../docs/INFRASTRUCTURE_SECURITY.md`

---

## 🆘 Support

If you encounter issues:

1. Check the logs:
   - Nginx: `/var/log/nginx/error.log` and `/var/log/nginx/access.log`
   - Fail2ban: `/var/log/fail2ban.log`
   - Backend: `docker logs car-tracker-backend` or `docker-compose logs backend`

2. Run the monitoring script: `sudo ./monitor-security.sh`

3. Verify configuration syntax:
   ```bash
   sudo nginx -t
   sudo fail2ban-client -t
   ```

---

## ✅ Post-Deployment Checklist

- [ ] Nginx installed and running
- [ ] Backend listening on `127.0.0.1:5001` only
- [ ] EC2 Security Group: Port 5001 removed from inbound rules
- [ ] EC2 Security Group: SSH restricted to your IP
- [ ] Nginx reverse proxy working (can access via HTTP/80)
- [ ] Fail2ban installed and active
- [ ] All jails enabled and monitoring logs
- [ ] Security monitoring script working
- [ ] Tested rate limiting
- [ ] Tested scanner blocking
- [ ] Audit logs showing `FAILURE` for blocked requests

---

**Last Updated**: February 13, 2026  
**Tested On**: Ubuntu 20.04/22.04 LTS
