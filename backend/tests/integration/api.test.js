const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Website, Keyword } = require('../../src/models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('API Integration Tests', () => {
  let authToken;
  let testUser;
  let testWebsite;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!',
      emailVerified: true
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1d' }
    );

    // Create test website
    testWebsite = await Website.create({
      domain: 'test-website.com',
      userId: testUser.id
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'New User',
            email: 'newuser@example.com',
            password: 'SecurePassword123!'
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe('newuser@example.com');
        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should not register user with duplicate email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Duplicate User',
            email: 'test@example.com',
            password: 'Password123!'
          });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Email already exists');
      });

      it('should validate password requirements', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Weak Password User',
            email: 'weak@example.com',
            password: 'weak'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toContainEqual(
          expect.objectContaining({
            field: 'password'
          })
        );
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe('test@example.com');
      });

      it('should not login with invalid password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123!'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid credentials');
      });

      it('should not login with non-existent email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Password123!'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid credentials');
      });

      it('should rate limit login attempts', async () => {
        const promises = Array(6).fill().map(() =>
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'ratelimit@example.com',
              password: 'wrong'
            })
        );

        const responses = await Promise.all(promises);
        const rateLimited = responses.some(r => r.status === 429);

        expect(rateLimited).toBe(true);
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return current user with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.email).toBe('test@example.com');
        expect(response.body).not.toHaveProperty('password');
      });

      it('should return 401 without token', async () => {
        const response = await request(app)
          .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid token');
      });
    });
  });

  describe('Dashboard Endpoints', () => {
    describe('GET /api/dashboard', () => {
      it('should return dashboard data', async () => {
        const response = await request(app)
          .get('/api/dashboard')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('metrics');
        expect(response.body).toHaveProperty('recentActivity');
        expect(response.body).toHaveProperty('alerts');
      });

      it('should include website-specific data', async () => {
        const response = await request(app)
          .get(`/api/dashboard?websiteId=${testWebsite.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.website.id).toBe(testWebsite.id);
      });
    });
  });

  describe('Keywords Endpoints', () => {
    describe('POST /api/keywords', () => {
      it('should create a new keyword', async () => {
        const response = await request(app)
          .post('/api/keywords')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            keyword: 'test keyword',
            websiteId: testWebsite.id,
            targetUrl: 'https://test-website.com/page',
            country: 'US',
            language: 'en'
          });

        expect(response.status).toBe(201);
        expect(response.body.keyword).toBe('test keyword');
        expect(response.body.websiteId).toBe(testWebsite.id);
      });

      it('should validate keyword data', async () => {
        const response = await request(app)
          .post('/api/keywords')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            keyword: '',
            websiteId: testWebsite.id
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toContainEqual(
          expect.objectContaining({
            field: 'keyword',
            message: expect.stringContaining('required')
          })
        );
      });

      it('should not allow duplicate keywords for same website', async () => {
        await request(app)
          .post('/api/keywords')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            keyword: 'duplicate keyword',
            websiteId: testWebsite.id
          });

        const response = await request(app)
          .post('/api/keywords')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            keyword: 'duplicate keyword',
            websiteId: testWebsite.id
          });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Keyword already exists for this website');
      });
    });

    describe('GET /api/keywords', () => {
      beforeAll(async () => {
        // Create test keywords
        await Keyword.bulkCreate([
          {
            keyword: 'keyword 1',
            websiteId: testWebsite.id,
            currentPosition: 5,
            searchVolume: 1000
          },
          {
            keyword: 'keyword 2',
            websiteId: testWebsite.id,
            currentPosition: 15,
            searchVolume: 500
          }
        ]);
      });

      it('should return keywords for website', async () => {
        const response = await request(app)
          .get(`/api/keywords?websiteId=${testWebsite.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.keywords).toHaveLength(3); // Including the one created in previous test
        expect(response.body.total).toBe(3);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get(`/api/keywords?websiteId=${testWebsite.id}&page=1&limit=2`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.keywords).toHaveLength(2);
        expect(response.body.page).toBe(1);
        expect(response.body.totalPages).toBe(2);
      });

      it('should support sorting', async () => {
        const response = await request(app)
          .get(`/api/keywords?websiteId=${testWebsite.id}&sort=position&order=asc`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.keywords[0].currentPosition).toBeLessThanOrEqual(
          response.body.keywords[1].currentPosition
        );
      });

      it('should support filtering', async () => {
        const response = await request(app)
          .get(`/api/keywords?websiteId=${testWebsite.id}&positionMax=10`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.keywords.forEach(keyword => {
          expect(keyword.currentPosition).toBeLessThanOrEqual(10);
        });
      });
    });

    describe('PUT /api/keywords/:id', () => {
      let testKeyword;

      beforeAll(async () => {
        testKeyword = await Keyword.create({
          keyword: 'update test',
          websiteId: testWebsite.id
        });
      });

      it('should update keyword', async () => {
        const response = await request(app)
          .put(`/api/keywords/${testKeyword.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUrl: 'https://test-website.com/new-page',
            isTracking: false
          });

        expect(response.status).toBe(200);
        expect(response.body.targetUrl).toBe('https://test-website.com/new-page');
        expect(response.body.isTracking).toBe(false);
      });

      it('should not update keyword from another user', async () => {
        const otherUser = await User.create({
          name: 'Other User',
          email: 'other@example.com',
          password: 'Password123!'
        });

        const otherToken = jwt.sign(
          { id: otherUser.id, email: otherUser.email },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1d' }
        );

        const response = await request(app)
          .put(`/api/keywords/${testKeyword.id}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .send({
            targetUrl: 'https://malicious.com'
          });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access denied');
      });
    });

    describe('DELETE /api/keywords/:id', () => {
      let deleteKeyword;

      beforeAll(async () => {
        deleteKeyword = await Keyword.create({
          keyword: 'delete test',
          websiteId: testWebsite.id
        });
      });

      it('should delete keyword', async () => {
        const response = await request(app)
          .delete(`/api/keywords/${deleteKeyword.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const deleted = await Keyword.findByPk(deleteKeyword.id);
        expect(deleted).toBeNull();
      });
    });
  });

  describe('Analytics Endpoints', () => {
    describe('GET /api/analytics/traffic', () => {
      it('should return traffic data', async () => {
        const response = await request(app)
          .get(`/api/analytics/traffic?websiteId=${testWebsite.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('pageViews');
        expect(response.body).toHaveProperty('sessions');
        expect(response.body).toHaveProperty('users');
      });

      it('should support date range filtering', async () => {
        const response = await request(app)
          .get(`/api/analytics/traffic?websiteId=${testWebsite.id}&startDate=2024-01-01&endDate=2024-01-31`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('dateRange');
        expect(response.body.dateRange.start).toBe('2024-01-01');
        expect(response.body.dateRange.end).toBe('2024-01-31');
      });
    });

    describe('GET /api/analytics/realtime/:websiteId', () => {
      it('should return real-time data', async () => {
        const response = await request(app)
          .get(`/api/analytics/realtime/${testWebsite.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('activeUsers');
        expect(response.body).toHaveProperty('pageViews');
        expect(response.body).toHaveProperty('topPages');
      });
    });
  });

  describe('Technical SEO Endpoints', () => {
    describe('GET /api/technical/issues', () => {
      it('should return technical issues', async () => {
        const response = await request(app)
          .get(`/api/technical/issues?websiteId=${testWebsite.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('issues');
        expect(response.body).toHaveProperty('summary');
      });

      it('should filter by severity', async () => {
        const response = await request(app)
          .get(`/api/technical/issues?websiteId=${testWebsite.id}&severity=high`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.issues.forEach(issue => {
          expect(issue.severity).toBe('high');
        });
      });
    });

    describe('POST /api/technical/scan', () => {
      it('should trigger technical scan', async () => {
        const response = await request(app)
          .post('/api/technical/scan')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            websiteId: testWebsite.id,
            fullScan: true
          });

        expect(response.status).toBe(202);
        expect(response.body).toHaveProperty('scanId');
        expect(response.body.status).toBe('queued');
      });
    });
  });

  describe('Export Endpoints', () => {
    describe('POST /api/exports/generate', () => {
      it('should generate export', async () => {
        const response = await request(app)
          .post('/api/exports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            websiteId: testWebsite.id,
            format: 'pdf',
            sections: ['overview', 'keywords', 'technical']
          });

        expect(response.status).toBe(202);
        expect(response.body).toHaveProperty('exportId');
        expect(response.body.status).toBe('processing');
      });

      it('should validate export format', async () => {
        const response = await request(app)
          .post('/api/exports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            websiteId: testWebsite.id,
            format: 'invalid-format'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toContainEqual(
          expect.objectContaining({
            field: 'format',
            message: expect.stringContaining('Invalid format')
          })
        );
      });
    });

    describe('GET /api/exports/history', () => {
      it('should return export history', async () => {
        const response = await request(app)
          .get('/api/exports/history')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Settings Endpoints', () => {
    describe('GET /api/settings', () => {
      it('should return user settings', async () => {
        const response = await request(app)
          .get('/api/settings')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('emailNotifications');
        expect(response.body).toHaveProperty('timezone');
      });
    });

    describe('PUT /api/settings', () => {
      it('should update user settings', async () => {
        const response = await request(app)
          .put('/api/settings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            emailNotifications: false,
            timezone: 'Europe/London',
            alertThreshold: 80
          });

        expect(response.status).toBe(200);
        expect(response.body.emailNotifications).toBe(false);
        expect(response.body.timezone).toBe('Europe/London');
        expect(response.body.alertThreshold).toBe(80);
      });

      it('should validate settings data', async () => {
        const response = await request(app)
          .put('/api/settings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            alertThreshold: 150 // Invalid: should be 0-100
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toContainEqual(
          expect.objectContaining({
            field: 'alertThreshold',
            message: expect.stringContaining('must be between')
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Route not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/keywords')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle database errors gracefully', async () => {
      // Temporarily close database connection
      await sequelize.close();

      const response = await request(app)
        .get('/api/keywords')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body).not.toHaveProperty('stack'); // Should not expose stack in production

      // Reconnect for other tests
      await sequelize.authenticate();
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/keywords')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });
});