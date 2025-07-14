-- Seed data for users table
-- Test users with different roles and authentication methods

-- Admin user with password
INSERT INTO users (
    id,
    email,
    password_hash,
    full_name,
    role,
    is_active,
    created_at
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@shopifyseo.com',
    '$2a$10$YourHashedPasswordHere', -- Password: Admin123!
    'Admin User',
    'admin',
    true,
    NOW() - INTERVAL '30 days'
);

-- Regular user with password
INSERT INTO users (
    id,
    email,
    password_hash,
    full_name,
    role,
    is_active,
    last_login_at,
    created_at
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'john.doe@example.com',
    '$2a$10$YourHashedPasswordHere', -- Password: User123!
    'John Doe',
    'user',
    true,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '25 days'
);

-- User with Google OAuth
INSERT INTO users (
    id,
    email,
    google_id,
    full_name,
    avatar_url,
    role,
    is_active,
    last_login_at,
    created_at
) VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'sarah.smith@gmail.com',
    '115625890427936583201',
    'Sarah Smith',
    'https://lh3.googleusercontent.com/a/AATXAJxLmNKKv1R_V-HjQjEkaFB-wOz9VdTqY_Z9=s96-c',
    'user',
    true,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '20 days'
);

-- Viewer role user
INSERT INTO users (
    id,
    email,
    password_hash,
    full_name,
    role,
    is_active,
    created_at
) VALUES (
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    'viewer@example.com',
    '$2a$10$YourHashedPasswordHere', -- Password: Viewer123!
    'Viewer Account',
    'viewer',
    true,
    NOW() - INTERVAL '15 days'
);

-- Inactive user
INSERT INTO users (
    id,
    email,
    password_hash,
    full_name,
    role,
    is_active,
    created_at
) VALUES (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    'inactive@example.com',
    '$2a$10$YourHashedPasswordHere', -- Password: Inactive123!
    'Inactive User',
    'user',
    false,
    NOW() - INTERVAL '60 days'
);

-- Premium user with multiple sites
INSERT INTO users (
    id,
    email,
    password_hash,
    google_id,
    full_name,
    avatar_url,
    role,
    is_active,
    last_login_at,
    created_at
) VALUES (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    'premium@shopify.com',
    '$2a$10$YourHashedPasswordHere', -- Password: Premium123!
    '115625890427936583202',
    'Premium User',
    'https://lh3.googleusercontent.com/a/AATXAJxLmNKKv1R_V-HjQjEkaFB-wOz9VdTqY_Z10=s96-c',
    'user',
    true,
    NOW(),
    NOW() - INTERVAL '90 days'
);