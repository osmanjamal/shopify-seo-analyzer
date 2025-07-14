const bcrypt = require('bcryptjs');

// Sample Users
const users = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: bcrypt.hashSync('Password123!', 10),
    role: 'admin',
    emailVerified: true,
    googleId: null,
    subscription: 'professional',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: bcrypt.hashSync('SecurePass456!', 10),
    role: 'user',
    emailVerified: true,
    googleId: '1234567890',
    subscription: 'starter',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    password: bcrypt.hashSync('TestPass789!', 10),
    role: 'user',
    emailVerified: false,
    googleId: null,
    subscription: 'free',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  }
];

// Sample Websites
const websites = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    domain: 'example-store.com',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    shopifyStoreId: 'example-store.myshopify.com',
    googleSiteId: 'sc-domain:example-store.com',
    isActive: true,
    seoScore: 85,
    lastAnalyzedAt: new Date('2024-01-20'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    domain: 'fashion-boutique.com',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    shopifyStoreId: 'fashion-boutique.myshopify.com',
    googleSiteId: 'sc-domain:fashion-boutique.com',
    isActive: true,
    seoScore: 72,
    lastAnalyzedAt: new Date('2024-01-19'),
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    domain: 'tech-gadgets.shop',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    shopifyStoreId: null,
    googleSiteId: null,
    isActive: false,
    seoScore: 0,
    lastAnalyzedAt: null,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  }
];

// Sample Keywords
const keywords = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    keyword: 'organic skincare products',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    targetUrl: 'https://example-store.com/collections/skincare',
    country: 'US',
    language: 'en',
    searchVolume: 5400,
    difficulty: 65,
    currentPosition: 8,
    previousPosition: 12,
    bestPosition: 5,
    firstSeenAt: new Date('2024-01-05'),
    isTracking: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    keyword: 'natural face cream',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    targetUrl: 'https://example-store.com/products/face-cream',
    country: 'US',
    language: 'en',
    searchVolume: 2900,
    difficulty: 45,
    currentPosition: 15,
    previousPosition: 18,
    bestPosition: 10,
    firstSeenAt: new Date('2024-01-05'),
    isTracking: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440003',
    keyword: 'sustainable fashion brands',
    websiteId: '660e8400-e29b-41d4-a716-446655440002',
    targetUrl: 'https://fashion-boutique.com',
    country: 'US',
    language: 'en',
    searchVolume: 8100,
    difficulty: 78,
    currentPosition: 25,
    previousPosition: 30,
    bestPosition: 22,
    firstSeenAt: new Date('2024-01-06'),
    isTracking: true,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440004',
    keyword: 'eco friendly clothing',
    websiteId: '660e8400-e29b-41d4-a716-446655440002',
    targetUrl: 'https://fashion-boutique.com/collections/eco-friendly',
    country: 'US',
    language: 'en',
    searchVolume: 6600,
    difficulty: 70,
    currentPosition: null,
    previousPosition: 45,
    bestPosition: 35,
    firstSeenAt: new Date('2024-01-06'),
    isTracking: true,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-19')
  }
];

// Sample Analytics Data
const analyticsData = [
  {
    id: '880e8400-e29b-41d4-a716-446655440001',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    date: new Date('2024-01-20'),
    pageViews: 5432,
    uniqueVisitors: 2145,
    bounceRate: 42.5,
    avgSessionDuration: 245,
    organicTraffic: 1287,
    directTraffic: 543,
    referralTraffic: 215,
    socialTraffic: 100,
    revenue: 3456.78,
    transactions: 28,
    conversionRate: 1.31,
    deviceBreakdown: {
      desktop: 60,
      mobile: 35,
      tablet: 5
    },
    topPages: [
      { url: '/', views: 1543, avgTime: 45 },
      { url: '/collections/skincare', views: 987, avgTime: 120 },
      { url: '/products/face-cream', views: 654, avgTime: 180 }
    ],
    trafficSources: [
      { source: 'google', medium: 'organic', sessions: 1287 },
      { source: 'direct', medium: 'none', sessions: 543 },
      { source: 'facebook.com', medium: 'referral', sessions: 215 }
    ],
    createdAt: new Date('2024-01-21'),
    updatedAt: new Date('2024-01-21')
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440002',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    date: new Date('2024-01-19'),
    pageViews: 4987,
    uniqueVisitors: 1987,
    bounceRate: 45.2,
    avgSessionDuration: 230,
    organicTraffic: 1150,
    directTraffic: 498,
    referralTraffic: 189,
    socialTraffic: 150,
    revenue: 2987.45,
    transactions: 22,
    conversionRate: 1.11,
    deviceBreakdown: {
      desktop: 58,
      mobile: 37,
      tablet: 5
    },
    topPages: [
      { url: '/', views: 1398, avgTime: 42 },
      { url: '/collections/skincare', views: 876, avgTime: 115 },
      { url: '/products/serum', views: 543, avgTime: 165 }
    ],
    trafficSources: [
      { source: 'google', medium: 'organic', sessions: 1150 },
      { source: 'direct', medium: 'none', sessions: 498 },
      { source: 'instagram.com', medium: 'social', sessions: 150 }
    ],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  }
];

// Sample Technical Issues
const technicalIssues = [
  {
    id: '990e8400-e29b-41d4-a716-446655440001',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    type: 'missing_meta_description',
    severity: 'medium',
    status: 'open',
    pageUrl: 'https://example-store.com/products/new-arrivals',
    title: 'Missing Meta Description',
    description: 'This page is missing a meta description tag, which is important for SEO.',
    recommendation: 'Add a unique meta description between 150-160 characters that includes relevant keywords.',
    impact: 'Medium impact on search visibility and click-through rates.',
    firstDetectedAt: new Date('2024-01-15'),
    lastCheckedAt: new Date('2024-01-20'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440002',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    type: 'slow_page_speed',
    severity: 'high',
    status: 'open',
    pageUrl: 'https://example-store.com/collections/all',
    title: 'Slow Page Load Speed',
    description: 'Page takes 5.2 seconds to load, which is above the recommended 3-second threshold.',
    recommendation: 'Optimize images, minify CSS/JS, enable caching, and consider using a CDN.',
    impact: 'High impact on user experience and search rankings.',
    additionalData: {
      loadTime: 5.2,
      firstContentfulPaint: 2.1,
      largestContentfulPaint: 4.8
    },
    firstDetectedAt: new Date('2024-01-18'),
    lastCheckedAt: new Date('2024-01-20'),
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440003',
    websiteId: '660e8400-e29b-41d4-a716-446655440002',
    type: 'duplicate_title',
    severity: 'medium',
    status: 'resolved',
    pageUrl: 'https://fashion-boutique.com/products/summer-dress',
    title: 'Duplicate Title Tag',
    description: 'Multiple pages have the same title tag, causing confusion for search engines.',
    recommendation: 'Create unique, descriptive title tags for each page.',
    impact: 'Medium impact on search rankings and user experience.',
    resolvedAt: new Date('2024-01-19'),
    resolvedBy: 'jane.smith@example.com',
    firstDetectedAt: new Date('2024-01-10'),
    lastCheckedAt: new Date('2024-01-19'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-19')
  }
];

// Sample Settings
const settings = [
  {
    id: 'aa0e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    emailNotifications: true,
    slackNotifications: false,
    weeklyReport: true,
    monthlyReport: false,
    alertThreshold: 70,
    timezone: 'America/New_York',
    language: 'en',
    dashboardLayout: {
      widgets: ['metrics', 'keywords', 'traffic', 'technical'],
      theme: 'light'
    },
    notificationPreferences: {
      keywordChanges: true,
      technicalIssues: true,
      trafficAlerts: true,
      competitorUpdates: false
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'aa0e8400-e29b-41d4-a716-446655440002',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    emailNotifications: true,
    slackNotifications: true,
    weeklyReport: false,
    monthlyReport: true,
    alertThreshold: 80,
    timezone: 'Europe/London',
    language: 'en',
    dashboardLayout: {
      widgets: ['metrics', 'analytics', 'keywords'],
      theme: 'dark'
    },
    notificationPreferences: {
      keywordChanges: true,
      technicalIssues: false,
      trafficAlerts: true,
      competitorUpdates: true
    },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  }
];

// Sample Competitor Websites
const competitorWebsites = [
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440001',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    domain: 'competitor-skincare.com',
    isActive: true,
    lastAnalyzedAt: new Date('2024-01-19'),
    metrics: {
      estimatedTraffic: 15000,
      domainAuthority: 45,
      backlinks: 1250,
      keywords: 850
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440002',
    websiteId: '660e8400-e29b-41d4-a716-446655440002',
    domain: 'rival-fashion.com',
    isActive: true,
    lastAnalyzedAt: new Date('2024-01-18'),
    metrics: {
      estimatedTraffic: 25000,
      domainAuthority: 52,
      backlinks: 2100,
      keywords: 1200
    },
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-18')
  }
];

// Sample Alerts
const alerts = [
  {
    id: 'cc0e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    websiteId: '660e8400-e29b-41d4-a716-446655440001',
    type: 'keyword_drop',
    severity: 'medium',
    status: 'active',
    title: 'Keyword Position Drop',
    message: 'The keyword "organic skincare products" dropped from position 5 to 8',
    data: {
      keyword: 'organic skincare products',
      previousPosition: 5,
      currentPosition: 8,
      change: -3
    },
    createdAt: new Date('2024-01-20T10:30:00'),
    updatedAt: new Date('2024-01-20T10:30:00')
  },
  {
    id: 'cc0e8400-e29b-41d4-a716-446655440002',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    websiteId: '660e8400-e29b-41d4-a716-446655440002',
    type: 'traffic_spike',
    severity: 'low',
    status: 'acknowledged',
    title: 'Traffic Spike Detected',
    message: 'Traffic increased by 35% compared to last week',
    data: {
      previousTraffic: 1450,
      currentTraffic: 1957,
      changePercent: 35
    },
    acknowledgedAt: new Date('2024-01-19T14:00:00'),
    createdAt: new Date('2024-01-19T12:00:00'),
    updatedAt: new Date('2024-01-19T14:00:00')
  }
];

// Helper functions for tests
const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    role: 'user',
    emailVerified: false
  };

  return { ...defaultUser, ...overrides };
};

const createTestWebsite = async (userId, overrides = {}) => {
  const defaultWebsite = {
    domain: `test-site-${Date.now()}.com`,
    userId: userId,
    isActive: true,
    seoScore: 0
  };

  return { ...defaultWebsite, ...overrides };
};

const createTestKeyword = async (websiteId, overrides = {}) => {
  const defaultKeyword = {
    keyword: `test keyword ${Date.now()}`,
    websiteId: websiteId,
    country: 'US',
    language: 'en',
    isTracking: true
  };

  return { ...defaultKeyword, ...overrides };
};

// Mock data generators
const generateMockAnalyticsData = (websiteId, days = 30) => {
  const data = [];
  const baseDate = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);

    data.push({
      websiteId,
      date,
      pageViews: Math.floor(Math.random() * 5000) + 1000,
      uniqueVisitors: Math.floor(Math.random() * 2000) + 500,
      bounceRate: Math.random() * 30 + 30,
      avgSessionDuration: Math.floor(Math.random() * 180) + 60,
      organicTraffic: Math.floor(Math.random() * 1500) + 300,
      directTraffic: Math.floor(Math.random() * 500) + 100,
      referralTraffic: Math.floor(Math.random() * 300) + 50,
      socialTraffic: Math.floor(Math.random() * 200) + 20,
      revenue: Math.random() * 5000 + 500,
      transactions: Math.floor(Math.random() * 50) + 5,
      deviceBreakdown: {
        desktop: 55 + Math.floor(Math.random() * 10),
        mobile: 35 + Math.floor(Math.random() * 10),
        tablet: 5 + Math.floor(Math.random() * 5)
      }
    });
  }

  return data;
};

const generateMockKeywordData = (count = 50) => {
  const keywords = [
    'seo tools', 'keyword research', 'backlink analysis', 'content optimization',
    'technical seo', 'local seo', 'mobile optimization', 'site speed',
    'schema markup', 'meta tags', 'title optimization', 'alt text',
    'internal linking', 'external links', 'domain authority', 'page rank'
  ];

  const data = [];

  for (let i = 0; i < count; i++) {
    const baseKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const modifier = ['best', 'top', 'free', 'professional', 'advanced'][Math.floor(Math.random() * 5)];
    
    data.push({
      keyword: `${modifier} ${baseKeyword}`,
      searchVolume: Math.floor(Math.random() * 10000) + 100,
      difficulty: Math.floor(Math.random() * 100),
      currentPosition: Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 1 : null,
      cpc: Math.random() * 5 + 0.5
    });
  }

  return data;
};

module.exports = {
  users,
  websites,
  keywords,
  analyticsData,
  technicalIssues,
  settings,
  competitorWebsites,
  alerts,
  createTestUser,
  createTestWebsite,
  createTestKeyword,
  generateMockAnalyticsData,
  generateMockKeywordData
};