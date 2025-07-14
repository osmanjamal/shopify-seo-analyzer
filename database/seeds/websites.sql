-- Seed data for websites table
-- Test websites with various configurations

-- Website for John Doe (Fashion Store)
INSERT INTO websites (
    id,
    user_id,
    domain,
    name,
    shopify_store_id,
    shopify_access_token,
    google_site_id,
    google_view_id,
    is_verified,
    is_active,
    created_at
) VALUES (
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'fashionstore.myshopify.com',
    'Fashion Store',
    'fashion-store-123',
    'shppa_1234567890abcdef',
    'sc-domain:fashionstore.myshopify.com',
    'ga:123456789',
    true,
    true,
    NOW() - INTERVAL '24 days'
);

-- Website for Sarah Smith (Beauty Products)
INSERT INTO websites (
    id,
    user_id,
    domain,
    name,
    shopify_store_id,
    shopify_access_token,
    google_site_id,
    google_view_id,
    is_verified,
    is_active,
    created_at
) VALUES (
    '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'beautyproducts.myshopify.com',
    'Beauty Products Hub',
    'beauty-hub-456',
    'shppa_abcdef1234567890',
    'sc-domain:beautyproducts.myshopify.com',
    'ga:987654321',
    true,
    true,
    NOW() - INTERVAL '19 days'
);

-- Website for Premium User (Electronics)
INSERT INTO websites (
    id,
    user_id,
    domain,
    name,
    shopify_store_id,
    shopify_access_token,
    google_site_id,
    google_view_id,
    is_verified,
    is_active,
    created_at
) VALUES (
    '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    'techgadgets.myshopify.com',
    'Tech Gadgets Store',
    'tech-gadgets-789',
    'shppa_xyz1234567890abc',
    'sc-domain:techgadgets.myshopify.com',
    'ga:456789123',
    true,
    true,
    NOW() - INTERVAL '85 days'
);

-- Second website for Premium User (Home Decor)
INSERT INTO websites (
    id,
    user_id,
    domain,
    name,
    shopify_store_id,
    shopify_access_token,
    google_site_id,
    google_view_id,
    is_verified,
    is_active,
    created_at
) VALUES (
    '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    'homedecor.myshopify.com',
    'Home Decor Paradise',
    'home-decor-101',
    'shppa_9876543210fedcba',
    'sc-domain:homedecor.myshopify.com',
    'ga:789123456',
    true,
    true,
    NOW() - INTERVAL '60 days'
);

-- Unverified website
INSERT INTO websites (
    id,
    user_id,
    domain,
    name,
    shopify_store_id,
    is_verified,
    is_active,
    created_at
) VALUES (
    '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a25',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'newstore.myshopify.com',
    'New Store (Unverified)',
    'new-store-202',
    false,
    true,
    NOW() - INTERVAL '3 days'
);

-- Inactive website
INSERT INTO websites (
    id,
    user_id,
    domain,
    name,
    shopify_store_id,
    shopify_access_token,
    google_site_id,
    is_verified,
    is_active,
    created_at,
    updated_at
) VALUES (
    '60eebc99-9c0b-4ef8-bb6d-6bb9bd380a26',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'oldstore.myshopify.com',
    'Old Store (Inactive)',
    'old-store-303',
    'shppa_oldtoken1234567890',
    'sc-domain:oldstore.myshopify.com',
    true,
    false,
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '30 days'
);

-- Analytics data for websites
-- Fashion Store - Last 30 days
INSERT INTO analytics_data (website_id, date, visitors, page_views, bounce_rate, avg_session_duration, organic_traffic, conversion_rate, revenue, transactions)
SELECT 
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    generate_series::date,
    (RANDOM() * 500 + 200)::int,
    (RANDOM() * 1500 + 600)::int,
    (RANDOM() * 30 + 40)::numeric(5,2),
    (RANDOM() * 180 + 120)::int,
    (RANDOM() * 200 + 100)::int,
    (RANDOM() * 3 + 1.5)::numeric(5,2),
    (RANDOM() * 5000 + 2000)::numeric(12,2),
    (RANDOM() * 50 + 20)::int
FROM generate_series(NOW() - INTERVAL '30 days', NOW(), INTERVAL '1 day');

-- Beauty Products Hub - Last 30 days
INSERT INTO analytics_data (website_id, date, visitors, page_views, bounce_rate, avg_session_duration, organic_traffic, conversion_rate, revenue, transactions)
SELECT 
    '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    generate_series::date,
    (RANDOM() * 800 + 300)::int,
    (RANDOM() * 2500 + 1000)::int,
    (RANDOM() * 25 + 35)::numeric(5,2),
    (RANDOM() * 240 + 150)::int,
    (RANDOM() * 400 + 150)::int,
    (RANDOM() * 4 + 2)::numeric(5,2),
    (RANDOM() * 8000 + 3000)::numeric(12,2),
    (RANDOM() * 80 + 30)::int
FROM generate_series(NOW() - INTERVAL '30 days', NOW(), INTERVAL '1 day');

-- Tech Gadgets Store - Last 30 days
INSERT INTO analytics_data (website_id, date, visitors, page_views, bounce_rate, avg_session_duration, organic_traffic, conversion_rate, revenue, transactions)
SELECT 
    '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    generate_series::date,
    (RANDOM() * 1200 + 500)::int,
    (RANDOM() * 4000 + 1500)::int,
    (RANDOM() * 20 + 30)::numeric(5,2),
    (RANDOM() * 300 + 180)::int,
    (RANDOM() * 600 + 250)::int,
    (RANDOM() * 5 + 2.5)::numeric(5,2),
    (RANDOM() * 15000 + 5000)::numeric(12,2),
    (RANDOM() * 100 + 40)::int
FROM generate_series(NOW() - INTERVAL '30 days', NOW(), INTERVAL '1 day');

-- Technical issues for websites
-- Fashion Store issues
INSERT INTO technical_issues (website_id, page_url, issue_type, issue_description, severity, is_resolved, first_detected_at, last_detected_at)
VALUES 
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'https://fashionstore.myshopify.com/products/summer-dress', 'missing_alt_text', '5 images missing alt text', 'medium', false, NOW() - INTERVAL '10 days', NOW()),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'https://fashionstore.myshopify.com/collections/new-arrivals', 'title_too_long', 'Title is 75 characters (recommended: 60)', 'low', false, NOW() - INTERVAL '7 days', NOW()),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'https://fashionstore.myshopify.com/pages/about', 'slow_page_speed', 'Page load time: 4.5s (should be under 3s)', 'high', true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days');

-- Beauty Products issues
INSERT INTO technical_issues (website_id, page_url, issue_type, issue_description, severity, is_resolved, first_detected_at, last_detected_at)
VALUES 
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'https://beautyproducts.myshopify.com/', 'duplicate_description', 'Same meta description as 3 other pages', 'medium', false, NOW() - INTERVAL '5 days', NOW()),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'https://beautyproducts.myshopify.com/products/face-cream', 'structured_data_error', 'Product schema missing required fields', 'high', false, NOW() - INTERVAL '3 days', NOW());

-- Tech Gadgets issues
INSERT INTO technical_issues (website_id, page_url, issue_type, issue_description, severity, is_resolved, first_detected_at, last_detected_at)
VALUES 
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'https://techgadgets.myshopify.com/collections/smartphones', 'mobile_usability', 'Text too small on mobile devices', 'critical', false, NOW() - INTERVAL '2 days', NOW()),
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'https://techgadgets.myshopify.com/pages/warranty', 'broken_link', '404 error on internal link', 'high', false, NOW() - INTERVAL '1 day', NOW());