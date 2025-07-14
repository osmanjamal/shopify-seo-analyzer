const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { sequelize } = require('../utils/database');

class DatabaseMigrator {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'shopify_seo_analyzer_dev'
    });
    
    this.migrationsPath = path.join(__dirname, '../../../database/migrations');
    this.executedMigrations = new Set();
  }

  // Create migrations table if not exists
  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.pool.query(query);
    console.log('✅ Migrations table ready');
  }

  // Get executed migrations
  async getExecutedMigrations() {
    const result = await this.pool.query('SELECT filename FROM migrations');
    return new Set(result.rows.map(row => row.filename));
  }

  // Get migration files
  async getMigrationFiles() {
    const files = await fs.readdir(this.migrationsPath);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
  }

  // Execute migration file
  async executeMigration(filename) {
    const filepath = path.join(this.migrationsPath, filename);
    const sql = await fs.readFile(filepath, 'utf8');
    
    try {
      await this.pool.query('BEGIN');
      
      // Execute migration SQL
      await this.pool.query(sql);
      
      // Record migration
      await this.pool.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await this.pool.query('COMMIT');
      console.log(`✅ Executed migration: ${filename}`);
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      throw error;
    }
  }

  // Run all pending migrations
  async runMigrations() {
    try {
      console.log('🚀 Starting database migrations...');
      
      // Create migrations table
      await this.createMigrationsTable();
      
      // Get executed migrations
      this.executedMigrations = await this.getExecutedMigrations();
      
      // Get migration files
      const migrationFiles = await this.getMigrationFiles();
      
      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !this.executedMigrations.has(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
      
      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  }

  // Rollback last migration
  async rollbackMigration() {
    try {
      const result = await this.pool.query(
        'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      const lastMigration = result.rows[0].filename;
      console.log(`🔄 Rolling back migration: ${lastMigration}`);
      
      // Note: This is a simplified rollback
      // In production, you'd want DOWN migrations
      await this.pool.query('BEGIN');
      await this.pool.query(
        'DELETE FROM migrations WHERE filename = $1',
        [lastMigration]
      );
      await this.pool.query('COMMIT');
      
      console.log(`✅ Rolled back migration: ${lastMigration}`);
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error('❌ Rollback error:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    await this.pool.end();
  }
}

// Data migration utilities
class DataMigrator {
  // Migrate data from old schema to new schema
  static async migrateUserData(oldPool, newPool) {
    console.log('📝 Migrating user data...');
    
    const oldUsers = await oldPool.query('SELECT * FROM old_users');
    
    for (const user of oldUsers.rows) {
      await newPool.query(`
        INSERT INTO users (id, email, full_name, role, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [user.id, user.email, user.name, user.role || 'user', user.created_at]);
    }
    
    console.log(`✅ Migrated ${oldUsers.rows.length} users`);
  }

  // Migrate analytics data with aggregation
  static async migrateAnalyticsData(oldPool, newPool) {
    console.log('📝 Migrating analytics data...');
    
    // Example: Aggregate old hourly data to daily
    const query = `
      INSERT INTO analytics_data (website_id, date, visitors, page_views, bounce_rate)
      SELECT 
        website_id,
        DATE(timestamp) as date,
        SUM(visitors) as visitors,
        SUM(page_views) as page_views,
        AVG(bounce_rate) as bounce_rate
      FROM old_analytics
      GROUP BY website_id, DATE(timestamp)
      ON CONFLICT (website_id, date) DO UPDATE
      SET 
        visitors = EXCLUDED.visitors,
        page_views = EXCLUDED.page_views,
        bounce_rate = EXCLUDED.bounce_rate
    `;
    
    await newPool.query(query);
    console.log('✅ Analytics data migrated');
  }

  // Clean up old data
  static async cleanupOldData(pool, daysToKeep = 90) {
    console.log('🧹 Cleaning up old data...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Delete old analytics data
    const analyticsResult = await pool.query(
      'DELETE FROM analytics_data WHERE date < $1',
      [cutoffDate]
    );
    
    console.log(`✅ Deleted ${analyticsResult.rowCount} old analytics records`);
    
    // Delete old keyword history
    const historyResult = await pool.query(
      'DELETE FROM keyword_history WHERE tracked_at < $1',
      [cutoffDate]
    );
    
    console.log(`✅ Deleted ${historyResult.rowCount} old keyword history records`);
  }
}

// Main migration function
const runMigration = async () => {
  const migrator = new DatabaseMigrator();
  
  try {
    // Run schema migrations
    await migrator.runMigrations();
    
    // Optional: Run data migrations
    if (process.env.RUN_DATA_MIGRATION === 'true') {
      console.log('\n📊 Starting data migration...');
      
      const oldPool = new Pool({
        // Old database connection
        host: process.env.OLD_DB_HOST,
        database: process.env.OLD_DB_NAME,
        user: process.env.OLD_DB_USER,
        password: process.env.OLD_DB_PASSWORD
      });
      
      await DataMigrator.migrateUserData(oldPool, migrator.pool);
      await DataMigrator.migrateAnalyticsData(oldPool, migrator.pool);
      
      await oldPool.end();
    }
    
    // Optional: Cleanup old data
    if (process.env.CLEANUP_OLD_DATA === 'true') {
      await DataMigrator.cleanupOldData(migrator.pool);
    }
    
    // Sync Sequelize models
    console.log('\n🔄 Syncing Sequelize models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrator.close();
    await sequelize.close();
  }
};

// CLI commands
const command = process.argv[2];

switch (command) {
  case 'up':
    runMigration();
    break;
    
  case 'rollback':
    const migrator = new DatabaseMigrator();
    migrator.rollbackMigration()
      .then(() => migrator.close())
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
    break;
    
  case 'status':
    const statusMigrator = new DatabaseMigrator();
    statusMigrator.createMigrationsTable()
      .then(() => statusMigrator.getExecutedMigrations())
      .then(executed => {
        console.log('Executed migrations:', Array.from(executed));
        return statusMigrator.close();
      })
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
    break;
    
  default:
    console.log(`
      Usage: node migrateData.js [command]
      
      Commands:
        up        Run all pending migrations
        rollback  Rollback last migration
        status    Show migration status
    `);
}

module.exports = { DatabaseMigrator, DataMigrator };