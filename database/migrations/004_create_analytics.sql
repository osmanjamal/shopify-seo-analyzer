-- Migration: Create Analytics and Technical Tables
-- Version: 004
-- Date: 2024
-- Dependencies: 002_create_websites.sql

-- Up Migration

-- Create issue severity enum
CREATE TYPE issue_severity AS ENUM ('critical', 'high', 'medium', 'low');

-- Create analytics data table
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

-- Create technical issues table
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

-- Create page speed metrics table
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

-- Create competitors table
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

-- Create indexes
CREATE INDEX idx_analytics_website_date ON analytics_data(website_id, date DESC);
CREATE INDEX idx_technical_issues_website ON technical_issues(website_id, is_resolved);
CREATE INDEX idx_technical_issues_severity ON technical_issues(severity);
CREATE INDEX idx_page_speed_website ON page_speed_metrics(website_id, measured_at DESC);
CREATE INDEX idx_page_speed_url ON page_speed_metrics(page_url);
CREATE INDEX idx_competitors_website ON competitors(website_id);

-- Create updated_at triggers
CREATE TRIGGER update_technical_issues_updated_at 
    BEFORE UPDATE ON technical_issues
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitors_updated_at 
    BEFORE UPDATE ON competitors
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Down Migration
-- DROP TRIGGER IF EXISTS update_competitors_updated_at ON competitors;
-- DROP TRIGGER IF EXISTS update_technical_issues_updated_at ON technical_issues;
-- DROP TABLE IF EXISTS competitors;
-- DROP TABLE IF EXISTS page_speed_metrics;
-- DROP TABLE IF EXISTS technical_issues;
-- DROP TABLE IF EXISTS analytics_data;
-- DROP TYPE IF EXISTS issue_severity;