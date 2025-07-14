#!/bin/bash

# Shopify SEO Analyzer - Backup Script
# This script handles automated backups of database and application files

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
elif [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ No environment file found!${NC}"
    exit 1
fi

# Configuration
BACKUP_TYPE=${1:-"full"}  # full, database, files, config
BACKUP_ROOT=${BACKUP_ROOT:-"/var/backups/shopify-seo-analyzer"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PREFIX="${PROJECT_NAME:-shopify-seo-analyzer}"

# S3 Configuration (optional)
S3_BACKUP_ENABLED=${S3_BACKUP_ENABLED:-false}
S3_BUCKET=${S3_BUCKET:-""}
S3_PREFIX=${S3_PREFIX:-"backups"}

# Notification Configuration
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}
EMAIL_NOTIFICATION=${EMAIL_NOTIFICATION:-""}

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
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create backup directories
create_backup_dirs() {
    mkdir -p "$BACKUP_ROOT/database"
    mkdir -p "$BACKUP_ROOT/files"
    mkdir -p "$BACKUP_ROOT/config"
    mkdir -p "$BACKUP_ROOT/logs"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    local backup_file=$3
    local backup_size=$4
    
    # Slack notification
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        local emoji="✅"
        if [ "$status" = "error" ]; then
            color="danger"
            emoji="❌"
        fi
        
        curl -X POST $SLACK_WEBHOOK_URL \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji Backup $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Type\", \"value\": \"$BACKUP_TYPE\", \"short\": true},
                        {\"title\": \"File\", \"value\": \"$backup_file\", \"short\": true},
                        {\"title\": \"Size\", \"value\": \"$backup_size\", \"short\": true},
                        {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true}
                    ]
                }]
            }" 2>/dev/null || true
    fi
    
    # Email notification
    if [ ! -z "$EMAIL_NOTIFICATION" ] && command -v mail &> /dev/null; then
        echo -e "Backup Status: $status\n\n$message\n\nFile: $backup_file\nSize: $backup_size\nTime: $(date)" | \
            mail -s "[$BACKUP_PREFIX] Backup $status" $EMAIL_NOTIFICATION || true
    fi
}

# Backup database
backup_database() {
    print_info "Starting database backup..."
    
    local db_backup_file="$BACKUP_ROOT/database/${BACKUP_PREFIX}_db_${BACKUP_TIMESTAMP}.sql.gz"
    local db_structure_file="$BACKUP_ROOT/database/${BACKUP_PREFIX}_structure_${BACKUP_TIMESTAMP}.sql"
    
    # Check database connection
    if ! PGPASSWORD=$DB_PASSWORD pg_isready -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER &> /dev/null; then
        print_error "Cannot connect to database!"
        send_notification "error" "Cannot connect to database" "" ""
        return 1
    fi
    
    # Backup database structure
    print_info "Backing up database structure..."
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p ${DB_PORT:-5432} \
        -U $DB_USER \
        -d $DB_NAME \
        --schema-only \
        --no-owner \
        --no-privileges \
        > "$db_structure_file" || {
        print_error "Failed to backup database structure!"
        return 1
    }
    
    # Backup full database with data
    print_info "Backing up database data..."
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p ${DB_PORT:-5432} \
        -U $DB_USER \
        -d $DB_NAME \
        --no-owner \
        --no-privileges \
        --verbose \
        | gzip -9 > "$db_backup_file" || {
        print_error "Failed to backup database!"
        rm -f "$db_structure_file"
        return 1
    }
    
    # Get backup size
    local backup_size=$(du -h "$db_backup_file" | cut -f1)
    
    print_success "Database backup completed: $db_backup_file ($backup_size)"
    
    # Upload to S3 if enabled
    if [ "$S3_BACKUP_ENABLED" = "true" ] && [ ! -z "$S3_BUCKET" ]; then
        upload_to_s3 "$db_backup_file" "database"
        upload_to_s3 "$db_structure_file" "database"
    fi
    
    send_notification "success" "Database backup completed successfully" "$db_backup_file" "$backup_size"
    
    return 0
}

# Backup files
backup_files() {
    print_info "Starting files backup..."
    
    local files_backup_file="$BACKUP_ROOT/files/${BACKUP_PREFIX}_files_${BACKUP_TIMESTAMP}.tar.gz"
    
    # Directories to backup
    local backup_dirs=(
        "uploads"
        "public/images"
        "public/documents"
        "exports"
    )
    
    # Create file list
    local include_list=""
    for dir in "${backup_dirs[@]}"; do
        if [ -d "$dir" ]; then
            include_list="$include_list $dir"
        fi
    done
    
    if [ -z "$include_list" ]; then
        print_warning "No files to backup"
        return 0
    fi
    
    # Create backup
    tar -czf "$files_backup_file" \
        --exclude="*.tmp" \
        --exclude="*.cache" \
        --exclude="thumbs" \
        $include_list || {
        print_error "Failed to backup files!"
        return 1
    }
    
    # Get backup size
    local backup_size=$(du -h "$files_backup_file" | cut -f1)
    
    print_success "Files backup completed: $files_backup_file ($backup_size)"
    
    # Upload to S3 if enabled
    if [ "$S3_BACKUP_ENABLED" = "true" ] && [ ! -z "$S3_BUCKET" ]; then
        upload_to_s3 "$files_backup_file" "files"
    fi
    
    send_notification "success" "Files backup completed successfully" "$files_backup_file" "$backup_size"
    
    return 0
}

# Backup configuration
backup_config() {
    print_info "Starting configuration backup..."
    
    local config_backup_file="$BACKUP_ROOT/config/${BACKUP_PREFIX}_config_${BACKUP_TIMESTAMP}.tar.gz"
    
    # Files to backup
    local config_files=(
        ".env"
        ".env.production"
        "package.json"
        "package-lock.json"
        "ecosystem.config.js"
        "docker-compose.yml"
        "Dockerfile"
        "nginx.conf"
        "config/"
    )
    
    # Create file list
    local include_list=""
    for file in "${config_files[@]}"; do
        if [ -e "$file" ]; then
            include_list="$include_list $file"
        fi
    done
    
    # Create backup
    tar -czf "$config_backup_file" \
        --exclude="config/certs" \
        $include_list || {
        print_error "Failed to backup configuration!"
        return 1
    }
    
    # Encrypt sensitive configuration
    if command -v gpg &> /dev/null && [ ! -z "$BACKUP_ENCRYPTION_KEY" ]; then
        print_info "Encrypting configuration backup..."
        gpg --batch --yes \
            --passphrase "$BACKUP_ENCRYPTION_KEY" \
            --cipher-algo AES256 \
            --symmetric \
            --output "${config_backup_file}.gpg" \
            "$config_backup_file" && \
        rm -f "$config_backup_file" && \
        config_backup_file="${config_backup_file}.gpg"
    fi
    
    # Get backup size
    local backup_size=$(du -h "$config_backup_file" | cut -f1)
    
    print_success "Configuration backup completed: $config_backup_file ($backup_size)"
    
    # Upload to S3 if enabled
    if [ "$S3_BACKUP_ENABLED" = "true" ] && [ ! -z "$S3_BUCKET" ]; then
        upload_to_s3 "$config_backup_file" "config"
    fi
    
    return 0
}

# Backup logs
backup_logs() {
    print_info "Starting logs backup..."
    
    local logs_backup_file="$BACKUP_ROOT/logs/${BACKUP_PREFIX}_logs_${BACKUP_TIMESTAMP}.tar.gz"
    
    # Create backup
    if [ -d "logs" ]; then
        tar -czf "$logs_backup_file" logs/ || {
            print_warning "Failed to backup logs"
            return 1
        }
        
        # Get backup size
        local backup_size=$(du -h "$logs_backup_file" | cut -f1)
        
        print_success "Logs backup completed: $logs_backup_file ($backup_size)"
        
        # Upload to S3 if enabled
        if [ "$S3_BACKUP_ENABLED" = "true" ] && [ ! -z "$S3_BUCKET" ]; then
            upload_to_s3 "$logs_backup_file" "logs"
        fi
    else
        print_warning "No logs directory found"
    fi
    
    return 0
}

# Upload to S3
upload_to_s3() {
    local file=$1
    local type=$2
    
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLI not installed, skipping S3 upload"
        return 1
    fi
    
    print_info "Uploading to S3: $file"
    
    local s3_path="s3://$S3_BUCKET/$S3_PREFIX/$type/$(basename $file)"
    
    aws s3 cp "$file" "$s3_path" \
        --storage-class STANDARD_IA \
        --metadata "backup-type=$BACKUP_TYPE,timestamp=$BACKUP_TIMESTAMP" || {
        print_error "Failed to upload to S3!"
        return 1
    }
    
    print_success "Uploaded to S3: $s3_path"
    
    return 0
}

# Clean old backups
clean_old_backups() {
    print_info "Cleaning old backups (older than $BACKUP_RETENTION_DAYS days)..."
    
    # Clean local backups
    find "$BACKUP_ROOT" -type f -name "${BACKUP_PREFIX}_*" -mtime +$BACKUP_RETENTION_DAYS -delete || true
    
    # Clean S3 backups if enabled
    if [ "$S3_BACKUP_ENABLED" = "true" ] && [ ! -z "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        print_info "Cleaning old S3 backups..."
        
        # Calculate cutoff date
        local cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y-%m-%d)
        
        # List and delete old backups
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "$S3_PREFIX/" \
            --query "Contents[?LastModified<'$cutoff_date'].Key" \
            --output text | \
        xargs -n1 -I{} aws s3 rm "s3://$S3_BUCKET/{}" 2>/dev/null || true
    fi
    
    print_success "Old backups cleaned"
}

# Verify backup
verify_backup() {
    local backup_file=$1
    
    print_info "Verifying backup: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found!"
        return 1
    fi
    
    # Check file integrity
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" &> /dev/null; then
            print_error "Backup file is corrupted!"
            return 1
        fi
    elif [[ "$backup_file" == *.tar.gz ]]; then
        if ! tar -tzf "$backup_file" &> /dev/null; then
            print_error "Backup archive is corrupted!"
            return 1
        fi
    fi
    
    print_success "Backup verified successfully"
    return 0
}

# Generate backup report
generate_report() {
    local report_file="$BACKUP_ROOT/backup_report_${BACKUP_TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
Shopify SEO Analyzer Backup Report
==================================

Date: $(date)
Type: $BACKUP_TYPE
Host: $(hostname)

Backup Summary:
--------------
EOF
    
    # Add database backups
    echo -e "\nDatabase Backups:" >> "$report_file"
    find "$BACKUP_ROOT/database" -name "${BACKUP_PREFIX}_*" -type f -mtime -1 -exec ls -lh {} \; >> "$report_file"
    
    # Add file backups
    echo -e "\nFile Backups:" >> "$report_file"
    find "$BACKUP_ROOT/files" -name "${BACKUP_PREFIX}_*" -type f -mtime -1 -exec ls -lh {} \; >> "$report_file"
    
    # Add config backups
    echo -e "\nConfiguration Backups:" >> "$report_file"
    find "$BACKUP_ROOT/config" -name "${BACKUP_PREFIX}_*" -type f -mtime -1 -exec ls -lh {} \; >> "$report_file"
    
    # Add disk usage
    echo -e "\nDisk Usage:" >> "$report_file"
    df -h "$BACKUP_ROOT" >> "$report_file"
    
    # Add total backup size
    echo -e "\nTotal Backup Size:" >> "$report_file"
    du -sh "$BACKUP_ROOT" >> "$report_file"
    
    print_success "Backup report generated: $report_file"
}

# Full backup
full_backup() {
    print_info "Starting full backup..."
    
    local start_time=$(date +%s)
    local success=true
    
    # Run all backup types
    backup_database || success=false
    backup_files || success=false
    backup_config || success=false
    backup_logs || success=false
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        print_success "Full backup completed in ${duration}s"
        send_notification "success" "Full backup completed successfully in ${duration}s" "" ""
    else
        print_error "Full backup completed with errors in ${duration}s"
        send_notification "error" "Full backup completed with errors" "" ""
    fi
    
    # Generate report
    generate_report
    
    # Clean old backups
    clean_old_backups
}

# Restore backup
restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will restore from backup: $backup_file"
    read -p "Are you sure? This will overwrite current data! (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
    
    # Decrypt if needed
    if [[ "$backup_file" == *.gpg ]]; then
        print_info "Decrypting backup..."
        local decrypted_file="${backup_file%.gpg}"
        gpg --batch --yes \
            --passphrase "$BACKUP_ENCRYPTION_KEY" \
            --decrypt \
            --output "$decrypted_file" \
            "$backup_file" || {
            print_error "Failed to decrypt backup!"
            exit 1
        }
        backup_file="$decrypted_file"
    fi
    
    # Determine backup type
    if [[ "$backup_file" == *_db_* ]]; then
        print_info "Restoring database..."
        gunzip -c "$backup_file" | \
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER $DB_NAME || {
            print_error "Failed to restore database!"
            exit 1
        }
        print_success "Database restored successfully"
        
    elif [[ "$backup_file" == *_files_* ]]; then
        print_info "Restoring files..."
        tar -xzf "$backup_file" -C . || {
            print_error "Failed to restore files!"
            exit 1
        }
        print_success "Files restored successfully"
        
    elif [[ "$backup_file" == *_config_* ]]; then
        print_info "Restoring configuration..."
        tar -xzf "$backup_file" -C . || {
            print_error "Failed to restore configuration!"
            exit 1
        }
        print_success "Configuration restored successfully"
        
    else
        print_error "Unknown backup type!"
        exit 1
    fi
    
    # Clean up decrypted file
    if [[ "$backup_file" != "$1" ]]; then
        rm -f "$backup_file"
    fi
}

# Main function
main() {
    echo "======================================"
    echo "   Shopify SEO Analyzer Backup      "
    echo "======================================"
    echo
    
    # Create backup directories
    create_backup_dirs
    
    # Check backup type
    case "$BACKUP_TYPE" in
        "full")
            full_backup
            ;;
        "database")
            backup_database
            clean_old_backups
            ;;
        "files")
            backup_files
            clean_old_backups
            ;;
        "config")
            backup_config
            clean_old_backups
            ;;
        "restore")
            restore_backup "$2"
            ;;
        *)
            print_error "Invalid backup type: $BACKUP_TYPE"
            echo "Usage: $0 [full|database|files|config|restore] [backup_file]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"