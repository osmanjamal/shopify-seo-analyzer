const { sequelize } = require('../../src/utils/database');
const {
  User,
  Website,
  Keyword,
  AnalyticsData,
  TechnicalIssue,
  Settings
} = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('Database Models', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User Model', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'user'
      };

      const user = await User.create(userData);

      expect(user.id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    it('should not create a user with duplicate email', async () => {
      const userData = {
        name: 'Duplicate User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'Invalid Email User',
        email: 'invalid-email',
        password: 'Password123!'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce password minimum length', async () => {
      const userData = {
        name: 'Short Password User',
        email: 'short@example.com',
        password: 'short'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should handle Google OAuth user creation', async () => {
      const userData = {
        name: 'Google User',
        email: 'google@example.com',
        googleId: '123456789',
        emailVerified: true
      };

      const user = await User.create(userData);

      expect(user.googleId).toBe(userData.googleId);
      expect(user.emailVerified).toBe(true);
      expect(user.password).toBeNull();
    });

    it('should correctly associate user with websites', async () => {
      const user = await User.create({
        name: 'Website Owner',
        email: 'owner@example.com',
        password: 'Password123!'
      });

      const website = await Website.create({
        domain: 'example.com',
        userId: user.id
      });

      const userWithWebsites = await User.findByPk(user.id, {
        include: [Website]
      });

      expect(userWithWebsites.Websites).toHaveLength(1);
      expect(userWithWebsites.Websites[0].domain).toBe('example.com');
    });
  });

  describe('Website Model', () => {
    let testUser;

    beforeAll(async () => {
      testUser = await User.create({
        name: 'Website Test User',
        email: 'websitetest@example.com',
        password: 'Password123!'
      });
    });

    it('should create a website with valid data', async () => {
      const websiteData = {
        domain: 'testsite.com',
        userId: testUser.id,
        shopifyStoreId: 'test-store-123',
        googleSiteId: 'sc-domain:testsite.com'
      };

      const website = await Website.create(websiteData);

      expect(website.id).toBeDefined();
      expect(website.domain).toBe(websiteData.domain);
      expect(website.isActive).toBe(true);
      expect(website.seoScore).toBe(0);
    });

    it('should validate domain format', async () => {
      const websiteData = {
        domain: 'invalid domain with spaces',
        userId: testUser.id
      };

      await expect(Website.create(websiteData)).rejects.toThrow();
    });

    it('should not allow duplicate domains for same user', async () => {
      const websiteData = {
        domain: 'duplicate.com',
        userId: testUser.id
      };

      await Website.create(websiteData);
      await expect(Website.create(websiteData)).rejects.toThrow();
    });

    it('should cascade delete related data', async () => {
      const website = await Website.create({
        domain: 'cascade-test.com',
        userId: testUser.id
      });

      const keyword = await Keyword.create({
        keyword: 'test keyword',
        websiteId: website.id
      });

      await website.destroy();

      const deletedKeyword = await Keyword.findByPk(keyword.id);
      expect(deletedKeyword).toBeNull();
    });
  });

  describe('Keyword Model', () => {
    let testWebsite;

    beforeAll(async () => {
      const user = await User.create({
        name: 'Keyword Test User',
        email: 'keywordtest@example.com',
        password: 'Password123!'
      });

      testWebsite = await Website.create({
        domain: 'keyword-test.com',
        userId: user.id
      });
    });

    it('should create a keyword with valid data', async () => {
      const keywordData = {
        keyword: 'seo optimization',
        websiteId: testWebsite.id,
        targetUrl: 'https://keyword-test.com/seo',
        country: 'US',
        language: 'en',
        searchVolume: 1000,
        difficulty: 45
      };

      const keyword = await Keyword.create(keywordData);

      expect(keyword.id).toBeDefined();
      expect(keyword.keyword).toBe(keywordData.keyword);
      expect(keyword.isTracking).toBe(true);
      expect(keyword.currentPosition).toBeNull();
    });

    it('should track position history', async () => {
      const keyword = await Keyword.create({
        keyword: 'position tracking',
        websiteId: testWebsite.id
      });

      // Update position
      await keyword.update({
        currentPosition: 5,
        previousPosition: 8,
        bestPosition: 5
      });

      expect(keyword.currentPosition).toBe(5);
      expect(keyword.previousPosition).toBe(8);
      expect(keyword.bestPosition).toBe(5);
      expect(keyword.positionChange).toBe(3); // Virtual field
    });

    it('should handle keyword variations', async () => {
      const mainKeyword = await Keyword.create({
        keyword: 'main keyword',
        websiteId: testWebsite.id
      });

      const variation = await Keyword.create({
        keyword: 'main keyword variation',
        websiteId: testWebsite.id,
        parentKeywordId: mainKeyword.id
      });

      expect(variation.parentKeywordId).toBe(mainKeyword.id);
    });
  });

  describe('AnalyticsData Model', () => {
    let testWebsite;

    beforeAll(async () => {
      const user = await User.create({
        name: 'Analytics Test User',
        email: 'analyticstest@example.com',
        password: 'Password123!'
      });

      testWebsite = await Website.create({
        domain: 'analytics-test.com',
        userId: user.id
      });
    });

    it('should create analytics data entry', async () => {
      const analyticsData = {
        websiteId: testWebsite.id,
        date: new Date(),
        pageViews: 1000,
        uniqueVisitors: 500,
        bounceRate: 45.5,
        avgSessionDuration: 180,
        organicTraffic: 300,
        directTraffic: 200,
        referralTraffic: 150,
        socialTraffic: 50,
        deviceBreakdown: {
          desktop: 60,
          mobile: 35,
          tablet: 5
        },
        topPages: [
          { url: '/', views: 400 },
          { url: '/products', views: 300 }
        ]
      };

      const analytics = await AnalyticsData.create(analyticsData);

      expect(analytics.id).toBeDefined();
      expect(analytics.pageViews).toBe(analyticsData.pageViews);
      expect(analytics.deviceBreakdown).toEqual(analyticsData.deviceBreakdown);
      expect(analytics.topPages).toHaveLength(2);
    });

    it('should calculate derived metrics', async () => {
      const analytics = await AnalyticsData.create({
        websiteId: testWebsite.id,
        date: new Date(),
        pageViews: 1000,
        uniqueVisitors: 400,
        revenue: 5000,
        transactions: 50
      });

      expect(analytics.conversionRate).toBe(12.5); // (50/400) * 100
      expect(analytics.avgOrderValue).toBe(100); // 5000/50
    });

    it('should prevent duplicate entries for same date', async () => {
      const date = new Date('2024-01-01');
      
      await AnalyticsData.create({
        websiteId: testWebsite.id,
        date: date,
        pageViews: 100
      });

      await expect(
        AnalyticsData.create({
          websiteId: testWebsite.id,
          date: date,
          pageViews: 200
        })
      ).rejects.toThrow();
    });
  });

  describe('TechnicalIssue Model', () => {
    let testWebsite;

    beforeAll(async () => {
      const user = await User.create({
        name: 'Technical Test User',
        email: 'technicaltest@example.com',
        password: 'Password123!'
      });

      testWebsite = await Website.create({
        domain: 'technical-test.com',
        userId: user.id
      });
    });

    it('should create technical issue', async () => {
      const issueData = {
        websiteId: testWebsite.id,
        type: 'missing_meta_description',
        severity: 'medium',
        pageUrl: 'https://technical-test.com/page',
        title: 'Missing Meta Description',
        description: 'The page is missing a meta description tag',
        recommendation: 'Add a unique meta description between 150-160 characters'
      };

      const issue = await TechnicalIssue.create(issueData);

      expect(issue.id).toBeDefined();
      expect(issue.status).toBe('open');
      expect(issue.severity).toBe('medium');
    });

    it('should validate severity levels', async () => {
      const issueData = {
        websiteId: testWebsite.id,
        type: 'test',
        severity: 'invalid_severity',
        pageUrl: 'https://test.com'
      };

      await expect(TechnicalIssue.create(issueData)).rejects.toThrow();
    });

    it('should track issue resolution', async () => {
      const issue = await TechnicalIssue.create({
        websiteId: testWebsite.id,
        type: 'broken_link',
        severity: 'high',
        pageUrl: 'https://test.com/broken'
      });

      await issue.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'user@example.com'
      });

      expect(issue.status).toBe('resolved');
      expect(issue.resolvedAt).toBeDefined();
    });
  });

  describe('Settings Model', () => {
    let testUser;

    beforeAll(async () => {
      testUser = await User.create({
        name: 'Settings Test User',
        email: 'settingstest@example.com',
        password: 'Password123!'
      });
    });

    it('should create user settings', async () => {
      const settingsData = {
        userId: testUser.id,
        emailNotifications: true,
        weeklyReport: true,
        alertThreshold: 70,
        timezone: 'America/New_York',
        language: 'en',
        dashboardLayout: {
          widgets: ['metrics', 'keywords', 'traffic']
        }
      };

      const settings = await Settings.create(settingsData);

      expect(settings.userId).toBe(testUser.id);
      expect(settings.emailNotifications).toBe(true);
      expect(settings.dashboardLayout.widgets).toHaveLength(3);
    });

    it('should enforce one settings per user', async () => {
      await expect(
        Settings.create({
          userId: testUser.id,
          emailNotifications: false
        })
      ).rejects.toThrow();
    });

    it('should merge settings updates', async () => {
      const settings = await Settings.findOne({
        where: { userId: testUser.id }
      });

      await settings.update({
        dashboardLayout: {
          widgets: ['metrics', 'keywords'],
          theme: 'dark'
        }
      });

      expect(settings.dashboardLayout.widgets).toHaveLength(2);
      expect(settings.dashboardLayout.theme).toBe('dark');
    });
  });

  describe('Model Associations', () => {
    it('should properly associate all models', async () => {
      const user = await User.create({
        name: 'Association Test',
        email: 'association@example.com',
        password: 'Password123!'
      });

      const website = await Website.create({
        domain: 'association-test.com',
        userId: user.id
      });

      const keyword = await Keyword.create({
        keyword: 'test keyword',
        websiteId: website.id
      });

      // Test eager loading
      const fullData = await User.findByPk(user.id, {
        include: [
          {
            model: Website,
            include: [Keyword]
          }
        ]
      });

      expect(fullData.Websites).toHaveLength(1);
      expect(fullData.Websites[0].Keywords).toHaveLength(1);
      expect(fullData.Websites[0].Keywords[0].keyword).toBe('test keyword');
    });
  });

  describe('Model Hooks', () => {
    it('should hash password before create', async () => {
      const plainPassword = 'TestPassword123!';
      const user = await User.create({
        name: 'Hook Test',
        email: 'hooktest@example.com',
        password: plainPassword
      });

      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash pattern
    });

    it('should update lastAnalyzedAt on website update', async () => {
      const user = await User.create({
        name: 'Update Test',
        email: 'updatetest@example.com',
        password: 'Password123!'
      });

      const website = await Website.create({
        domain: 'update-test.com',
        userId: user.id
      });

      const originalDate = website.lastAnalyzedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await website.update({ seoScore: 85 });

      expect(website.lastAnalyzedAt).not.toEqual(originalDate);
    });
  });
});