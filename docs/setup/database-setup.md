# Database Setup Guide

## Overview

This guide covers the complete database setup for the Shopify SEO Analyzer platform using PostgreSQL.

## Prerequisites

- PostgreSQL 14+ installed
- pgAdmin or similar database management tool (optional)
- Node.js 16+ for running migration scripts
- Basic SQL knowledge

## Table of Contents

1. [PostgreSQL Installation](#postgresql-installation)
2. [Database Creation](#database-creation)
3. [User Setup and Permissions](#user-setup-and-permissions)
4. [Running Migrations](#running-migrations)
5. [Seeding Initial Data](#seeding-initial-data)
6. [Backup and Restore](#backup-and-restore)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## 1. PostgreSQL Installation

### macOS

```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14

# Verify installation
psql --version
```

### Ubuntu/Debian

```bash
# Add PostgreSQL official repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-14 postgresql-client-14

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

1. Download installer from [PostgreSQL website](https://www.postgresql.org/download/windows/)
2. Run installer with default settings
3. Remember the superuser password
4. Add PostgreSQL bin to PATH

### Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: shopify_seo_analyzer
      POSTGRES_USER: seo_admin
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
```

---

## 2. Database Creation

### Step 1: Connect as Superuser

```bash
# Local connection
psql -U postgres

# Or with host
psql -h localhost -U postgres
```

### Step 2: Create Database and User

```sql
-- Create user
CREATE USER seo_admin WITH PASSWORD 'your_secure_password';

-- Create database
CREATE DATABASE shopify_seo_analyzer OWNER seo_admin;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE shopify_seo_analyzer TO seo_admin;

-- Create read-only user for analytics
CREATE USER seo_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE shopify_seo_analyzer TO seo_readonly;

-- Exit
\q
```

### Step 3: Configure Connection

Create `.env` file:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopify_seo_analyzer
DB_USER=seo_admin
DB_PASSWORD=your_secure_password
DB_SSL=false

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE=10000

# Read-only connection (optional)
DB_READONLY_USER=seo_readonly
DB_READONLY_PASSWORD=readonly_password
```

### Step 4: Test Connection

```javascript
// test-db-connection.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
```

---

## 3. User Setup and Permissions

### Create Application Roles

```sql
-- Connect to database
\c shopify_seo_analyzer

-- Create roles
CREATE ROLE seo_app_role;
CREATE ROLE seo_readonly_role;

-- Grant permissions to app role
GRANT CONNECT ON DATABASE shopify_seo_analyzer TO seo_app_role;
GRANT USAGE ON SCHEMA public TO seo_app_role;
GRANT CREATE ON SCHEMA public TO seo_app_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seo_app_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO seo_app_role;

-- Grant read-only permissions
GRANT CONNECT ON DATABASE shopify_seo_analyzer TO seo_readonly_role;
GRANT USAGE ON SCHEMA public TO seo_readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO seo_readonly_role;

-- Assign roles to users
GRANT seo_app_role TO seo_admin;
GRANT seo_readonly_role TO seo_readonly;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL ON TABLES TO seo_app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO seo_readonly_role;
```

---

## 4. Running Migrations

### Step 1: Install Migration Tool

```bash
npm install -g db-migrate db-migrate-pg
```

### Step 2: Configure Migrations

Create `database.json`:
```json
{
  "dev": {
    "driver": "pg",
    "host": "localhost",
    "port": 5432,
    "database": "shopify_seo_analyzer",
    "user": "seo_admin",
    "password": "your_secure_password",
    "schema": "public"
  },
  "prod": {
    "driver": "pg",
    "host": {"ENV": "DB_HOST"},
    "port": {"ENV": "DB_PORT"},
    "database": {"ENV": "DB_NAME"},
    "user": {"ENV": "DB_USER"},
    "password": {"ENV": "DB_PASSWORD"},
    "ssl": {"ENV": "DB_SSL"}
  }
}
```

### Step 3: Run Migrations

```bash
# Run all migrations
npm run migrate:up

# Or manually
db-migrate up --config database.json -e dev

# Rollback last migration
npm run migrate:down

# Create new migration
db-migrate create add-new-feature --config database.json
```

### Step 4: Migration Script

```javascript
// scripts/migrate.js
const { exec } = require('child_process');
const path = require('path');

const migrations = [
  '001_create_users.sql',
  '002_create_websites.sql',
  '003_create_keywords.sql',
  '004_create_analytics.sql',
  '005_create_settings.sql',
];

async function runMigrations() {
  const { Pool } = require('pg');
  const fs = require('fs').promises;
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run each migration
    for (const migration of migrations) {
      const filePath = path.join(__dirname, '../database/migrations', migration);
      
      // Check if already executed
      const check = await pool.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [migration]
      );
      
      if (check.rows.length === 0) {
        console.log(`Running migration: ${migration}`);
        const sql = await fs.readFile(filePath, 'utf8');
        
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [migration]
        );
        
        console.log(`✅ Completed: ${migration}`);
      } else {
        console.log(`⏭️  Skipping: ${migration} (already executed)`);
      }
    }
    
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
```

---

## 5. Seeding Initial Data

### Development Seeds

```javascript
// scripts/seed-dev.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@example.com', hashedPassword, 'Admin User', 'admin']);

    // Create test websites
    for (let i = 0; i < 5; i++) {
      const domain = faker.internet.domainName();
      await pool.query(`
        INSERT INTO websites (domain, name, shopify_store_id, user_id)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (domain) DO NOTHING
      `, [domain, faker.company.name(), faker.string.uuid()]);
    }

    // Create test keywords
    const keywords = [
      'shopify seo', 'ecommerce optimization', 'product search',
      'online store tips', 'conversion rate', 'mobile shopping'
    ];

    for (const keyword of keywords) {
      await pool.query(`
        INSERT INTO keywords (keyword, website_id, target_position)
        VALUES ($1, 1, $2)
        ON CONFLICT (keyword, website_id) DO NOTHING
      `, [keyword, Math.floor(Math.random() * 10) + 1]);
    }

    console.log('✅ Development data seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seedDatabase();
```

### Production Seeds

```bash
# Run production seeds
psql -U seo_admin -d shopify_seo_analyzer -f database/seeds/production.sql
```

---

## 6. Backup and Restore

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

# Configuration
DB_NAME="shopify_seo_analyzer"
DB_USER="seo_admin"
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="$DB_NAME-$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting backup of $DB_NAME..."
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/$FILENAME

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup completed: $FILENAME"
    
    # Remove backups older than 30 days
    find $BACKUP_DIR -name "$DB_NAME-*.sql.gz" -mtime +30 -delete
    echo "✅ Old backups cleaned up"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Upload to S3 (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
    aws s3 cp $BACKUP_DIR/$FILENAME s3://$AWS_S3_BUCKET/database-backups/
    echo "✅ Backup uploaded to S3"
fi
```

### Restore from Backup

```bash
#!/bin/bash
# scripts/restore-database.sh

# Get backup file
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore-database.sh <backup-file>"
    exit 1
fi

# Confirm restoration
echo "⚠️  This will restore database from: $BACKUP_FILE"
echo "⚠️  Current data will be LOST!"
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ]; then
    echo "Restoration cancelled"
    exit 0
fi

# Restore database
echo "Restoring database..."
gunzip -c $BACKUP_FILE | psql -U seo_admin -d shopify_seo_analyzer

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"
else
    echo "❌ Restoration failed!"
    exit 1
fi
```

### Scheduled Backups

```cron
# Add to crontab
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sunday
0 3 * * 0 /path/to/scripts/backup-database.sh --full >> /var/log/db-backup.log 2>&1
```

---

## 7. Performance Optimization

### Index Creation

```sql
-- Performance indexes
CREATE INDEX idx_keywords_website_id ON keywords(website_id);
CREATE INDEX idx_keywords_position ON keywords(current_position);
CREATE INDEX idx_analytics_created_at ON analytics_data(created_at);
CREATE INDEX idx_analytics_website_date ON analytics_data(website_id, date);
CREATE INDEX idx_technical_issues_severity ON technical_issues(severity);
CREATE INDEX idx_users_email ON users(email);

-- Composite indexes for common queries
CREATE INDEX idx_keywords_website_position 
  ON keywords(website_id, current_position) 
  WHERE current_position IS NOT NULL;

CREATE INDEX idx_analytics_metrics 
  ON analytics_data(website_id, metric_type, date DESC);

-- Full text search
CREATE INDEX idx_products_search 
  ON products USING gin(to_tsvector('english', title || ' ' || description));
```

### Query Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT k.keyword, k.current_position, k.previous_position
FROM keywords k
WHERE k.website_id = 1
  AND k.current_position <= 20
ORDER BY k.current_position;

-- Update statistics
ANALYZE keywords;
ANALYZE analytics_data;

-- Vacuum tables
VACUUM ANALYZE;
```

### Connection Pooling

```javascript
// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  max: 20,                  // Maximum pool size
  min: 5,                   // Minimum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Timeout for new connections
  
  // Connection retry
  allowExitOnIdle: false,
  
  // Statement timeout
  statement_timeout: 30000,
  
  // Application name for monitoring
  application_name: 'shopify-seo-analyzer',
});

// Monitor pool events
pool.on('connect', () => {
  console.log('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

---

## 8. Monitoring and Maintenance

### Database Statistics

```sql
-- Database size
SELECT pg_database_size('shopify_seo_analyzer') / 1024 / 1024 as size_mb;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE datname = 'shopify_seo_analyzer';

-- Slow queries
SELECT 
  query,
  calls,
  total_time,
  mean,
  min,
  max
FROM pg_stat_statements
WHERE mean > 100
ORDER BY mean DESC
LIMIT 10;
```

### Maintenance Tasks

```javascript
// scripts/db-maintenance.js
const cron = require('node-cron');
const { Pool } = require('pg');

const pool = new Pool();

// Daily maintenance
cron.schedule('0 3 * * *', async () => {
  try {
    // Update statistics
    await pool.query('ANALYZE;');
    console.log('✅ Statistics updated');
    
    // Clean old data
    await pool.query(`
      DELETE FROM analytics_data 
      WHERE created_at < NOW() - INTERVAL '90 days'
    `);
    console.log('✅ Old analytics data cleaned');
    
    // Vacuum
    await pool.query('VACUUM ANALYZE;');
    console.log('✅ Vacuum completed');
    
  } catch (error) {
    console.error('❌ Maintenance failed:', error);
  }
});

// Weekly maintenance
cron.schedule('0 4 * * 0', async () => {
  try {
    // Reindex
    await pool.query('REINDEX DATABASE shopify_seo_analyzer;');
    console.log('✅ Reindex completed');
    
  } catch (error) {
    console.error('❌ Weekly maintenance failed:', error);
  }
});
```

---

## 9. Troubleshooting

### Common Issues

#### Connection Refused

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Verify listening ports
sudo netstat -plnt | grep postgres
```

#### Authentication Failed

```bash
# Check pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Should have:
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Reload configuration
sudo systemctl reload postgresql
```

#### Performance Issues

```sql
-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  most_common_vals
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND attname NOT IN (
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid
    WHERE a.attnum = ANY(i.indkey)
  );

-- Find blocking queries
SELECT 
  pid,
  usename,
  pg_blocking_pids(pid) as blocked_by,
  query as blocked_query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

### Debug Mode

Enable query logging:

```sql
-- In postgresql.conf
log_statement = 'all'
log_duration = on
log_min_duration_statement = 100

-- Reload
SELECT pg_reload_conf();
```

---

## Environment Variables Summary

```env
# Database Connection
DATABASE_URL=postgresql://seo_admin:password@localhost:5432/shopify_seo_analyzer
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopify_seo_analyzer
DB_USER=seo_admin
DB_PASSWORD=your_secure_password
DB_SSL=false

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE=10000
DB_POOL_ACQUIRE=30000

# Backup Configuration
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_RETENTION_DAYS=30

# Monitoring
DB_LOG_QUERIES=false
DB_LOG_SLOW_QUERIES=true
DB_SLOW_QUERY_MS=1000
```

---

## Next Steps

1. Configure [Google APIs](./google-apis.md)
2. Set up [Shopify Integration](./shopify-integration.md)
3. Deploy to [Production](./deployment.md)
4. Set up monitoring and alerts

---

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node-Postgres Documentation](https://node-postgres.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)