# Deployment Guide

## Overview

This comprehensive guide covers deploying the Shopify SEO Analyzer platform to production using various deployment strategies.

## Prerequisites

- Domain name with DNS access
- SSL certificate (or use Let's Encrypt)
- Cloud hosting account (AWS, Google Cloud, DigitalOcean, etc.)
- Docker installed locally
- GitHub account for CI/CD

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [AWS Deployment](#aws-deployment)
5. [Google Cloud Deployment](#google-cloud-deployment)
6. [DigitalOcean Deployment](#digitalocean-deployment)
7. [Nginx Configuration](#nginx-configuration)
8. [SSL/TLS Setup](#ssltls-setup)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Monitoring Setup](#monitoring-setup)
11. [Post-Deployment Tasks](#post-deployment-tasks)
12. [Rollback Procedures](#rollback-procedures)

---

## 1. Pre-Deployment Checklist

### Code Preparation

- [ ] All tests passing
- [ ] No console.log statements in production code
- [ ] Environment variables documented
- [ ] Dependencies up to date
- [ ] Security vulnerabilities patched
- [ ] Build optimization completed
- [ ] Error tracking configured
- [ ] Performance benchmarks met

### Infrastructure Requirements

- [ ] Server specifications verified (minimum 2GB RAM, 2 CPUs)
- [ ] Database backup strategy defined
- [ ] CDN configured for static assets
- [ ] Domain DNS configured
- [ ] SSL certificates ready
- [ ] Monitoring tools selected
- [ ] Log aggregation setup

### Security Checklist

- [ ] Secrets stored securely
- [ ] API rate limiting configured
- [ ] CORS settings reviewed
- [ ] Security headers implemented
- [ ] Database access restricted
- [ ] Firewall rules configured
- [ ] DDoS protection enabled

---

## 2. Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
# Application
NODE_ENV=production
APP_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_SSL=true
DB_POOL_MAX=20

# Security
JWT_SECRET=your-production-jwt-secret
SESSION_SECRET=your-production-session-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# Google APIs
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/secrets/google-service-account.json

# Shopify
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# Redis (for caching/sessions)
REDIS_URL=redis://user:pass@host:6379

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-license-key

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### Build Configuration

```javascript
// webpack.config.prod.js
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
      new OptimizeCSSAssetsPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
  },
  
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      },
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
  ],
};
```

---

## 3. Docker Deployment

### Multi-Stage Dockerfile

```dockerfile
# Dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy static files
COPY --chown=nodejs:nodejs public ./public

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: shopify-seo-analyzer:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  postgres:
    image: postgres:14-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites-enabled:/etc/nginx/sites-enabled
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Deployment Script

```bash
#!/bin/bash
# scripts/deploy-docker.sh

set -e

echo "🚀 Starting deployment..."

# Load environment
export $(cat .env.production | xargs)

# Build images
echo "📦 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Run database migrations
echo "🗄️ Running migrations..."
docker-compose -f docker-compose.prod.yml run --rm app npm run migrate:prod

# Start services
echo "🔧 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Verify deployment
echo "✅ Verifying deployment..."
curl -f http://localhost/health || exit 1

echo "🎉 Deployment complete!"
```

---

## 4. AWS Deployment

### EC2 Instance Setup

```bash
# Launch EC2 instance (Ubuntu 22.04 LTS)
# Instance type: t3.medium (minimum)
# Security group: Allow ports 80, 443, 22

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for running scripts)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/yourusername/shopify-seo-analyzer.git
cd shopify-seo-analyzer

# Set up environment
cp .env.example .env.production
nano .env.production  # Edit with your values

# Deploy
./scripts/deploy-docker.sh
```

### AWS RDS Setup

```terraform
# terraform/rds.tf
resource "aws_db_instance" "postgres" {
  identifier     = "shopify-seo-analyzer-db"
  engine         = "postgres"
  engine_version = "14.6"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = "shopify_seo_analyzer"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "shopify-seo-analyzer-final-snapshot"
  
  tags = {
    Name = "shopify-seo-analyzer-db"
    Environment = "production"
  }
}
```

### Elastic Beanstalk Deployment

```yaml
# .ebextensions/01_setup.config
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
    NodeVersion: 18.x
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    NPM_USE_PRODUCTION: true
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /public: public
    /static: static

container_commands:
  01_migrations:
    command: "npm run migrate:prod"
    leader_only: true
  02_seed:
    command: "npm run seed:prod"
    leader_only: true

files:
  "/opt/elasticbeanstalk/tasks/bundlelogs.d/01_app_logs.conf":
    mode: "000755"
    owner: root
    group: root
    content: |
      /var/log/app/*.log
```

---

## 5. Google Cloud Deployment

### Cloud Run Deployment

```yaml
# cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/shopify-seo-analyzer:$COMMIT_SHA', '.']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/shopify-seo-analyzer:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'shopify-seo-analyzer'
      - '--image'
      - 'gcr.io/$PROJECT_ID/shopify-seo-analyzer:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'NODE_ENV=production'
      - '--set-secrets'
      - 'DATABASE_URL=database-url:latest'
      - '--memory'
      - '2Gi'
      - '--cpu'
      - '2'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '10'

images:
  - 'gcr.io/$PROJECT_ID/shopify-seo-analyzer:$COMMIT_SHA'
```

### GKE Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shopify-seo-analyzer
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shopify-seo-analyzer
  template:
    metadata:
      labels:
        app: shopify-seo-analyzer
    spec:
      containers:
      - name: app
        image: gcr.io/project-id/shopify-seo-analyzer:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: shopify-seo-analyzer
  namespace: production
spec:
  selector:
    app: shopify-seo-analyzer
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## 6. DigitalOcean Deployment

### Droplet Setup

```bash
# Create Droplet (Ubuntu 22.04, 2GB RAM minimum)

# Initial server setup
ssh root@your-droplet-ip

# Create user
adduser deploy
usermod -aG sudo deploy
su - deploy

# Set up firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install dependencies
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### App Platform Deployment

```yaml
# .do/app.yaml
name: shopify-seo-analyzer
region: nyc
services:
- name: web
  dockerfile_path: Dockerfile
  source_dir: /
  github:
    branch: main
    deploy_on_push: true
    repo: yourusername/shopify-seo-analyzer
  http_port: 3000
  instance_count: 2
  instance_size_slug: professional-xs
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    type: SECRET
    value: ${db.DATABASE_URL}
  health_check:
    http_path: /health
    initial_delay_seconds: 30
    period_seconds: 10

databases:
- name: db
  engine: PG
  version: "14"
  size: db-s-1vcpu-1gb
  num_nodes: 1

jobs:
- name: migrate
  kind: PRE_DEPLOY
  source_dir: /
  dockerfile_path: Dockerfile
  run_command: npm run migrate:prod
  envs:
  - key: DATABASE_URL
    type: SECRET
    value: ${db.DATABASE_URL}
```

---

## 7. Nginx Configuration

### Main Configuration

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### Site Configuration

```nginx
# /etc/nginx/sites-available/shopify-seo-analyzer
upstream app {
    least_conn;
    server app:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Proxy settings
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files
    location /static/ {
        alias /app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://app;
    }
}
```

---

## 8. SSL/TLS Setup

### Let's Encrypt with Certbot

```bash
#!/bin/bash
# scripts/setup-ssl.sh

DOMAIN="yourdomain.com"
EMAIL="admin@yourdomain.com"

# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN \
  --non-interactive \
  --agree-tos \
  --email $EMAIL \
  --redirect

# Test renewal
sudo certbot renew --dry-run

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Manual SSL Setup

```bash
# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/private.key \
  -out /etc/nginx/ssl/certificate.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

---

## 9. CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/shopify-seo-analyzer
          docker-compose pull
          docker-compose up -d
          docker system prune -f
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_REGISTRY: registry.gitlab.com
  DOCKER_IMAGE: $DOCKER_REGISTRY/$CI_PROJECT_PATH

test:
  stage: test
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run test
    - npm run lint
  only:
    - merge_requests
    - main

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $DOCKER_IMAGE:$CI_COMMIT_SHA .
    - docker tag $DOCKER_IMAGE:$CI_COMMIT_SHA $DOCKER_IMAGE:latest
    - docker push $DOCKER_IMAGE:$CI_COMMIT_SHA
    - docker push $DOCKER_IMAGE:latest
  only:
    - main

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
  script:
    - ssh -o StrictHostKeyChecking=no $DEPLOY_USER@$DEPLOY_HOST "
        cd /opt/shopify-seo-analyzer &&
        docker-compose pull &&
        docker-compose up -d &&
        docker system prune -f
      "
  only:
    - main
  environment:
    name: production
    url: https://yourdomain.com
```

---

## 10. Monitoring Setup

### Health Check Endpoint

```javascript
// src/routes/health.js
const router = require('express').Router();
const { Pool } = require('pg');
const Redis = require('ioredis');

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Check database
    const pool = new Pool();
    await pool.query('SELECT 1');
    health.checks.database = 'ok';
    await pool.end();
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  try {
    // Check Redis
    const redis = new Redis(process.env.REDIS_URL);
    await redis.ping();
    health.checks.redis = 'ok';
    redis.disconnect();
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }

  try {
    // Check external APIs
    const googleAuth = await checkGoogleAuth();
    health.checks.googleApi = googleAuth ? 'ok' : 'error';
  } catch (error) {
    health.checks.googleApi = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

### Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    networks:
      - monitoring

  loki:
    image: grafana/loki:latest
    volumes:
      - ./monitoring/loki-config.yaml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - monitoring

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./monitoring/promtail-config.yaml:/etc/promtail/config.yml
      - /var/log:/var/log
      - ./logs:/app/logs
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:
  loki_data:

networks:
  monitoring:
    external: true
```

### Application Metrics

```javascript
// src/middleware/metrics.js
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Middleware
module.exports = (req, res, next) => {
  const start = Date.now();
  
  activeConnections.inc();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : 'unknown';
    
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
    
    activeConnections.dec();
  });
  
  next();
};

// Metrics endpoint
router.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

---

## 11. Post-Deployment Tasks

### Verification Checklist

- [ ] Application accessible via HTTPS
- [ ] All API endpoints responding
- [ ] Database connections working
- [ ] Redis cache functioning
- [ ] Background jobs running
- [ ] Email notifications working
- [ ] Webhooks receiving data
- [ ] Monitoring dashboards active
- [ ] Logs being collected
- [ ] Backups scheduled

### Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 50 https://yourdomain.com/api/health

# Load testing with k6
k6 run scripts/load-test.js

# Check SSL configuration
curl -I https://yourdomain.com
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Security Scan

```bash
# Run security headers test
curl -I https://yourdomain.com | grep -i "security\|x-frame\|x-content"

# Check for exposed files
curl https://yourdomain.com/.env
curl https://yourdomain.com/.git/config
curl https://yourdomain.com/package.json

# Run OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://yourdomain.com
```

---

## 12. Rollback Procedures

### Quick Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: ./rollback.sh <version>"
  exit 1
fi

echo "⚠️  Rolling back to version: $PREVIOUS_VERSION"

# Stop current deployment
docker-compose down

# Pull previous version
docker pull ghcr.io/yourusername/shopify-seo-analyzer:$PREVIOUS_VERSION

# Update docker-compose to use previous version
sed -i "s|image: .*|image: ghcr.io/yourusername/shopify-seo-analyzer:$PREVIOUS_VERSION|g" docker-compose.yml

# Start services
docker-compose up -d

# Verify rollback
sleep 30
curl -f https://yourdomain.com/health || exit 1

echo "✅ Rollback completed"
```

### Database Rollback

```bash
#!/bin/bash
# scripts/db-rollback.sh

# Get latest backup
LATEST_BACKUP=$(ls -t /backups/postgres/*.sql.gz | head -1)

echo "⚠️  Rolling back database using: $LATEST_BACKUP"
read -p "This will DELETE current data. Continue? (y/N): " confirm

if [ "$confirm" != "y" ]; then
  exit 0
fi

# Stop application
docker-compose stop app

# Restore database
gunzip -c $LATEST_BACKUP | docker-compose exec -T postgres psql -U $DB_USER $DB_NAME

# Run migrations
docker-compose run --rm app npm run migrate:prod

# Restart application
docker-compose start app

echo "✅ Database rollback completed"
```

---

## Environment Variables Summary

```env
# Production Environment Variables
NODE_ENV=production
APP_NAME=shopify-seo-analyzer
APP_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_SSL=true
DB_POOL_MAX=20

# Redis
REDIS_URL=redis://user:pass@host:6379

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
ENCRYPTION_KEY=your-encryption-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# Deployment
DEPLOY_KEY=your-deploy-key
ROLLBAR_TOKEN=your-rollbar-token
```

---

## Next Steps

1. Set up monitoring alerts
2. Configure automated backups
3. Implement disaster recovery plan
4. Schedule security audits
5. Plan for scaling strategy

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [AWS Deployment Guide](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Google Cloud Run](https://cloud.google.com/run/docs)
- [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)