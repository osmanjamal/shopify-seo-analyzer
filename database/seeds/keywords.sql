-- Seed data for keywords table
-- Test keywords with various positions and statuses

-- Keywords for Fashion Store
INSERT INTO keywords (id, website_id, keyword, target_url, search_volume, difficulty, current_position, previous_position, best_position, status)
VALUES 
    ('11eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'summer dresses 2024', 'https://fashionstore.myshopify.com/collections/summer-dresses', 5400, 45.5, 8, 12, 8, 'active'),
    ('12eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'boho fashion online', 'https://fashionstore.myshopify.com/collections/boho', 3200, 38.2, 15, 18, 12, 'active'),
    ('13eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'affordable wedding guest dresses', 'https://fashionstore.myshopify.com/collections/wedding-guest', 8100, 62.8, 25, 23, 20, 'active'),
    ('14eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'vintage clothing store', 'https://fashionstore.myshopify.com/', 2400, 55.0, 35, 40, 30, 'paused'),
    ('15eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'sustainable fashion brands', 'https://fashionstore.myshopify.com/pages/sustainability', 12500, 72.3, 42, 45, 38, 'active');

-- Keywords for Beauty Products Hub
INSERT INTO keywords (id, website_id, keyword, target_url, search_volume, difficulty, current_position, previous_position, best_position, status)
VALUES 
    ('21eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'organic face cream', 'https://beautyproducts.myshopify.com/products/organic-face-cream', 9800, 58.5, 5, 7, 4, 'active'),
    ('22eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'cruelty free makeup', 'https://beautyproducts.myshopify.com/collections/makeup', 15600, 65.2, 12, 10, 9, 'active'),
    ('23eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'natural skincare routine', 'https://beautyproducts.myshopify.com/blogs/skincare-tips', 22300, 48.9, 18, 22, 15, 'active'),
    ('24eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'vitamin c serum benefits', 'https://beautyproducts.myshopify.com/products/vitamin-c-serum', 18700, 52.1, 28, 30, 25, 'active'),
    ('25eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'anti aging products', 'https://beautyproducts.myshopify.com/collections/anti-aging', 35400, 78.6, 45, 48, 42, 'active');

-- Keywords for Tech Gadgets Store
INSERT INTO keywords (id, website_id, keyword, target_url, search_volume, difficulty, current_position, previous_position, best_position, status)
VALUES 
    ('31eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'wireless earbuds review', 'https://techgadgets.myshopify.com/collections/earbuds', 42300, 68.3, 3, 5, 2, 'active'),
    ('32eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'smart home devices 2024', 'https://techgadgets.myshopify.com/collections/smart-home', 28900, 71.5, 7, 6, 5, 'active'),
    ('33eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'gaming laptop deals', 'https://techgadgets.myshopify.com/collections/gaming-laptops', 67800, 82.4, 14, 16, 11, 'active'),
    ('34eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'budget smartphones 2024', 'https://techgadgets.myshopify.com/collections/smartphones', 54200, 75.8, 22, 25, 19, 'active'),
    ('35eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'portable charger reviews', 'https://techgadgets.myshopify.com/products/power-banks', 19600, 42.7, 9, 8, 7, 'active');

-- Keywords for Home Decor Paradise
INSERT INTO keywords (id, website_id, keyword, target_url, search_volume, difficulty, current_position, previous_position, best_position, status)
VALUES 
    ('41eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'modern wall art', 'https://homedecor.myshopify.com/collections/wall-art', 31200, 54.3, 11, 13, 9, 'active'),
    ('42eebc99-9c0b-4ef8-bb6d-6bb9bd380a47', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'minimalist home decor', 'https://homedecor.myshopify.com/collections/minimalist', 25800, 61.7, 19, 17, 15, 'active'),
    ('43eebc99-9c0b-4ef8-bb6d-6bb9bd380a48', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'indoor plants decor ideas', 'https://homedecor.myshopify.com/blogs/decor-tips/plants', 18900, 38.9, 6, 8, 5, 'active');

-- Keyword history for selected keywords (last 30 days)
-- Fashion Store - "summer dresses 2024"
INSERT INTO keyword_history (keyword_id, position, search_volume, tracked_at)
SELECT 
    '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a31',
    CASE 
        WHEN generate_series::date > NOW() - INTERVAL '7 days' THEN 8
        WHEN generate_series::date > NOW() - INTERVAL '14 days' THEN 10
        WHEN generate_series::date > NOW() - INTERVAL '21 days' THEN 11
        ELSE 12
    END,
    5400,
    generate_series::date
FROM generate_series(NOW() - INTERVAL '30 days', NOW(), INTERVAL '1 day');

-- Beauty Products - "organic face cream"
INSERT INTO keyword_history (keyword_id, position, search_volume, tracked_at)
SELECT 
    '21eebc99-9c0b-4ef8-bb6d-6bb9bd380a36',
    CASE 
        WHEN generate_series::date > NOW() - INTERVAL '5 days' THEN 5
        WHEN generate_series::date > NOW() - INTERVAL '10 days' THEN 6
        WHEN generate_series::date > NOW() - INTERVAL '20 days' THEN 7
        ELSE 8
    END,
    9800,
    generate_series::date
FROM generate_series(NOW() - INTERVAL '30 days', NOW(), INTERVAL '1 day');

-- Tech Gadgets - "wireless earbuds review"
INSERT INTO keyword_history (keyword_id, position, search_volume, tracked_at)
SELECT 
    '31eebc99-9c0b-4ef8-bb6d-6bb9bd380a41',
    CASE 
        WHEN generate_series::date > NOW() - INTERVAL '3 days' THEN 3
        WHEN generate_series::date > NOW() - INTERVAL '10 days' THEN 4
        WHEN generate_series::date > NOW() - INTERVAL '15 days' THEN 5
        ELSE 6
    END,
    42300,
    generate_series::date
FROM generate_series(NOW() - INTERVAL '30 days', NOW(), INTERVAL '1 day');

-- Page speed metrics
-- Fashion Store
INSERT INTO page_speed_metrics (website_id, page_url, performance_score, seo_score, accessibility_score, best_practices_score, 
    first_contentful_paint, speed_index, largest_contentful_paint, time_to_interactive, total_blocking_time, cumulative_layout_shift, measured_at)
VALUES 
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'https://fashionstore.myshopify.com/', 78, 92, 88, 85, 1.2, 2.8, 2.5, 3.2, 180, 0.08, NOW() - INTERVAL '1 day'),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'https://fashionstore.myshopify.com/collections/summer-dresses', 72, 88, 85, 82, 1.5, 3.2, 3.1, 3.8, 220, 0.12, NOW() - INTERVAL '1 day');

-- Beauty Products
INSERT INTO page_speed_metrics (website_id, page_url, performance_score, seo_score, accessibility_score, best_practices_score, 
    first_contentful_paint, speed_index, largest_contentful_paint, time_to_interactive, total_blocking_time, cumulative_layout_shift, measured_at)
VALUES 
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'https://beautyproducts.myshopify.com/', 85, 95, 92, 90, 0.9, 2.1, 1.8, 2.5, 120, 0.05, NOW() - INTERVAL '1 day'),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'https://beautyproducts.myshopify.com/products/organic-face-cream', 81, 93, 90, 88, 1.1, 2.4, 2.2, 2.9, 150, 0.07, NOW() - INTERVAL '1 day');

-- Tech Gadgets
INSERT INTO page_speed_metrics (website_id, page_url, performance_score, seo_score, accessibility_score, best_practices_score, 
    first_contentful_paint, speed_index, largest_contentful_paint, time_to_interactive, total_blocking_time, cumulative_layout_shift, measured_at)
VALUES 
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'https://techgadgets.myshopify.com/', 68, 87, 82, 80, 1.8, 3.8, 3.5, 4.5, 320, 0.15, NOW() - INTERVAL '1 day'),
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'https://techgadgets.myshopify.com/collections/smartphones', 65, 85, 80, 78, 2.1, 4.2, 4.0, 5.2, 380, 0.18, NOW() - INTERVAL '1 day');

-- Competitors
-- Fashion Store competitors
INSERT INTO competitors (website_id, competitor_domain, organic_keywords, organic_traffic, domain_rating, backlinks, last_analyzed_at)
VALUES 
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'competitor-fashion1.com', 15420, 185000, 72, 25800, NOW() - INTERVAL '2 days'),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'competitor-fashion2.com', 22350, 298000, 78, 42100, NOW() - INTERVAL '2 days'),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'competitor-fashion3.com', 8900, 92000, 65, 15600, NOW() - INTERVAL '2 days');

-- Beauty Products competitors
INSERT INTO competitors (website_id, competitor_domain, organic_keywords, organic_traffic, domain_rating, backlinks, last_analyzed_at)
VALUES 
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'competitor-beauty1.com', 28900, 425000, 81, 68900, NOW() - INTERVAL '3 days'),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'competitor-beauty2.com', 19200, 278000, 75, 38500, NOW() - INTERVAL '3 days');

-- Tech Gadgets competitors
INSERT INTO competitors (website_id, competitor_domain, organic_keywords, organic_traffic, domain_rating, backlinks, last_analyzed_at)
VALUES 
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'competitor-tech1.com', 45600, 892000, 85, 125000, NOW() - INTERVAL '1 day'),
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'competitor-tech2.com', 38900, 675000, 82, 98500, NOW() - INTERVAL '1 day'),
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'competitor-tech3.com', 52100, 1250000, 88, 185000, NOW() - INTERVAL '1 day');

-- Settings for users
INSERT INTO settings (user_id, email_notifications, slack_notifications, weekly_report, daily_analysis_time, timezone)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', true, false, true, '09:00:00', 'America/New_York'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', true, true, true, '08:00:00', 'America/Los_Angeles'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', true, true, true, '07:00:00', 'Europe/London');

-- Update slack webhook for one user
UPDATE settings 
SET slack_webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
WHERE user_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

-- Alerts
INSERT INTO alerts (user_id, website_id, alert_name, alert_type, condition_type, condition_value, is_active)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'Keyword Position Drop', 'email', 'greater_than', '{"value": 5, "metric": "position_drop"}', true),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Traffic Spike', 'slack', 'percentage_change', '{"baseline": 1000, "threshold": 50}', true),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Page Speed Alert', 'email', 'less_than', '{"value": 70, "metric": "performance_score"}', true);