# Docker Deployment Guide

This guide explains how to deploy the Car Tracker Backend using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)

## Quick Start

### Local Development with Docker Compose

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd car-tracker-backend
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **View logs**
   ```bash
   docker-compose logs -f
   ```

5. **Stop services**
   ```bash
   docker-compose down
   ```

## Docker Commands

### Build and Run

```bash
# Build Docker image
npm run docker:build

# Run single container (requires external DB)
npm run docker:run

# Start all services with docker-compose
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Check container status
npm run docker:ps
```

### Manual Docker Commands

```bash
# Build image
docker build -t cartrack-backend .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-password \
  --name cartrack-app \
  cartrack-backend

# Execute commands in running container
docker exec -it cartrack-app npm run migration:run
docker exec -it cartrack-app sh

# View container logs
docker logs -f cartrack-app
```

## Docker Compose Services

The `docker-compose.yml` file includes:

- **app** - Node.js backend application
- **db** - PostgreSQL 15 database
- **redis** - Redis for caching and rate limiting

### Service Configuration

```yaml
services:
  app:
    ports: 3000:3000
    depends_on: [db, redis]
    
  db:
    ports: 5432:5432
    volumes: postgres_data
    
  redis:
    ports: 6379:6379
    volumes: redis_data
```

## Environment Variables

Required environment variables (set in `.env`):

```env
# Database
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=cartrack

# JWT
JWT_SECRET=your-jwt-secret-change-in-production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Node
NODE_ENV=production
```

## Database Migrations

Migrations run automatically when the container starts via `docker-entrypoint.sh`.

To run migrations manually:

```bash
# Using docker-compose
docker-compose exec app npm run migration:run

# Using docker directly
docker exec cartrack-app npm run migration:run

# Revert last migration
docker-compose exec app npm run migration:revert
```

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Docker health check runs every 30 seconds and checks this endpoint.

## Production Deployment

### On EC2 Server

1. **Install Docker and Docker Compose**
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

2. **Clone repository**
   ```bash
   cd ~
   git clone <repository-url> cartrack-backend
   cd cartrack-backend
   ```

3. **Create production .env**
   ```bash
   nano .env
   # Add production environment variables
   ```

4. **Start services**
   ```bash
   docker-compose up -d
   ```

5. **Check status**
   ```bash
   docker-compose ps
   docker-compose logs -f app
   ```

### CI/CD Deployment

The project includes GitHub Actions workflow for automatic deployment:

- **Triggers**: Push to `main` branch
- **Steps**:
  1. Run tests and linting
  2. Build TypeScript
  3. SSH to EC2 server
  4. Pull latest code
  5. Rebuild and restart containers
  6. Run migrations

#### Required GitHub Secrets

Add these in GitHub repo → Settings → Secrets:

- `EC2_SSH_KEY` - Private SSH key for EC2
- `EC2_HOST` - EC2 public IP or domain
- `EC2_USER` - SSH user (usually `ubuntu`)

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Check all containers
docker-compose ps

# Restart services
docker-compose restart
```

### Database connection issues

```bash
# Check database is healthy
docker-compose ps db

# Connect to database
docker-compose exec db psql -U postgres -d cartrack

# Check database logs
docker-compose logs db
```

### Migrations failed

```bash
# Run migrations manually
docker-compose exec app npm run migration:run

# Check migration status
docker-compose exec app npm run migration:show

# Revert last migration
docker-compose exec app npm run migration:revert
```

### Clear all data and restart

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up -d --build
```

## Development vs Production

### Development

- Use `npm run dev` for hot-reload
- Direct database connection (no Docker)
- TypeScript executed directly with ts-node

### Production (Docker)

- Compiled TypeScript → JavaScript
- Multi-stage Docker build (smaller image)
- PostgreSQL and Redis in containers
- Automated migrations on startup
- Health checks enabled
- Auto-restart on failure

## Image Optimization

The Dockerfile uses multi-stage build:

1. **Builder stage**: Installs all dependencies, compiles TypeScript
2. **Production stage**: Only production dependencies, compiled code

This reduces final image size significantly.

## Security Best Practices

- ✅ Non-root user in container
- ✅ Only production dependencies
- ✅ No .env files in image
- ✅ Health checks enabled
- ✅ Secrets via environment variables
- ✅ Docker network isolation

## Monitoring

```bash
# Check resource usage
docker stats

# View logs with timestamps
docker-compose logs -f --timestamps

# Export logs
docker-compose logs > app.log
```

## Backup and Restore

### Backup Database

```bash
# Create backup
docker-compose exec db pg_dump -U postgres cartrack > backup.sql

# Create compressed backup
docker-compose exec db pg_dump -U postgres cartrack | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from backup
docker-compose exec -T db psql -U postgres cartrack < backup.sql

# Restore from compressed backup
gunzip < backup.sql.gz | docker-compose exec -T db psql -U postgres cartrack
```

## Support

For issues:
1. Check container logs: `docker-compose logs -f`
2. Verify environment variables
3. Test database connectivity
4. Check health endpoint: `curl http://localhost:3000/health`
