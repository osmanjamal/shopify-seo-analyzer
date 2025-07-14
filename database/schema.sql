-- PostgreSQL 14+ Schema for Shopify SEO Analyzer
-- Complete database schema with all tables and relationships

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
CREATE TYPE keyword_status AS ENUM ('active', 'paused', 'deleted');
CREATE TYPE issue_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE alert_type AS ENUM ('email', 'slack', 'webhook');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Websites table
CREATE TABLE websites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    shopify_store_id VARCHAR(255),
    shopify_access_token TEXT,
    google_site_id VARCHAR(255),
    google_view_id VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, domain)
);

-- Keywords table
CREATE TABLE keywords (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    target_url TEXT,
    search_volume INTEGER,
    difficulty DECIMAL(5,2),
    current_position INTEGER,
    previous_position INTEGER,
    best_position INTEGER,
    status keyword_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, keyword)
);

-- Analytics data table
CREATE TABLE analytics_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2),
    avg_session_duration INTEGER,
    organic_traffic INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2),
    revenue DECIMAL(12,2),
    transactions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, date)
);

-- Technical issues table
CREATE TABLE technical_issues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    issue_description TEXT,
    severity issue_severity NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
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

-- Keyword history table for tracking position changes
CREATE TABLE keyword_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    position INTEGER,
    search_volume INTEGER,
    tracked_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(keyword_id, tracked_at)
);

-- Page speed metrics table
CREATE TABLE page_speed_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    performance_score INTEGER,
    seo_score INTEGER,
    accessibility_score INTEGER,
    best_practices_score INTEGER,
    first_contentful_paint DECIMAL(8,2),
    speed_index DECIMAL(8,2),
    largest_contentful_paint DECIMAL(8,2),
    time_to_interactive DECIMAL(8,2),
    total_blocking_time DECIMAL(8,2),
    cumulative_layout_shift DECIMAL(5,3),
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Competitor analysis table
CREATE TABLE competitors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    competitor_domain VARCHAR(255) NOT NULL,
    organic_keywords INTEGER,
    organic_traffic INTEGER,
    domain_rating INTEGER,
    backlinks INTEGER,
    last_analyzed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, competitor_domain)
);

-- Alerts configuration table
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

-- Create indexes for performance
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_keywords_website_id ON keywords(website_id);
CREATE INDEX idx_keywords_status ON keywords(status);
CREATE INDEX idx_analytics_website_date ON analytics_data(website_id, date DESC);
CREATE INDEX idx_technical_issues_website ON technical_issues(website_id, is_resolved);
CREATE INDEX idx_keyword_history_keyword_date ON keyword_history(keyword_id, tracked_at DESC);
CREATE INDEX idx_page_speed_website ON page_speed_metrics(website_id, measured_at DESC);
CREATE INDEX idx_competitors_website ON competitors(website_id);
CREATE INDEX idx_alerts_user ON alerts(user_id, is_active);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technical_issues_updated_at BEFORE UPDATE ON technical_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitors_updated_at BEFORE UPDATE ON competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();