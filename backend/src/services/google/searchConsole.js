const { getSearchConsoleAPI, makeAPICall } = require('../../config/google');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { dateHelpers, batchArray } = require('../../utils/helpers');

class SearchConsoleService {
  constructor() {
    this.rowLimit = 25000; // Google's max rows per request
    this.dimensions = ['query', 'page', 'country', 'device'];
  }

  // Get verified sites
  async getVerifiedSites(userId) {
    try {
      const cacheKey = `gsc:sites:${userId}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const searchConsole = await getSearchConsoleAPI(userId);
      const response = await makeAPICall('searchConsole', userId, async () => {
        return searchConsole.sites.list();
      });

      const sites = response.data.siteEntry || [];
      const verifiedSites = sites
        .filter(site => site.permissionLevel !== 'siteUnverifiedUser')
        .map(site => ({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel
        }));

      await Cache.set(cacheKey, verifiedSites, TTL.long);
      return verifiedSites;
    } catch (error) {
      logger.error('Failed to get verified sites:', error);
      throw error;
    }
  }

  // Verify site ownership
  async verifySite(userId, siteUrl) {
    try {
      const sites = await this.getVerifiedSites(userId);
      return sites.some(site => site.siteUrl === siteUrl);
    } catch (error) {
      logger.error('Failed to verify site:', error);
      return false;
    }
  }

  // Get search analytics data
  async getSearchAnalytics(userId, siteUrl, options = {}) {
    try {
      const {
        startDate = dateHelpers.formatDate(dateHelpers.daysAgo(28)),
        endDate = dateHelpers.formatDate(new Date()),
        dimensions = ['query'],
        dimensionFilterGroups = [],
        aggregationType = 'auto',
        rowLimit = 1000,
        startRow = 0
      } = options;

      const cacheKey = `gsc:analytics:${userId}:${siteUrl}:${JSON.stringify(options)}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const searchConsole = await getSearchConsoleAPI(userId);
      const response = await makeAPICall('searchConsole', userId, async () => {
        return searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions,
            dimensionFilterGroups,
            aggregationType,
            rowLimit: Math.min(rowLimit, this.rowLimit),
            startRow
          }
        });
      });

      const data = {
        rows: response.data.rows || [],
        responseAggregationType: response.data.responseAggregationType
      };

      await Cache.set(cacheKey, data, TTL.medium);
      return data;
    } catch (error) {
      logger.error('Failed to get search analytics:', error);
      throw error;
    }
  }

  // Get top queries
  async getTopQueries(userId, siteUrl, options = {}) {
    try {
      const {
        startDate = dateHelpers.formatDate(dateHelpers.daysAgo(28)),
        endDate = dateHelpers.formatDate(new Date()),
        limit = 100
      } = options;

      const data = await this.getSearchAnalytics(userId, siteUrl, {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: limit
      });

      return data.rows.map(row => ({
        query: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      })).sort((a, b) => b.clicks - a.clicks);
    } catch (error) {
      logger.error('Failed to get top queries:', error);
      throw error;
    }
  }

  // Get top pages
  async getTopPages(userId, siteUrl, options = {}) {
    try {
      const {
        startDate = dateHelpers.formatDate(dateHelpers.daysAgo(28)),
        endDate = dateHelpers.formatDate(new Date()),
        limit = 100
      } = options;

      const data = await this.getSearchAnalytics(userId, siteUrl, {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: limit
      });

      return data.rows.map(row => ({
        page: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      })).sort((a, b) => b.clicks - a.clicks);
    } catch (error) {
      logger.error('Failed to get top pages:', error);
      throw error;
    }
  }

  // Get keyword positions
  async getKeywordPositions(userId, siteUrl, keywords) {
    try {
      const batches = batchArray(keywords, 50);
      const results = [];

      for (const batch of batches) {
        const promises = batch.map(keyword => 
          this.getSearchAnalytics(userId, siteUrl, {
            dimensions: ['query'],
            dimensionFilterGroups: [{
              filters: [{
                dimension: 'query',
                expression: keyword,
                operator: 'equals'
              }]
            }],
            rowLimit: 1
          })
        );

        const batchResults = await Promise.all(promises);
        
        batchResults.forEach((data, index) => {
          const keyword = batch[index];
          const row = data.rows?.[0];
          
          results.push({
            keyword,
            position: row ? Math.round(row.position) : null,
            clicks: row?.clicks || 0,
            impressions: row?.impressions || 0,
            ctr: row?.ctr || 0
          });
        });
      }

      return results;
    } catch (error) {
      logger.error('Failed to get keyword positions:', error);
      throw error;
    }
  }

  // Get performance by date
  async getPerformanceByDate(userId, siteUrl, options = {}) {
    try {
      const {
        startDate = dateHelpers.formatDate(dateHelpers.daysAgo(30)),
        endDate = dateHelpers.formatDate(new Date())
      } = options;

      const data = await this.getSearchAnalytics(userId, siteUrl, {
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: this.rowLimit
      });

      return data.rows.map(row => ({
        date: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      }));
    } catch (error) {
      logger.error('Failed to get performance by date:', error);
      throw error;
    }
  }

  // Get crawl errors
  async getCrawlErrors(userId, siteUrl) {
    try {
      const cacheKey = `gsc:crawlerrors:${userId}:${siteUrl}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const searchConsole = await getSearchConsoleAPI(userId);
      const response = await makeAPICall('searchConsole', userId, async () => {
        return searchConsole.urlcrawlerrorscounts.query({
          siteUrl
        });
      });

      const errors = response.data.countPerTypes || [];
      await Cache.set(cacheKey, errors, TTL.long);
      return errors;
    } catch (error) {
      logger.error('Failed to get crawl errors:', error);
      throw error;
    }
  }

  // Get sitemaps
  async getSitemaps(userId, siteUrl) {
    try {
      const cacheKey = `gsc:sitemaps:${userId}:${siteUrl}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const searchConsole = await getSearchConsoleAPI(userId);
      const response = await makeAPICall('searchConsole', userId, async () => {
        return searchConsole.sitemaps.list({
          siteUrl
        });
      });

      const sitemaps = response.data.sitemap || [];
      await Cache.set(cacheKey, sitemaps, TTL.long);
      return sitemaps;
    } catch (error) {
      logger.error('Failed to get sitemaps:', error);
      throw error;
    }
  }

  // Get index coverage
  async getIndexCoverage(userId, siteUrl) {
    try {
      const data = await this.getSearchAnalytics(userId, siteUrl, {
        dimensions: ['page'],
        rowLimit: this.rowLimit
      });

      const indexedPages = data.rows.length;
      
      // Get total submitted pages from sitemaps
      const sitemaps = await this.getSitemaps(userId, siteUrl);
      const totalSubmitted = sitemaps.reduce((sum, sitemap) => 
        sum + (sitemap.contents?.[0]?.submitted || 0), 0
      );

      return {
        indexedPages,
        totalSubmitted,
        coverageRate: totalSubmitted > 0 ? (indexedPages / totalSubmitted) * 100 : 0
      };
    } catch (error) {
      logger.error('Failed to get index coverage:', error);
      throw error;
    }
  }

  // Compare periods
  async comparePeriods(userId, siteUrl, currentStart, currentEnd, previousStart, previousEnd) {
    try {
      const [currentData, previousData] = await Promise.all([
        this.getSearchAnalytics(userId, siteUrl, {
          startDate: currentStart,
          endDate: currentEnd
        }),
        this.getSearchAnalytics(userId, siteUrl, {
          startDate: previousStart,
          endDate: previousEnd
        })
      ]);

      const sumMetrics = (rows) => {
        return rows.reduce((acc, row) => ({
          clicks: acc.clicks + (row.clicks || 0),
          impressions: acc.impressions + (row.impressions || 0)
        }), { clicks: 0, impressions: 0 });
      };

      const current = sumMetrics(currentData.rows);
      const previous = sumMetrics(previousData.rows);

      return {
        current,
        previous,
        change: {
          clicks: previous.clicks > 0 ? 
            ((current.clicks - previous.clicks) / previous.clicks) * 100 : 0,
          impressions: previous.impressions > 0 ? 
            ((current.impressions - previous.impressions) / previous.impressions) * 100 : 0
        }
      };
    } catch (error) {
      logger.error('Failed to compare periods:', error);
      throw error;
    }
  }
}

module.exports = new SearchConsoleService();