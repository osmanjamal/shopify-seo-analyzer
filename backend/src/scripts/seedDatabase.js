const bcrypt = require('bcryptjs');
const { sequelize } = require('../utils/database');
const User = require('../models/User');
const Website = require('../models/Website');
const Keyword = require('../models/Keyword');
const AnalyticsData = require('../models/AnalyticsData');
const TechnicalIssue = require('../models/TechnicalIssue');
const Settings = require('../models/Settings');

// Seed data
const seedUsers = async () => {
  const users = [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'admin@shopifyseo.com',
      password_hash: await bcrypt.hash('Admin123!', 10),
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      email: 'john.doe@example.com',
      password_hash: await bcrypt.hash('User123!', 10),
      full_name: 'John Doe',
      role: 'user',
      is_active: true,
      last_login_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      email: 'sarah.smith@gmail.com',
      google_id: '115625890427936583201',
      full_name: 'Sarah Smith',
      avatar_url: 'https://lh3.googleusercontent.com/a/AATXAJxLmNKKv1R_V-HjQjEkaFB-wOz9VdTqY_Z9=s96-c',
      role: 'user',
      is_active: true,
      last_login_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    }
  ];

  return User.bulkCreate(users, { ignoreDuplicates: true });
};

const seedWebsites = async () => {
  const websites = [
    {
      id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
      user_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      domain: 'fashionstore.myshopify.com',
      name: 'Fashion Store',
      shopify_store_id: 'fashion-store-123',
      shopify_access_token: 'shppa_1234567890abcdef',
      google_site_id: 'sc-domain:fashionstore.myshopify.com',
      google_view_id: 'ga:123456789',
      is_verified: true,
      is_active: true,
      created_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000)
    },
    {
      id: '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      user_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      domain: 'beautyproducts.myshopify.com',
      name: 'Beauty Products Hub',
      shopify_store_id: 'beauty-hub-456',
      shopify_access_token: 'shppa_abcdef1234567890',
      google_site_id: 'sc-domain:beautyproducts.myshopify.com',
      google_view_id: 'ga:987654321',
      is_verified: true,
      is_active: true,
      created_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)
    }
  ];

  return Website.bulkCreate(websites, { ignoreDuplicates: true });
};

const seedKeywords = async () => {
  const keywords = [
    {
      id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a31',
      website_id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
      keyword: 'summer dresses 2024',
      target_url: 'https://fashionstore.myshopify.com/collections/summer-dresses',
      search_volume: 5400,
      difficulty: 45.5,
      current_position: 8,
      previous_position: 12,
      best_position: 8,
      status: 'active'
    },
    {
      id: '12eebc99-9c0b-4ef8-bb6d-6bb9bd380a32',
      website_id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
      keyword: 'boho fashion online',
      target_url: 'https://fashionstore.myshopify.com/collections/boho',
      search_volume: 3200,
      difficulty: 38.2,
      current_position: 15,
      previous_position: 18,
      best_position: 12,
      status: 'active'
    },
    {
      id: '21eebc99-9c0b-4ef8-bb6d-6bb9bd380a36',
      website_id: '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      keyword: 'organic face cream',
      target_url: 'https://beautyproducts.myshopify.com/products/organic-face-cream',
      search_volume: 9800,
      difficulty: 58.5,
      current_position: 5,
      previous_position: 7,
      best_position: 4,
      status: 'active'
    }
  ];

  return Keyword.bulkCreate(keywords, { ignoreDuplicates: true });
};

const seedAnalytics = async () => {
  const analyticsData = [];
  const websites = ['10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'];
  
  // Generate analytics for last 30 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    for (const websiteId of websites) {
      analyticsData.push({
        website_id: websiteId,
        date: date,
        visitors: Math.floor(Math.random() * 500) + 200,
        page_views: Math.floor(Math.random() * 1500) + 600,
        bounce_rate: (Math.random() * 30 + 40).toFixed(2),
        avg_session_duration: Math.floor(Math.random() * 180) + 120,
        organic_traffic: Math.floor(Math.random() * 200) + 100,
        conversion_rate: (Math.random() * 3 + 1.5).toFixed(2),
        revenue: (Math.random() * 5000 + 2000).toFixed(2),
        transactions: Math.floor(Math.random() * 50) + 20
      });
    }
  }

  return AnalyticsData.bulkCreate(analyticsData, { ignoreDuplicates: true });
};

const seedTechnicalIssues = async () => {
  const issues = [
    {
      website_id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
      page_url: 'https://fashionstore.myshopify.com/products/summer-dress',
      issue_type: 'missing_alt_text',
      issue_description: '5 images missing alt text',
      severity: 'medium',
      is_resolved: false,
      first_detected_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      website_id: '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      page_url: 'https://beautyproducts.myshopify.com/',
      issue_type: 'duplicate_description',
      issue_description: 'Same meta description as 3 other pages',
      severity: 'medium',
      is_resolved: false,
      first_detected_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  ];

  return TechnicalIssue.bulkCreate(issues, { ignoreDuplicates: true });
};

const seedSettings = async () => {
  const settings = [
    {
      user_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      email_notifications: true,
      slack_notifications: false,
      weekly_report: true,
      daily_analysis_time: '09:00:00',
      timezone: 'America/New_York'
    },
    {
      user_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      email_notifications: true,
      slack_notifications: true,
      slack_webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      weekly_report: true,
      daily_analysis_time: '08:00:00',
      timezone: 'America/Los_Angeles'
    }
  ];

  return Settings.bulkCreate(settings, { ignoreDuplicates: true });
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models (create tables if they don't exist)
    await sequelize.sync();
    console.log('✅ Database synchronized');

    // Seed data in order
    console.log('📝 Seeding users...');
    await seedUsers();
    console.log('✅ Users seeded');

    console.log('📝 Seeding websites...');
    await seedWebsites();
    console.log('✅ Websites seeded');

    console.log('📝 Seeding keywords...');
    await seedKeywords();
    console.log('✅ Keywords seeded');

    console.log('📝 Seeding analytics...');
    await seedAnalytics();
    console.log('✅ Analytics seeded');

    console.log('📝 Seeding technical issues...');
    await seedTechnicalIssues();
    console.log('✅ Technical issues seeded');

    console.log('📝 Seeding settings...');
    await seedSettings();
    console.log('✅ Settings seeded');

    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;