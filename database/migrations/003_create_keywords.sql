-- Migration: Create Keywords Table and Related Tables
-- Version: 003
-- Date: 2024
-- Dependencies: 002_create_websites.sql

-- Up Migration

-- Create keyword status enum
CREATE TYPE keyword_status AS ENUM ('active', 'paused', 'deleted');

-- Create keywords table
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

-- Create keyword history table
CREATE TABLE keyword_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    position INTEGER,
    search_volume INTEGER,
    tracked_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(keyword_id, tracked_at)
);

-- Create indexes
CREATE INDEX idx_keywords_website_id ON keywords(website_id);
CREATE INDEX idx_keywords_status ON keywords(status);
CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_keywords_current_position ON keywords(current_position);
CREATE INDEX idx_keyword_history_keyword_date ON keyword_history(keyword_id, tracked_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_keywords_updated_at 
    BEFORE UPDATE ON keywords
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Down Migration
-- DROP TRIGGER IF EXISTS update_keywords_updated_at ON keywords;
-- DROP TABLE IF EXISTS keyword_history;
-- DROP TABLE IF EXISTS keywords;
-- DROP TYPE IF EXISTS keyword_status;