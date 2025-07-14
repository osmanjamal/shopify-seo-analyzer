#!/bin/bash

# Shopify SEO Analyzer - Initial Setup Script
# This script sets up the development and production environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="shopify-seo-analyzer"
NODE_VERSION="18"
POSTGRES_VERSION="14"
REDIS_VERSION="7"

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root!"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/debian_version ]; then
            DISTRO="debian"
        elif [ -f /etc/redhat-release ]; then
            DISTRO="redhat"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        OS="unknown"
    fi
    
    print_info "Detected OS: $OS ($DISTRO)"
}

# Install system dependencies
install_dependencies() {
    print_info "Installing system dependencies..."
    
    if [[ "$OS" == "macos" ]]; then
        # Check if Homebrew is installed
        if ! command -v brew &> /dev/null; then
            print_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # Install dependencies
        brew update
        brew install git curl wget
        
    elif [[ "$OS" == "linux" ]]; then
        if [[ "$DISTRO" == "debian" ]]; then
            sudo apt-get update
            sudo apt-get install -y \
                curl \
                wget \
                git \
                build-essential \
                libssl-dev \
                ca-certificates \
                gnupg \
                lsb-release
        elif [[ "$DISTRO" == "redhat" ]]; then
            sudo yum update -y
            sudo yum install -y \
                curl \
                wget \
                git \
                gcc-c++ \
                make \
                openssl-devel
        fi
    fi
    
    print_success "System dependencies installed"
}

# Install Node.js
install_nodejs() {
    print_info "Installing Node.js v$NODE_VERSION..."
    
    if command -v node &> /dev/null; then
        CURRENT_NODE=$(node -v)
        print_warning "Node.js $CURRENT_NODE is already installed"
        read -p "Do you want to update/reinstall? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    if [[ "$OS" == "macos" ]]; then
        brew install node@$NODE_VERSION
        brew link --overwrite node@$NODE_VERSION
    else
        # Install using NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install global packages
    npm install -g npm@latest
    npm install -g pm2 db-migrate nodemon
    
    print_success "Node.js $(node -v) installed"
}

# Install PostgreSQL
install_postgresql() {
    print_info "Installing PostgreSQL $POSTGRES_VERSION..."
    
    if command -v psql &> /dev/null; then
        CURRENT_PG=$(psql --version | awk '{print $3}')
        print_warning "PostgreSQL $CURRENT_PG is already installed"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    if [[ "$OS" == "macos" ]]; then
        brew install postgresql@$POSTGRES_VERSION
        brew services start postgresql@$POSTGRES_VERSION
    else
        # Add PostgreSQL official repository
        sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
        sudo apt-get update
        sudo apt-get install -y postgresql-$POSTGRES_VERSION postgresql-client-$POSTGRES_VERSION
        
        # Start PostgreSQL
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    fi
    
    print_success "PostgreSQL installed and started"
}

# Install Redis
install_redis() {
    print_info "Installing Redis $REDIS_VERSION..."
    
    if command -v redis-cli &> /dev/null; then
        CURRENT_REDIS=$(redis-cli --version | awk '{print $2}')
        print_warning "Redis $CURRENT_REDIS is already installed"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    if [[ "$OS" == "macos" ]]; then
        brew install redis
        brew services start redis
    else
        # Install from official repository
        curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
        sudo apt-get update
        sudo apt-get install -y redis-server
        
        # Start Redis
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
    fi
    
    print_success "Redis installed and started"
}

# Install Docker
install_docker() {
    print_info "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        CURRENT_DOCKER=$(docker --version)
        print_warning "Docker is already installed: $CURRENT_DOCKER"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    if [[ "$OS" == "macos" ]]; then
        print_info "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        read -p "Press Enter when Docker Desktop is installed..."
    else
        # Install Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        
        # Add user to docker group
        sudo usermod -aG docker $USER
        
        # Install Docker Compose
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    print_success "Docker installed"
    print_warning "You may need to log out and back in for Docker permissions to take effect"
}

# Setup project
setup_project() {
    print_info "Setting up project..."
    
    # Clone repository if not already in project directory
    if [ ! -f "package.json" ]; then
        read -p "Enter Git repository URL (or press Enter to skip): " GIT_REPO
        if [ ! -z "$GIT_REPO" ]; then
            git clone $GIT_REPO .
        fi
    fi
    
    # Create necessary directories
    mkdir -p logs uploads temp backups config/certs database/backups
    
    # Copy environment files
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_info "Created .env file from .env.example"
            print_warning "Please edit .env file with your configuration"
        else
            print_error "No .env.example file found"
        fi
    fi
    
    # Install Node.js dependencies
    print_info "Installing Node.js dependencies..."
    npm install
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        print_info "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        print_info "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
    fi
    
    print_success "Project setup completed"
}

# Setup database
setup_database() {
    print_info "Setting up database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready &> /dev/null; then
        print_error "PostgreSQL is not running"
        return 1
    fi
    
    # Get database credentials
    if [ -f ".env" ]; then
        source .env
    else
        read -p "Enter database name (shopify_seo_analyzer): " DB_NAME
        DB_NAME=${DB_NAME:-shopify_seo_analyzer}
        
        read -p "Enter database user (seo_admin): " DB_USER
        DB_USER=${DB_USER:-seo_admin}
        
        read -sp "Enter database password: " DB_PASSWORD
        echo
    fi
    
    # Create database and user
    print_info "Creating database and user..."
    
    sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
    
    # Run migrations
    if [ -d "database/migrations" ]; then
        print_info "Running database migrations..."
        npm run migrate:up
    fi
    
    # Seed database (development only)
    read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run seed:dev
    fi
    
    print_success "Database setup completed"
}

# Setup SSL certificates
setup_ssl() {
    print_info "Setting up SSL certificates..."
    
    read -p "Do you want to generate self-signed certificates for development? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p config/certs
        
        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout config/certs/private.key \
            -out config/certs/certificate.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        print_success "Self-signed SSL certificates generated"
    else
        print_info "Skipping SSL setup. Configure SSL certificates manually for production."
    fi
}

# Configure firewall
configure_firewall() {
    print_info "Configuring firewall..."
    
    if [[ "$OS" == "linux" ]]; then
        if command -v ufw &> /dev/null; then
            sudo ufw allow 22/tcp    # SSH
            sudo ufw allow 80/tcp    # HTTP
            sudo ufw allow 443/tcp   # HTTPS
            sudo ufw allow 3000/tcp  # Node.js app
            sudo ufw allow 5432/tcp  # PostgreSQL (only from localhost)
            sudo ufw allow 6379/tcp  # Redis (only from localhost)
            
            # Enable firewall
            read -p "Enable firewall now? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sudo ufw --force enable
                print_success "Firewall configured and enabled"
            fi
        fi
    else
        print_info "Please configure firewall manually for your system"
    fi
}

# Create systemd service (Linux only)
create_systemd_service() {
    if [[ "$OS" != "linux" ]]; then
        return
    fi
    
    print_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/shopify-seo-analyzer.service > /dev/null <<EOF
[Unit]
Description=Shopify SEO Analyzer
Documentation=https://github.com/yourusername/shopify-seo-analyzer
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=shopify-seo-analyzer
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    sudo systemctl daemon-reload
    sudo systemctl enable shopify-seo-analyzer
    
    print_success "Systemd service created"
    print_info "Use 'sudo systemctl start shopify-seo-analyzer' to start the service"
}

# Final setup steps
final_setup() {
    print_info "Performing final setup steps..."
    
    # Create log rotation config
    if [[ "$OS" == "linux" ]]; then
        sudo tee /etc/logrotate.d/shopify-seo-analyzer > /dev/null <<EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        systemctl reload shopify-seo-analyzer > /dev/null 2>&1 || true
    endscript
}
EOF
    fi
    
    # Set correct permissions
    chmod +x scripts/*.sh
    chmod 600 .env
    chmod 700 config/certs
    
    # Create initial backup
    if [ -x "scripts/backup.sh" ]; then
        ./scripts/backup.sh initial
    fi
    
    print_success "Final setup completed"
}

# Main setup flow
main() {
    echo "======================================"
    echo "  Shopify SEO Analyzer Setup Script  "
    echo "======================================"
    echo
    
    check_root
    detect_os
    
    # Ask what to install
    print_info "What would you like to set up?"
    echo "1) Full installation (recommended for new setups)"
    echo "2) Dependencies only"
    echo "3) Project setup only"
    echo "4) Database setup only"
    echo "5) Production configuration only"
    
    read -p "Enter your choice (1-5): " CHOICE
    
    case $CHOICE in
        1)
            install_dependencies
            install_nodejs
            install_postgresql
            install_redis
            install_docker
            setup_project
            setup_database
            setup_ssl
            configure_firewall
            create_systemd_service
            final_setup
            ;;
        2)
            install_dependencies
            install_nodejs
            install_postgresql
            install_redis
            install_docker
            ;;
        3)
            setup_project
            ;;
        4)
            setup_database
            ;;
        5)
            setup_ssl
            configure_firewall
            create_systemd_service
            final_setup
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo
    echo "======================================"
    echo "       Setup Complete! 🎉            "
    echo "======================================"
    echo
    print_info "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Run 'npm run dev' to start development server"
    echo "3. Visit http://localhost:3000"
    echo
    print_info "For production deployment, run:"
    echo "  ./scripts/deploy.sh"
    echo
}

# Run main function
main "$@"