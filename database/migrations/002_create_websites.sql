-- Migration: Create Websites Table
-- Version: 002
-- Date: 2024
-- Dependencies: 001_create_users.sql

-- Up Migration
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

-- Create indexes
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_websites_domain ON websites(domain);
CREATE INDEX idx_websites_is_active ON websites(is_active);
CREATE INDEX idx_websites_shopify_store_id ON websites(shopify_store_id);

-- Create updated_at trigger
CREATE TRIGGER update_websites_updated_at 
    BEFORE UPDATE ON websites
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Down Migration
-- DROP TRIGGER IF EXISTS update_websites_updated_at ON websites;
-- DROP TABLE IF EXISTS websites;