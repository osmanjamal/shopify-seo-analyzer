const { sequelize, Sequelize } = require('../../src/utils/database');
const {
  User,
  Website,
  Keyword,
  AnalyticsData,
  TechnicalIssue,
  Settings,
  CompetitorWebsite,
  Alert,
  Export,
  ApiKey
} = require('../../src/models');

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Test database connection
    await sequelize.authenticate();
    
    // Sync database with force to ensure clean state
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      const result = await sequelize.query('SELECT 1 + 1 as result', {
        type: Sequelize.QueryTypes.SELECT
      });

      expect(result[0].result).toBe(2);
    });

    it('should handle connection pool', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        sequelize.query(`SELECT ${i} as num`, {
          type: Sequelize.QueryTypes.SELECT
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });
  });

  describe('Transactions', () => {
    it('should handle transactions correctly', async () => {
      const t = await sequelize.transaction();

      try {
        const user = await User.create({
          name: 'Transaction Test',
          email: 'transaction@test.com',
          password: 'Password123!'
        }, { transaction: t });

        const website = await Website.create({
          domain: 'transaction-test.com',
          userId: user.id
        }, { transaction: t });

        await t.commit();

        // Verify data was saved
        const savedUser = await User.findByPk(user.id);
        const savedWebsite = await Website.findByPk(website.id);

        expect(savedUser).toBeTruthy();
        expect(savedWebsite).toBeTruthy();
      } catch (error) {
        await t.rollback();
        throw error;
      }
    });

    it('should rollback on error', async () => {
      const t = await sequelize.transaction();

      try {
        await User.create({
          name: 'Rollback Test',
          email: 'rollback@test.com',
          password: 'Password123!'
        }, { transaction: t });

        // Force an error
        await Website.create({
          domain: null, // This should cause an error
          userId: 'invalid-id'
        }, { transaction: t });

        await t.commit();
      } catch (error) {
        await t.rollback();
      }

      // Verify rollback worked
      const user = await User.findOne({
        where: { email: 'rollback@test.com' }
      });

      expect(user).toBeNull();
    });
  });

  describe('Complex Queries', () => {
    let testData;

    beforeAll(async () => {
      // Create test data
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: 'Password123!'
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: 'Password123!'
      });

      const website1 = await Website.create({
        domain: 'site1.com',
        userId: user1.id,
        seoScore: 85
      });

      const website2 = await Website.create({
        domain: 'site2.com',
        userId: user1.id,
        seoScore: 65
      });

      const website3 = await Website.create({
        domain: 'site3.com',
        userId: user2.id,
        seoScore: 90
      });

      // Create keywords
      await Keyword.bulkCreate([
        { keyword: 'keyword1', websiteId: website1.id, currentPosition: 5, searchVolume: 1000 },
        { keyword: 'keyword2', websiteId: website1.id, currentPosition: 15, searchVolume: 500 },
        { keyword: 'keyword3', websiteId: website2.id, currentPosition: 3, searchVolume: 2000 },
        { keyword: 'keyword4', websiteId: website3.id, currentPosition: 8, searchVolume: 1500 }
      ]);

      testData = { user1, user2, website1, website2, website3 };
    });

    it('should perform joins correctly', async () => {
      const result = await User.findAll({
        include: [{
          model: Website,
          include: [Keyword]
        }],
        order: [
          ['email', 'ASC'],
          [Website, 'domain', 'ASC'],
          [Website, Keyword, 'keyword', 'ASC']
        ]
      });

      expect(result).toHaveLength(2);
      expect(result[0].Websites).toHaveLength(2);
      expect(result[0].Websites[0].Keywords).toHaveLength(2);
    });

    it('should handle aggregations', async () => {
      const result = await Website.findAll({
        attributes: [
          'userId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'websiteCount'],
          [sequelize.fn('AVG', sequelize.col('seoScore')), 'avgScore']
        ],
        group: ['userId'],
        raw: true
      });

      expect(result).toHaveLength(2);
      expect(result[0].websiteCount).toBe('2');
      expect(parseFloat(result[0].avgScore)).toBe(75);
    });

    it('should handle subqueries', async () => {
      const topKeywords = await Keyword.findAll({
        where: {
          searchVolume: {
            [Sequelize.Op.gt]: sequelize.literal(
              '(SELECT AVG(search_volume) FROM keywords)'
            )
          }
        }
      });

      expect(topKeywords).toHaveLength(2);
      topKeywords.forEach(keyword => {
        expect(keyword.searchVolume).toBeGreaterThan(1000);
      });
    });

    it('should handle complex WHERE conditions', async () => {
      const results = await Website.findAll({
        where: {
          [Sequelize.Op.or]: [
            {
              seoScore: {
                [Sequelize.Op.gte]: 85
              }
            },
            {
              [Sequelize.Op.and]: [
                {
                  domain: {
                    [Sequelize.Op.like]: '%2%'
                  }
                },
                {
                  userId: testData.user1.id
                }
              ]
            }
          ]
        }
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk create', async () => {
      const user = await User.create({
        name: 'Bulk Test',
        email: 'bulk@test.com',
        password: 'Password123!'
      });

      const website = await Website.create({
        domain: 'bulk-test.com',
        userId: user.id
      });

      const keywords = await Keyword.bulkCreate(
        Array(100).fill(null).map((_, i) => ({
          keyword: `bulk keyword ${i}`,
          websiteId: website.id,
          searchVolume: Math.floor(Math.random() * 5000)
        }))
      );

      expect(keywords).toHaveLength(100);

      const count = await Keyword.count({
        where: { websiteId: website.id }
      });

      expect(count).toBe(100);
    });

    it('should handle bulk update', async () => {
      const website = await Website.findOne({
        where: { domain: 'bulk-test.com' }
      });

      const result = await Keyword.update(
        { isTracking: false },
        {
          where: {
            websiteId: website.id,
            searchVolume: {
              [Sequelize.Op.lt]: 1000
            }
          }
        }
      );

      expect(result[0]).toBeGreaterThan(0);

      const updated = await Keyword.count({
        where: {
          websiteId: website.id,
          isTracking: false
        }
      });

      expect(updated).toBeGreaterThan(0);
    });

    it('should handle bulk delete', async () => {
      const website = await Website.findOne({
        where: { domain: 'bulk-test.com' }
      });

      const result = await Keyword.destroy({
        where: {
          websiteId: website.id,
          isTracking: false
        }
      });

      expect(result).toBeGreaterThan(0);

      const remaining = await Keyword.count({
        where: { websiteId: website.id }
      });

      expect(remaining).toBeLessThan(100);
    });
  });

  describe('Database Indexes', () => {
    it('should use indexes for common queries', async () => {
      // Create more test data
      const user = await User.create({
        name: 'Index Test',
        email: 'index@test.com',
        password: 'Password123!'
      });

      const website = await Website.create({
        domain: 'index-test.com',
        userId: user.id
      });

      // Create many keywords
      await Keyword.bulkCreate(
        Array(1000).fill(null).map((_, i) => ({
          keyword: `index test ${i}`,
          websiteId: website.id,
          currentPosition: Math.floor(Math.random() * 100),
          searchVolume: Math.floor(Math.random() * 10000)
        }))
      );

      // Test indexed queries
      const start = Date.now();

      // This should use the websiteId index
      const keywords = await Keyword.findAll({
        where: { websiteId: website.id },
        limit: 10
      });

      const duration = Date.now() - start;

      expect(keywords).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be fast with index
    });
  });

  describe('Database Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      await expect(
        Website.create({
          domain: 'orphan-test.com',
          userId: 99999 // Non-existent user
        })
      ).rejects.toThrow();
    });

    it('should enforce unique constraints', async () => {
      const user = await User.create({
        name: 'Unique Test',
        email: 'unique@test.com',
        password: 'Password123!'
      });

      await expect(
        User.create({
          name: 'Duplicate Email',
          email: 'unique@test.com',
          password: 'Password123!'
        })
      ).rejects.toThrow();
    });

    it('should enforce check constraints', async () => {
      const user = await User.create({
        name: 'Check Test',
        email: 'check@test.com',
        password: 'Password123!'
      });

      const website = await Website.create({
        domain: 'check-test.com',
        userId: user.id
      });

      await expect(
        website.update({ seoScore: 150 }) // Should be 0-100
      ).rejects.toThrow();
    });
  });

  describe('Database Migrations', () => {
    it('should have all required tables', async () => {
      const [tables] = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
        { type: Sequelize.QueryTypes.SELECT }
      );

      const tableNames = tables.map(t => t.table_name);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('websites');
      expect(tableNames).toContain('keywords');
      expect(tableNames).toContain('analytics_data');
      expect(tableNames).toContain('technical_issues');
      expect(tableNames).toContain('settings');
    });

    it('should have all required columns', async () => {
      const [columns] = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
        { type: Sequelize.QueryTypes.SELECT }
      );

      const columnNames = columns.map(c => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });
  });

  describe('Database Performance', () => {
    it('should handle concurrent operations', async () => {
      const operations = Array(50).fill(null).map(async (_, i) => {
        const user = await User.create({
          name: `Concurrent User ${i}`,
          email: `concurrent${i}@test.com`,
          password: 'Password123!'
        });

        const website = await Website.create({
          domain: `concurrent${i}.com`,
          userId: user.id
        });

        return { user, website };
      });

      const results = await Promise.all(operations);
      expect(results).toHaveLength(50);
    });

    it('should optimize N+1 queries', async () => {
      // Bad approach (N+1 problem)
      const start1 = Date.now();
      const users1 = await User.findAll({ limit: 10 });
      for (const user of users1) {
        await user.getWebsites();
      }
      const duration1 = Date.now() - start1;

      // Good approach (eager loading)
      const start2 = Date.now();
      const users2 = await User.findAll({
        limit: 10,
        include: [Website]
      });
      const duration2 = Date.now() - start2;

      // Eager loading should be faster
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity on cascade delete', async () => {
      const user = await User.create({
        name: 'Cascade Test',
        email: 'cascade@test.com',
        password: 'Password123!'
      });

      const website = await Website.create({
        domain: 'cascade-test.com',
        userId: user.id
      });

      const keyword = await Keyword.create({
        keyword: 'cascade keyword',
        websiteId: website.id
      });

      const analyticsData = await AnalyticsData.create({
        websiteId: website.id,
        date: new Date(),
        pageViews: 100
      });

      // Delete website should cascade
      await website.destroy();

      const deletedKeyword = await Keyword.findByPk(keyword.id);
      const deletedAnalytics = await AnalyticsData.findByPk(analyticsData.id);

      expect(deletedKeyword).toBeNull();
      expect(deletedAnalytics).toBeNull();
    });

    it('should handle soft deletes where applicable', async () => {
      const user = await User.create({
        name: 'Soft Delete Test',
        email: 'softdelete@test.com',
        password: 'Password123!'
      });

      await user.destroy();

      // Should still exist with deletedAt timestamp
      const deletedUser = await User.findByPk(user.id, {
        paranoid: false
      });

      expect(deletedUser).toBeTruthy();
      expect(deletedUser.deletedAt).toBeTruthy();

      // Should not appear in normal queries
      const activeUser = await User.findByPk(user.id);
      expect(activeUser).toBeNull();
    });
  });
});