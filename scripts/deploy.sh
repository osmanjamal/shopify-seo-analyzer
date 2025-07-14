#!/bin/bash

# Shopify SEO Analyzer - Deployment Script
# This script handles deployment to production servers

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="shopify-seo-analyzer"
DEPLOY_USER=${DEPLOY_USER:-"deploy"}
DEPLOY_HOST=${DEPLOY_HOST:-""}
DEPLOY_PATH=${DEPLOY_PATH:-"/opt/shopify-seo-analyzer"}
BACKUP_PATH=${BACKUP_PATH:-"/var/backups/shopify-seo-analyzer"}
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"

# Deployment modes
DEPLOY_MODE=${1:-"production"}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BACKUP=${SKIP_BACKUP:-false}
SKIP_MIGRATIONS=${SKIP_MIGRATIONS:-false}

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a $LOG_FILE
}

print_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a $LOG_FILE
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a $LOG_FILE
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a $LOG_FILE
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if .env file exists
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found!"
        exit 1
    fi
    
    # Check if deploy host is set
    if [ -z "$DEPLOY_HOST" ]; then
        print_error "DEPLOY_HOST not set! Use: DEPLOY_HOST=server.com ./deploy.sh"
        exit 1
    fi
    
    # Check SSH access
    if ! ssh -o ConnectTimeout=5 $DEPLOY_USER@$DEPLOY_HOST "echo 'SSH OK'" &> /dev/null; then
        print_error "Cannot connect to $DEPLOY_USER@$DEPLOY_HOST"
        exit 1
    fi
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check if git is clean
    if [[ -n $(git status -s) ]]; then
        print_warning "Git working directory is not clean"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Skipping tests (SKIP_TESTS=true)"
        return
    fi
    
    print_info "Running tests..."
    
    # Backend tests
    if [ -d "backend" ]; then
        cd backend
        npm test || {
            print_error "Backend tests failed!"
            exit 1
        }
        cd ..
    fi
    
    # Frontend tests
    if [ -d "frontend" ]; then
        cd frontend
        npm test -- --watchAll=false || {
            print_error "Frontend tests failed!"
            exit 1
        }
        cd ..
    fi
    
    # Run linting
    npm run lint || {
        print_error "Linting failed!"
        exit 1
    }
    
    print_success "All tests passed"
}

# Build application
build_application() {
    print_info "Building application..."
    
    # Get current git commit
    GIT_COMMIT=$(git rev-parse --short HEAD)
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create build info
    cat > build-info.json <<EOF
{
    "version": "$(node -p "require('./package.json').version")",
    "commit": "$GIT_COMMIT",
    "branch": "$GIT_BRANCH",
    "buildTime": "$BUILD_TIME",
    "deployMode": "$DEPLOY_MODE"
}
EOF
    
    # Build frontend
    if [ -d "frontend" ]; then
        print_info "Building frontend..."
        cd frontend
        NODE_ENV=production npm run build || {
            print_error "Frontend build failed!"
            exit 1
        }
        cd ..
    fi
    
    # Build backend
    if [ -d "backend" ]; then
        print_info "Building backend..."
        cd backend
        NODE_ENV=production npm run build || {
            print_error "Backend build failed!"
            exit 1
        }
        cd ..
    fi
    
    # Build Docker images
    print_info "Building Docker images..."
    docker build -t $PROJECT_NAME:$GIT_COMMIT -t $PROJECT_NAME:latest . || {
        print_error "Docker build failed!"
        exit 1
    }
    
    print_success "Application built successfully"
}

# Create deployment package
create_deployment_package() {
    print_info "Creating deployment package..."
    
    PACKAGE_NAME="${PROJECT_NAME}-${GIT_COMMIT}.tar.gz"
    
    # Files to include in deployment
    tar -czf $PACKAGE_NAME \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.env \
        --exclude=*.log \
        --exclude=coverage \
        --exclude=.nyc_output \
        --exclude=dist \
        --exclude=build \
        --exclude=uploads \
        --exclude=temp \
        . || {
        print_error "Failed to create deployment package!"
        exit 1
    }
    
    print_success "Deployment package created: $PACKAGE_NAME"
}

# Backup current deployment
backup_current_deployment() {
    if [ "$SKIP_BACKUP" = true ]; then
        print_warning "Skipping backup (SKIP_BACKUP=true)"
        return
    fi
    
    print_info "Backing up current deployment..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        
        # Create backup directory
        mkdir -p $BACKUP_PATH
        
        # Check if deployment exists
        if [ -d "$DEPLOY_PATH" ]; then
            # Create backup
            BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
            cd $DEPLOY_PATH
            
            # Backup application files
            tar -czf $BACKUP_PATH/\$BACKUP_NAME \
                --exclude=node_modules \
                --exclude=logs \
                --exclude=temp \
                --exclude=uploads \
                . || true
            
            # Backup database
            if [ -f ".env" ]; then
                source .env
                PGPASSWORD=\$DB_PASSWORD pg_dump -h \$DB_HOST -U \$DB_USER \$DB_NAME | \
                    gzip > $BACKUP_PATH/db-\$BACKUP_NAME
            fi
            
            echo "Backup created: \$BACKUP_NAME"
            
            # Keep only last 5 backups
            cd $BACKUP_PATH
            ls -t *.tar.gz | tail -n +6 | xargs -r rm
        else
            echo "No existing deployment found"
        fi
EOF
    
    print_success "Backup completed"
}

# Deploy to server
deploy_to_server() {
    print_info "Deploying to $DEPLOY_HOST..."
    
    # Upload deployment package
    print_info "Uploading deployment package..."
    scp $PACKAGE_NAME $DEPLOY_USER@$DEPLOY_HOST:/tmp/ || {
        print_error "Failed to upload deployment package!"
        exit 1
    }
    
    # Upload environment file
    scp .env.production $DEPLOY_USER@$DEPLOY_HOST:/tmp/.env || {
        print_error "Failed to upload environment file!"
        exit 1
    }
    
    # Deploy on server
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        
        echo "Starting deployment on server..."
        
        # Create deployment directory
        sudo mkdir -p $DEPLOY_PATH
        sudo chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH
        
        # Extract deployment package
        cd $DEPLOY_PATH
        tar -xzf /tmp/$PACKAGE_NAME
        
        # Copy environment file
        cp /tmp/.env .env
        chmod 600 .env
        
        # Install dependencies
        echo "Installing dependencies..."
        npm ci --only=production
        
        # Install backend dependencies
        if [ -d "backend" ]; then
            cd backend
            npm ci --only=production
            cd ..
        fi
        
        # Install frontend dependencies (if needed for SSR)
        if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
            cd frontend
            npm ci --only=production
            cd ..
        fi
        
        # Clean up
        rm /tmp/$PACKAGE_NAME
        rm /tmp/.env
        
        echo "Deployment files ready"
EOF
    
    print_success "Files deployed to server"
}

# Run database migrations
run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        print_warning "Skipping migrations (SKIP_MIGRATIONS=true)"
        return
    fi
    
    print_info "Running database migrations..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        cd $DEPLOY_PATH
        
        # Source environment
        source .env
        
        # Run migrations
        npm run migrate:prod || {
            echo "Migration failed!"
            exit 1
        }
        
        echo "Migrations completed"
EOF
    
    print_success "Database migrations completed"
}

# Deploy with Docker
deploy_docker() {
    print_info "Deploying with Docker..."
    
    # Push Docker image to registry
    if [ ! -z "$DOCKER_REGISTRY" ]; then
        print_info "Pushing Docker image to registry..."
        docker tag $PROJECT_NAME:$GIT_COMMIT $DOCKER_REGISTRY/$PROJECT_NAME:$GIT_COMMIT
        docker tag $PROJECT_NAME:latest $DOCKER_REGISTRY/$PROJECT_NAME:latest
        docker push $DOCKER_REGISTRY/$PROJECT_NAME:$GIT_COMMIT
        docker push $DOCKER_REGISTRY/$PROJECT_NAME:latest
    fi
    
    # Deploy on server
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        cd $DEPLOY_PATH
        
        # Pull latest images
        if [ ! -z "$DOCKER_REGISTRY" ]; then
            docker pull $DOCKER_REGISTRY/$PROJECT_NAME:$GIT_COMMIT
            docker tag $DOCKER_REGISTRY/$PROJECT_NAME:$GIT_COMMIT $PROJECT_NAME:latest
        fi
        
        # Stop current containers
        docker-compose down || true
        
        # Start new containers
        docker-compose up -d
        
        # Wait for health check
        sleep 10
        
        # Check if containers are running
        docker-compose ps
        
        # Clean up old images
        docker image prune -f
EOF
    
    print_success "Docker deployment completed"
}

# Deploy with PM2
deploy_pm2() {
    print_info "Deploying with PM2..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        cd $DEPLOY_PATH
        
        # Stop current application
        pm2 stop $PROJECT_NAME || true
        pm2 delete $PROJECT_NAME || true
        
        # Start application
        NODE_ENV=production pm2 start ecosystem.config.js
        
        # Save PM2 configuration
        pm2 save
        pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER || true
        
        # Show status
        pm2 list
EOF
    
    print_success "PM2 deployment completed"
}

# Health check
health_check() {
    print_info "Running health check..."
    
    # Wait for application to start
    sleep 15
    
    # Check health endpoint
    HEALTH_URL="https://$DEPLOY_HOST/health"
    
    for i in {1..10}; do
        if curl -k -f -s $HEALTH_URL > /dev/null; then
            print_success "Health check passed"
            return 0
        fi
        print_warning "Health check attempt $i failed, retrying..."
        sleep 5
    done
    
    print_error "Health check failed!"
    return 1
}

# Post deployment tasks
post_deployment() {
    print_info "Running post-deployment tasks..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        cd $DEPLOY_PATH
        
        # Clear cache
        if [ -d "cache" ]; then
            rm -rf cache/*
        fi
        
        # Warm up cache
        curl -s http://localhost:3000/api/warmup || true
        
        # Update cron jobs
        if [ -f "scripts/crontab" ]; then
            crontab scripts/crontab
        fi
        
        # Restart nginx if needed
        if systemctl is-active --quiet nginx; then
            sudo nginx -t && sudo systemctl reload nginx
        fi
        
        # Send deployment notification
        if [ -f "scripts/notify-deployment.sh" ]; then
            ./scripts/notify-deployment.sh "$GIT_COMMIT" "$DEPLOY_MODE"
        fi
EOF
    
    print_success "Post-deployment tasks completed"
}

# Rollback deployment
rollback() {
    print_warning "Rolling back deployment..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        
        # Find latest backup
        LATEST_BACKUP=\$(ls -t $BACKUP_PATH/backup-*.tar.gz 2>/dev/null | head -1)
        
        if [ -z "\$LATEST_BACKUP" ]; then
            echo "No backup found!"
            exit 1
        fi
        
        echo "Rolling back to: \$LATEST_BACKUP"
        
        # Stop current application
        cd $DEPLOY_PATH
        docker-compose down || pm2 stop $PROJECT_NAME || true
        
        # Restore backup
        rm -rf *
        tar -xzf \$LATEST_BACKUP
        
        # Restore database if exists
        DB_BACKUP=\${LATEST_BACKUP/backup-/db-}
        if [ -f "\$DB_BACKUP" ]; then
            source .env
            gunzip -c \$DB_BACKUP | PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER \$DB_NAME
        fi
        
        # Restart application
        docker-compose up -d || pm2 start ecosystem.config.js
        
        echo "Rollback completed"
EOF
    
    print_success "Rollback completed"
}

# Main deployment flow
main() {
    echo "======================================"
    echo "   Shopify SEO Analyzer Deployment   "
    echo "======================================"
    echo
    print_info "Deployment mode: $DEPLOY_MODE"
    print_info "Target host: $DEPLOY_USER@$DEPLOY_HOST"
    print_info "Deploy path: $DEPLOY_PATH"
    echo
    
    # Check if rollback is requested
    if [ "$1" = "rollback" ]; then
        rollback
        exit 0
    fi
    
    # Start deployment
    START_TIME=$(date +%s)
    
    # Run deployment steps
    check_prerequisites
    run_tests
    build_application
    create_deployment_package
    backup_current_deployment
    deploy_to_server
    run_migrations
    
    # Choose deployment method
    if [ -f "docker-compose.yml" ]; then
        deploy_docker
    else
        deploy_pm2
    fi
    
    # Verify deployment
    if health_check; then
        post_deployment
        
        # Calculate deployment time
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        
        echo
        echo "======================================"
        echo "    Deployment Successful! 🎉        "
        echo "======================================"
        print_success "Deployed version: $GIT_COMMIT"
        print_success "Deployment time: ${DURATION}s"
        print_info "Application URL: https://$DEPLOY_HOST"
        echo
        
        # Clean up local files
        rm -f $PACKAGE_NAME
    else
        print_error "Deployment failed! Rolling back..."
        rollback
        exit 1
    fi
}

# Run main function
main "$@"