-- Migration: Create Settings and Alerts Tables
-- Version: 005
-- Date: 2024
-- Dependencies: 001_create_users.sql, 002_create_websites.sql

-- Up Migration

-- Create alert type enum
CREATE TYPE alert_type AS ENUM ('email', 'slack', 'webhook');

-- Create settings table
CREATE TABLE settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_refresh_token TEXT,
    shopify_api_key TEXT,
    shopify_api_secret TEXT,
    email_notifications BOOLEAN DEFAULT true,
    slack_webhook_url TEXT,
    slack_notifications BOOLEAN DEFAULT false,
    weekly_report BOOLEAN DEFAULT true,
    daily_analysis_time TIME DEFAULT '09:00:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create alerts configuration table
CREATE TABLE alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    alert_name VARCHAR(255) NOT NULL,
    alert_type alert_type NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    condition_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE INDEX idx_alerts_user ON alerts(user_id, is_active);
CREATE INDEX idx_alerts_website ON alerts(website_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);

-- Create updated_at triggers
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at 
    BEFORE UPDATE ON alerts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Down Migration
-- DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
-- DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
-- DROP TABLE IF EXISTS alerts;
-- DROP TABLE IF EXISTS settings;
-- DROP TYPE IF EXISTS alert_type;