#!/bin/bash

# Shopify SEO Analyzer - Health Check Script
# This script monitors the health of all application components

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
elif [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Configuration
CHECK_MODE=${1:-"full"}  # full, quick, api, database, services
OUTPUT_FORMAT=${2:-"human"}  # human, json, nagios
HEALTH_ENDPOINT=${HEALTH_ENDPOINT:-"http://localhost:3000/health"}
API_ENDPOINT=${API_ENDPOINT:-"http://localhost:3000/api"}
MAX_RESPONSE_TIME=${MAX_RESPONSE_TIME:-5000}  # milliseconds
MIN_FREE_MEMORY=${MIN_FREE_MEMORY:-500}  # MB
MIN_FREE_DISK=${MIN_FREE_DISK:-1000}  # MB

# Health status
OVERALL_STATUS="healthy"
FAILED_CHECKS=0
WARNINGS=0

# Results storage
declare -A CHECK_RESULTS
declare -A CHECK_MESSAGES
declare -A CHECK_TIMES

# Functions
print_success() {
    if [ "$OUTPUT_FORMAT" = "human" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    fi
}

print_error() {
    if [ "$OUTPUT_FORMAT" = "human" ]; then
        echo -e "${RED}❌ $1${NC}"
    fi
}

print_warning() {
    if [ "$OUTPUT_FORMAT" = "human" ]; then
        echo -e "${YELLOW}⚠️  $1${NC}"
    fi
}

print_info() {
    if [ "$OUTPUT_FORMAT" = "human" ]; then
        echo -e "${BLUE}ℹ️  $1${NC}"
    fi
}

print_header() {
    if [ "$OUTPUT_FORMAT" = "human" ]; then
        echo -e "${PURPLE}$1${NC}"
        echo "=================================="
    fi
}

# Record check result
record_check() {
    local check_name=$1
    local status=$2  # pass, fail, warn
    local message=$3
    local response_time=$4
    
    CHECK_RESULTS[$check_name]=$status
    CHECK_MESSAGES[$check_name]=$message
    CHECK_TIMES[$check_name]=$response_time
    
    if [ "$status" = "fail" ]; then
        OVERALL_STATUS="unhealthy"
        ((FAILED_CHECKS++))
    elif [ "$status" = "warn" ]; then
        if [ "$OVERALL_STATUS" != "unhealthy" ]; then
            OVERALL_STATUS="degraded"
        fi
        ((WARNINGS++))
    fi
}

# Check system resources
check_system_resources() {
    print_header "System Resources"
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    cpu_usage=${cpu_usage%.*}  # Convert to integer
    
    if [ "$cpu_usage" -lt 80 ]; then
        print_success "CPU Usage: ${cpu_usage}%"
        record_check "cpu" "pass" "CPU usage is ${cpu_usage}%" ""
    elif [ "$cpu_usage" -lt 90 ]; then
        print_warning "CPU Usage: ${cpu_usage}% (high)"
        record_check "cpu" "warn" "CPU usage is high: ${cpu_usage}%" ""
    else
        print_error "CPU Usage: ${cpu_usage}% (critical)"
        record_check "cpu" "fail" "CPU usage is critical: ${cpu_usage}%" ""
    fi
    
    # Check memory
    local total_mem=$(free -m | awk 'NR==2{print $2}')
    local used_mem=$(free -m | awk 'NR==2{print $3}')
    local free_mem=$(free -m | awk 'NR==2{print $4}')
    local mem_percent=$((used_mem * 100 / total_mem))
    
    if [ "$free_mem" -gt "$MIN_FREE_MEMORY" ]; then
        print_success "Memory: ${used_mem}MB/${total_mem}MB (${mem_percent}% used)"
        record_check "memory" "pass" "Memory usage is ${mem_percent}%" ""
    else
        print_error "Memory: Low free memory: ${free_mem}MB"
        record_check "memory" "fail" "Low free memory: ${free_mem}MB" ""
    fi
    
    # Check disk space
    local disk_usage=$(df -m / | awk 'NR==2{print $4}')
    
    if [ "$disk_usage" -gt "$MIN_FREE_DISK" ]; then
        print_success "Disk Space: ${disk_usage}MB free"
        record_check "disk" "pass" "Disk space available: ${disk_usage}MB" ""
    else
        print_error "Disk Space: Low disk space: ${disk_usage}MB"
        record_check "disk" "fail" "Low disk space: ${disk_usage}MB" ""
    fi
    
    # Check load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}')
    local load_1min=$(echo $load_avg | cut -d',' -f1)
    local cpu_cores=$(nproc)
    
    if (( $(echo "$load_1min < $cpu_cores" | bc -l) )); then
        print_success "Load Average: $load_avg"
        record_check "load" "pass" "Load average: $load_avg" ""
    else
        print_warning "Load Average: $load_avg (high)"
        record_check "load" "warn" "High load average: $load_avg" ""
    fi
}

# Check application health
check_application() {
    print_header "Application Health"
    
    # Check main health endpoint
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}" $HEALTH_ENDPOINT 2>/dev/null | tail -n1)
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to ms
    
    if [ "$response" = "200" ]; then
        if [ "$response_time" -lt "$MAX_RESPONSE_TIME" ]; then
            print_success "Health Endpoint: OK (${response_time}ms)"
            record_check "app_health" "pass" "Application is healthy" "$response_time"
        else
            print_warning "Health Endpoint: Slow response (${response_time}ms)"
            record_check "app_health" "warn" "Slow response time: ${response_time}ms" "$response_time"
        fi
    else
        print_error "Health Endpoint: Failed (HTTP $response)"
        record_check "app_health" "fail" "Health check failed with HTTP $response" "$response_time"
    fi
    
    # Check API endpoints
    local api_endpoints=(
        "/api/status"
        "/api/keywords/health"
        "/api/analytics/health"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local start_time=$(date +%s%N)
        local response=$(curl -s -o /dev/null -w "%{http_code}" ${API_ENDPOINT}${endpoint} 2>/dev/null)
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        if [ "$response" = "200" ] || [ "$response" = "401" ]; then
            print_success "API ${endpoint}: OK (${response_time}ms)"
            record_check "api${endpoint}" "pass" "API endpoint responding" "$response_time"
        else
            print_error "API ${endpoint}: Failed (HTTP $response)"
            record_check "api${endpoint}" "fail" "API endpoint failed with HTTP $response" "$response_time"
        fi
    done
}

# Check database
check_database() {
    print_header "Database Health"
    
    # Check PostgreSQL connection
    local start_time=$(date +%s%N)
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -c "SELECT 1" &> /dev/null; then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        print_success "PostgreSQL Connection: OK (${response_time}ms)"
        record_check "postgres_connection" "pass" "Database connection successful" "$response_time"
        
        # Check database size
        local db_size=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))" | xargs)
        print_info "Database Size: $db_size"
        
        # Check connection count
        local conn_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME'" | xargs)
        local max_conn=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -t -c "SHOW max_connections" | xargs)
        
        if [ "$conn_count" -lt $((max_conn * 80 / 100)) ]; then
            print_success "Connections: $conn_count/$max_conn"
            record_check "postgres_connections" "pass" "Connection pool healthy: $conn_count/$max_conn" ""
        else
            print_warning "Connections: $conn_count/$max_conn (high)"
            record_check "postgres_connections" "warn" "High connection count: $conn_count/$max_conn" ""
        fi
        
        # Check for long-running queries
        local long_queries=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle' AND query_start < now() - interval '5 minutes'" | xargs)
        
        if [ "$long_queries" -eq 0 ]; then
            print_success "Long-running Queries: None"
            record_check "postgres_queries" "pass" "No long-running queries" ""
        else
            print_warning "Long-running Queries: $long_queries found"
            record_check "postgres_queries" "warn" "$long_queries long-running queries detected" ""
        fi
        
    else
        print_error "PostgreSQL Connection: Failed"
        record_check "postgres_connection" "fail" "Cannot connect to database" ""
    fi
}

# Check Redis
check_redis() {
    print_header "Redis Health"
    
    if command -v redis-cli &> /dev/null; then
        # Check Redis connection
        local start_time=$(date +%s%N)
        if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping &> /dev/null; then
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 ))
            
            print_success "Redis Connection: OK (${response_time}ms)"
            record_check "redis_connection" "pass" "Redis connection successful" "$response_time"
            
            # Check Redis memory
            local redis_memory=$(redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} INFO memory | grep "used_memory_human" | cut -d':' -f2 | tr -d '\r')
            print_info "Redis Memory Usage: $redis_memory"
            
            # Check Redis keys
            local redis_keys=$(redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} DBSIZE | awk '{print $1}')
            print_info "Redis Keys: $redis_keys"
            
        else
            print_error "Redis Connection: Failed"
            record_check "redis_connection" "fail" "Cannot connect to Redis" ""
        fi
    else
        print_warning "Redis: redis-cli not found"
        record_check "redis_connection" "warn" "redis-cli not installed" ""
    fi
}

# Check external services
check_external_services() {
    print_header "External Services"
    
    # Check Google APIs
    local google_endpoints=(
        "https://www.googleapis.com/oauth2/v1/tokeninfo"
        "https://searchconsole.googleapis.com/$discovery/rest"
        "https://analyticsreporting.googleapis.com/$discovery/rest"
    )
    
    for endpoint in "${google_endpoints[@]}"; do
        local service_name=$(echo $endpoint | cut -d'/' -f3 | cut -d'.' -f1)
        local start_time=$(date +%s%N)
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" --max-time 5 2>/dev/null)
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "404" ]; then
            print_success "$service_name API: Reachable (${response_time}ms)"
            record_check "external_$service_name" "pass" "$service_name API is reachable" "$response_time"
        else
            print_error "$service_name API: Unreachable"
            record_check "external_$service_name" "fail" "$service_name API is unreachable" "$response_time"
        fi
    done
    
    # Check Shopify API
    if [ ! -z "$SHOPIFY_STORE_DOMAIN" ]; then
        local start_time=$(date +%s%N)
        local response=$(curl -s -o /dev/null -w "%{http_code}" "https://$SHOPIFY_STORE_DOMAIN/admin/api/2024-01/shop.json" -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" --max-time 5 2>/dev/null)
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        if [ "$response" = "200" ] || [ "$response" = "401" ]; then
            print_success "Shopify API: Connected (${response_time}ms)"
            record_check "external_shopify" "pass" "Shopify API is accessible" "$response_time"
        else
            print_error "Shopify API: Failed (HTTP $response)"
            record_check "external_shopify" "fail" "Shopify API returned HTTP $response" "$response_time"
        fi
    fi
}

# Check background jobs
check_background_jobs() {
    print_header "Background Jobs"
    
    # Check if PM2 is running
    if command -v pm2 &> /dev/null; then
        local pm2_status=$(pm2 list --no-color | grep -c "online")
        
        if [ "$pm2_status" -gt 0 ]; then
            print_success "PM2 Processes: $pm2_status online"
            record_check "pm2" "pass" "$pm2_status PM2 processes online" ""
            
            # Check specific processes
            local processes=("worker" "scheduler" "api")
            for process in "${processes[@]}"; do
                if pm2 list --no-color | grep -q "$process.*online"; then
                    print_success "Process '$process': Running"
                    record_check "process_$process" "pass" "Process $process is running" ""
                else
                    print_error "Process '$process': Not running"
                    record_check "process_$process" "fail" "Process $process is not running" ""
                fi
            done
        else
            print_error "PM2: No processes online"
            record_check "pm2" "fail" "No PM2 processes online" ""
        fi
    fi
    
    # Check Docker containers if using Docker
    if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
        local running_containers=$(docker-compose ps -q | wc -l)
        local expected_containers=$(grep -c "container_name:" docker-compose.yml)
        
        if [ "$running_containers" -eq "$expected_containers" ]; then
            print_success "Docker Containers: $running_containers/$expected_containers running"
            record_check "docker" "pass" "All Docker containers running" ""
        else
            print_error "Docker Containers: $running_containers/$expected_containers running"
            record_check "docker" "fail" "Not all Docker containers are running" ""
        fi
    fi
}

# Check SSL certificates
check_ssl_certificates() {
    print_header "SSL Certificates"
    
    local domains=(${APP_URL:-"https://localhost"})
    
    for domain in "${domains[@]}"; do
        # Extract hostname from URL
        local hostname=$(echo $domain | sed -e 's|^[^/]*//||' -e 's|/.*$||')
        
        # Check certificate expiration
        local cert_info=$(echo | openssl s_client -servername $hostname -connect $hostname:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [ ! -z "$cert_info" ]; then
            local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
            local expiry_epoch=$(date -d "$expiry_date" +%s)
            local current_epoch=$(date +%s)
            local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [ "$days_until_expiry" -gt 30 ]; then
                print_success "SSL Certificate ($hostname): Valid for $days_until_expiry days"
                record_check "ssl_$hostname" "pass" "SSL certificate valid for $days_until_expiry days" ""
            elif [ "$days_until_expiry" -gt 7 ]; then
                print_warning "SSL Certificate ($hostname): Expires in $days_until_expiry days"
                record_check "ssl_$hostname" "warn" "SSL certificate expires in $days_until_expiry days" ""
            else
                print_error "SSL Certificate ($hostname): Expires in $days_until_expiry days!"
                record_check "ssl_$hostname" "fail" "SSL certificate expires in $days_until_expiry days" ""
            fi
        else
            print_warning "SSL Certificate ($hostname): Could not check"
            record_check "ssl_$hostname" "warn" "Could not check SSL certificate" ""
        fi
    done
}

# Generate JSON output
generate_json_output() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "{"
    echo "  \"status\": \"$OVERALL_STATUS\","
    echo "  \"timestamp\": \"$timestamp\","
    echo "  \"failed_checks\": $FAILED_CHECKS,"
    echo "  \"warnings\": $WARNINGS,"
    echo "  \"checks\": {"
    
    local first=true
    for check in "${!CHECK_RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        
        echo -n "    \"$check\": {"
        echo -n "\"status\": \"${CHECK_RESULTS[$check]}\", "
        echo -n "\"message\": \"${CHECK_MESSAGES[$check]}\""
        
        if [ ! -z "${CHECK_TIMES[$check]}" ]; then
            echo -n ", \"response_time_ms\": ${CHECK_TIMES[$check]}"
        fi
        
        echo -n "}"
    done
    
    echo ""
    echo "  }"
    echo "}"
}

# Generate Nagios output
generate_nagios_output() {
    local exit_code=0
    local status_text="OK"
    
    if [ "$OVERALL_STATUS" = "unhealthy" ]; then
        exit_code=2
        status_text="CRITICAL"
    elif [ "$OVERALL_STATUS" = "degraded" ]; then
        exit_code=1
        status_text="WARNING"
    fi
    
    echo "$status_text - Failed: $FAILED_CHECKS, Warnings: $WARNINGS | failed=$FAILED_CHECKS warnings=$WARNINGS"
    exit $exit_code
}

# Main function
main() {
    if [ "$OUTPUT_FORMAT" = "human" ]; then
        echo "======================================"
        echo "   Shopify SEO Analyzer Health Check "
        echo "======================================"
        echo
        print_info "Check Mode: $CHECK_MODE"
        echo
    fi
    
    # Run checks based on mode
    case "$CHECK_MODE" in
        "full")
            check_system_resources
            check_application
            check_database
            check_redis
            check_external_services
            check_background_jobs
            check_ssl_certificates
            ;;
        "quick")
            check_application
            ;;
        "api")
            check_application
            check_external_services
            ;;
        "database")
            check_database
            check_redis
            ;;
        "services")
            check_external_services
            check_background_jobs
            ;;
        *)
            print_error "Invalid check mode: $CHECK_MODE"
            exit 1
            ;;
    esac
    
    # Generate output based on format
    if [ "$OUTPUT_FORMAT" = "human" ]; then
        echo
        echo "======================================"
        echo "Summary:"
        echo "======================================"
        
        if [ "$OVERALL_STATUS" = "healthy" ]; then
            print_success "Overall Status: HEALTHY"
        elif [ "$OVERALL_STATUS" = "degraded" ]; then
            print_warning "Overall Status: DEGRADED"
        else
            print_error "Overall Status: UNHEALTHY"
        fi
        
        echo "Failed Checks: $FAILED_CHECKS"
        echo "Warnings: $WARNINGS"
        
    elif [ "$OUTPUT_FORMAT" = "json" ]; then
        generate_json_output
        
    elif [ "$OUTPUT_FORMAT" = "nagios" ]; then
        generate_nagios_output
    fi
    
    # Exit with appropriate code
    if [ "$OVERALL_STATUS" = "healthy" ]; then
        exit 0
    elif [ "$OVERALL_STATUS" = "degraded" ]; then
        exit 1
    else
        exit 2
    fi
}

# Run main function
main "$@"