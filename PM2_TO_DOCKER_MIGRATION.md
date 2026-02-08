# Migration Guide: PM2 to Docker

This guide will help you transition from PM2 to Docker on your EC2 server.

## Step 1: Stop and Remove PM2

### 1.1 Stop all PM2 processes

```bash
# SSH into your EC2 server
ssh ubuntu@ec2-3-208-9-184.compute-1.amazonaws.com

# Stop all PM2 processes
pm2 stop all

# Delete all PM2 processes
pm2 delete all

# Verify nothing is running
pm2 list
```

### 1.2 Remove PM2 from startup

```bash
# Remove PM2 from system startup
pm2 unstartup

# Or if you used systemd
pm2 unstartup systemd
```

### 1.3 Remove PM2 globally (optional)

```bash
# If you want to completely remove PM2
npm uninstall -g pm2

# Or with yarn
yarn global remove pm2
```

## Step 2: Clean Up Old Application Files

### 2.1 Check what's currently running

```bash
# Check if the app is still running on port 3000
sudo lsof -i :3000

# If something is still running, kill it
sudo kill -9 <PID>
```

### 2.2 Backup and remove old application (if deployed separately)

```bash
# If you have the app in a different location (e.g., /var/www/car-tracker)
# Create a backup first
sudo tar -czf ~/car-tracker-pm2-backup-$(date +%Y%m%d).tar.gz /path/to/old/app

# Remove old application files (optional - only if not using the same directory)
# sudo rm -rf /path/to/old/app
```

## Step 3: Install Docker and Docker Compose

### 3.1 Check if Docker is installed

```bash
docker --version
docker-compose --version
```

### 3.2 Install Docker (if not installed)

```bash
# Update package index
sudo apt-get update

# Install required packages
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group (avoid using sudo)
sudo usermod -aG docker ubuntu

# Log out and log back in for group changes to take effect
exit
```

### 3.3 Verify Docker installation

```bash
# SSH back in
ssh ubuntu@ec2-3-208-9-184.compute-1.amazonaws.com

# Test Docker (should work without sudo)
docker --version
docker compose version
docker ps
```

## Step 4: Set Up Application Directory

### 4.1 Create application directory

```bash
# Create directory for the Dockerized app
mkdir -p ~/car-tracker-backend
cd ~/car-tracker-backend
```

### 4.2 Create .env file

```bash
# Create .env file with your production values
nano .env
```

Add your environment variables:

```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=car_tracker
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Email (if using)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@car-tracker.com

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
```

## Step 5: Clean Up Old Database and Redis (Optional)

### 5.1 If you had PostgreSQL running locally

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If you want to remove it (WARNING: This will delete all data)
# Backup first!
sudo -u postgres pg_dump car_tracker > ~/car_tracker_backup_$(date +%Y%m%d).sql

# Stop and disable PostgreSQL
sudo systemctl stop postgresql
sudo systemctl disable postgresql

# Optionally remove PostgreSQL (only if using Docker PostgreSQL)
# sudo apt-get remove --purge postgresql postgresql-*
```

### 5.2 If you had Redis running locally

```bash
# Check if Redis is running
sudo systemctl status redis

# Stop and disable Redis
sudo systemctl stop redis
sudo systemctl disable redis

# Optionally remove Redis (only if using Docker Redis)
# sudo apt-get remove --purge redis-server
```

## Step 6: Prepare for Docker Deployment

### 6.1 Create docker-compose.yml

The CI/CD pipeline will deploy this file, but you can also create it manually:

```bash
# The file will be deployed automatically by GitHub Actions
# Or you can pull it from the repository
```

### 6.2 Set up GitHub Container Registry authentication

```bash
# Log in to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u musss2003 --password-stdin

# Or create a Personal Access Token (PAT) from GitHub
# Settings → Developer settings → Personal access tokens → Generate new token
# Scopes needed: read:packages
```

## Step 7: Test Docker Deployment

### 7.1 Pull the Docker image

```bash
# Pull the latest image from GHCR
docker pull ghcr.io/musss2003/car-tracker-backend:main

# Verify the image
docker images | grep car-tracker
```

### 7.2 Start the application

```bash
# Start all services (app, postgres, redis)
docker compose up -d

# Check running containers
docker ps

# View logs
docker compose logs -f

# Check specific service logs
docker compose logs -f app
```

### 7.3 Verify the application is running

```bash
# Check if the app is responding
curl http://localhost:3000/health

# Check database migrations
docker compose exec app npm run migration:run

# Check all containers are healthy
docker compose ps
```

## Step 8: Set Up Firewall Rules (if needed)

```bash
# Allow port 3000 (or your configured port)
sudo ufw allow 3000/tcp

# If using nginx as reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Reload firewall
sudo ufw reload
```

## Step 9: Monitor and Manage Docker Services

### Common Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v

# Update to latest image
docker compose pull
docker compose up -d

# Execute commands in container
docker compose exec app npm run migration:run
docker compose exec app sh

# View resource usage
docker stats
```

## Troubleshooting

### Port already in use

```bash
# Find what's using the port
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

### Database connection issues

```bash
# Check if PostgreSQL container is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Connect to PostgreSQL
docker compose exec postgres psql -U your_db_user -d car_tracker
```

### Migration issues

```bash
# Run migrations manually
docker compose exec app npm run migration:run

# Check migration status
docker compose exec app npm run migration:show
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean up old Docker images
docker system prune -a

# Remove old PM2 logs (if they exist)
rm -rf ~/.pm2/logs/*
```

## Rollback Plan

If you need to rollback to PM2:

```bash
# Stop Docker containers
docker compose down

# Restore PM2 processes
cd /path/to/old/app
pm2 start ecosystem.config.js

# Or restore from backup
tar -xzf ~/car-tracker-pm2-backup-*.tar.gz
cd /path/to/restored/app
npm install
pm2 start npm --name "car-tracker" -- start
```

## Next Steps After Migration

1. **Set up automatic updates**: The CI/CD pipeline will automatically deploy new versions
2. **Configure log rotation**: Docker handles this, but you can customize in docker-compose.yml
3. **Set up monitoring**: Use `docker stats` or integrate with monitoring tools
4. **Backup strategy**: Set up automated backups for PostgreSQL data volume
5. **SSL/TLS**: Set up nginx reverse proxy with Let's Encrypt

## Verification Checklist

- [ ] PM2 processes stopped and removed
- [ ] PM2 removed from startup
- [ ] Docker and Docker Compose installed
- [ ] .env file created with production values
- [ ] Old database backed up (if removing local PostgreSQL)
- [ ] Docker containers running successfully
- [ ] Application responds to health checks
- [ ] Database migrations completed
- [ ] GitHub Actions secrets configured (EC2_SSH_KEY, EC2_HOST, EC2_USER, EC2_KNOWN_HOSTS)
- [ ] First CI/CD deployment successful
- [ ] Monitoring set up
- [ ] Backups configured
