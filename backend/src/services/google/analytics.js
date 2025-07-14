const { getAnalyticsAPI, getAnalyticsAdminAPI, makeAPICall } = require('../../config/google');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { dateHelpers, batchArray } = require('../../utils/helpers');

class AnalyticsService {
  constructor() {
    this.metrics = {
      users: 'totalUsers',
      newUsers: 'newUsers',
      sessions: 'sessions',
      bounceRate: 'bounceRate',
      avgSessionDuration: 'averageSessionDuration',
      pageviews: 'screenPageViews',
      conversions: 'conversions',
      revenue: 'totalRevenue'
    };

    this.dimensions = {
      date: 'date',
      source: 'sessionSource',
      medium: 'sessionMedium',
      campaign: 'sessionCampaignName',
      page: 'pagePath',
      country: 'country',
      device: 'deviceCategory',
      browser: 'browser'
    };
  }

  // Get GA4 properties
  async getProperties(userId) {
    try {
      const cacheKey = `ga:properties:${userId}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const adminAPI = await getAnalyticsAdminAPI(userId);
      const response = await makeAPICall('analytics', userId, async () => {
        return adminAPI.properties.list({
          pageSize: 200
        });
      });

      const properties = response.data.properties || [];
      await Cache.set(cacheKey, properties, TTL.long);
      return properties;
    } catch (error) {
      logger.error('Failed to get GA4 properties:', error);
      throw error;
    }
  }

  // Get property by ID
  async getProperty(userId, propertyId) {
    try {
      const properties = await this.getProperties(userId);
      return properties.find(p => p.name === `properties/${propertyId}`);
    } catch (error) {
      logger.error('Failed to get property:', error);
      throw error;
    }
  }

  // Run report
  async runReport(userId, propertyId, options = {}) {
    try {
      const {
        startDate = dateHelpers.formatDate(dateHelpers.daysAgo(28)),
        endDate = dateHelpers.formatDate(new Date()),
        metrics = ['totalUsers', 'sessions'],
        dimensions = [],
        dimensionFilter = null,
        metricFilter = null,
        orderBys = [],
        limit = 10000,
        offset = 0
      } = options;

      const cacheKey = `ga:report:${userId}:${propertyId}:${JSON.stringify(options)}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const analyticsData = await getAnalyticsAPI(userId);
      
      const requestBody = {
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        metrics: metrics.map(metric => ({ name: metric })),
        dimensions: dimensions.map(dimension => ({ name: dimension })),
        limit,
        offset
      };

      if (dimensionFilter) requestBody.dimensionFilter = dimensionFilter;
      if (metricFilter) requestBody.metricFilter = metricFilter;
      if (orderBys.length > 0) requestBody.orderBys = orderBys;

      const response = await makeAPICall('analytics', userId, async () => {
        return analyticsData.properties.runReport(requestBody);
      });

      const data = this.parseReportResponse(response.data);
      await Cache.set(cacheKey, data, TTL.medium);
      return data;
    } catch (error) {
      logger.error('Failed to run report:', error);
      throw error;
    }
  }

  // Get realtime data
  async getRealtimeData(userId, propertyId) {
    try {
      const cacheKey = `ga:realtime:${userId}:${propertyId}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const analyticsData = await getAnalyticsAPI(userId);
      const response = await makeAPICall('analytics', userId, async () => {
        return analyticsData.properties.runRealtimeReport({
          property: `properties/${propertyId}`,
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' }
          ],
          dimensions: [
            { name: 'unifiedScreenName' },
            { name: 'country' },
            { name: 'deviceCategory' }
          ]
        });
      });

      const data = this.parseReportResponse(response.data);
      await Cache.set(cacheKey, data, TTL.short);
      return data;
    } catch (error) {
      logger.error('Failed to get realtime data:', error);
      throw error;
    }
  }

  // Get website traffic
  async getWebsiteTraffic(userId, propertyId, startDate, endDate) {
    try {
      const data = await this.runReport(userId, propertyId, {
        startDate,
        endDate,
        metrics: [
          'totalUsers',
          'newUsers',
          'sessions',
          'bounceRate',
          'averageSessionDuration',
          'screenPageViews'
        ],
        dimensions: ['date'],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      });

      return data.rows.map(row => ({
        date: row.date,
        users: parseInt(row.totalUsers) || 0,
        newUsers: parseInt(row.newUsers) || 0,
        sessions: parseInt(row.sessions) || 0,
        bounceRate: parseFloat(row.bounceRate) || 0,
        avgSessionDuration: parseFloat(row.averageSessionDuration) || 0,
        pageviews: parseInt(row.screenPageViews) || 0
      }));
    } catch (error) {
      logger.error('Failed to get website traffic:', error);
      throw error;
    }
  }

  // Get traffic sources
  async getTrafficSources(userId, propertyId, startDate, endDate) {
    try {
      const data = await this.runReport(userId, propertyId, {
        startDate,
        endDate,
        metrics: ['totalUsers', 'sessions', 'bounceRate'],
        dimensions: ['sessionSource', 'sessionMedium'],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 100
      });

      return data.rows.map(row => ({
        source: row.sessionSource || '(direct)',
        medium: row.sessionMedium || '(none)',
        users: parseInt(row.totalUsers) || 0,
        sessions: parseInt(row.sessions) || 0,
        bounceRate: parseFloat(row.bounceRate) || 0
      }));
    } catch (error) {
      logger.error('Failed to get traffic sources:', error);
      throw error;
    }
  }

  // Get top pages
  async getTopPages(userId, propertyId, startDate, endDate, limit = 50) {
    try {
      const data = await this.runReport(userId, propertyId, {
        startDate,
        endDate,
        metrics: ['screenPageViews', 'totalUsers', 'averageSessionDuration', 'bounceRate'],
        dimensions: ['pagePath', 'pageTitle'],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit
      });

      return data.rows.map(row => ({
        path: row.pagePath,
        title: row.pageTitle || 'Untitled',
        pageviews: parseInt(row.screenPageViews) || 0,
        users: parseInt(row.totalUsers) || 0,
        avgTimeOnPage: parseFloat(row.averageSessionDuration) || 0,
        bounceRate: parseFloat(row.bounceRate) || 0
      }));
    } catch (error) {
      logger.error('Failed to get top pages:', error);
      throw error;
    }
  }

  // Get conversions and revenue
  async getConversions(userId, propertyId, startDate, endDate) {
    try {
      const data = await this.runReport(userId, propertyId, {
        startDate,
        endDate,
        metrics: ['conversions', 'totalRevenue', 'totalUsers'],
        dimensions: ['date'],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      });

      return data.rows.map(row => ({
        date: row.date,
        conversions: parseInt(row.conversions) || 0,
        revenue: parseFloat(row.totalRevenue) || 0,
        conversionRate: row.totalUsers > 0 ? 
          ((row.conversions / row.totalUsers) * 100).toFixed(2) : 0
      }));
    } catch (error) {
      logger.error('Failed to get conversions:', error);
      throw error;
    }
  }

  // Get device breakdown
  async getDeviceBreakdown(userId, propertyId, startDate, endDate) {
    try {
      const data = await this.runReport(userId, propertyId, {
        startDate,
        endDate,
        metrics: ['totalUsers', 'sessions', 'bounceRate'],
        dimensions: ['deviceCategory'],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      });

      return data.rows.map(row => ({
        device: row.deviceCategory,
        users: parseInt(row.totalUsers) || 0,
        sessions: parseInt(row.sessions) || 0,
        bounceRate: parseFloat(row.bounceRate) || 0
      }));
    } catch (error) {
      logger.error('Failed to get device breakdown:', error);
      throw error;
    }
  }

  // Get geographic data
  async getGeographicData(userId, propertyId, startDate, endDate) {
    try {
      const data = await this.runReport(userId, propertyId, {
        startDate,
        endDate,
        metrics: ['totalUsers', 'sessions', 'totalRevenue'],
        dimensions: ['country', 'city'],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 100
      });

      return data.rows.map(row => ({
        country: row.country,
        city: row.city || 'Unknown',
        users: parseInt(row.totalUsers) || 0,
        sessions: parseInt(row.sessions) || 0,
        revenue: parseFloat(row.totalRevenue) || 0
      }));
    } catch (error) {
      logger.error('Failed to get geographic data:', error);
      throw error;
    }
  }

  // Get organic traffic
  async getOrganicTraffic(userId, propertyId, startDate, endDate) {
    try {
      const data = await this.runReport(userId, propertyId, {
        startDate,
        endDate,
        metrics: ['totalUsers', 'sessions', 'screenPageViews'],
        dimensions: ['date'],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionMedium',
            stringFilter: {
              value: 'organic'
            }
          }
        },
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      });

      return data.rows.map(row => ({
        date: row.date,
        users: parseInt(row.totalUsers) || 0,
        sessions: parseInt(row.sessions) || 0,
        pageviews: parseInt(row.screenPageViews) || 0
      }));
    } catch (error) {
      logger.error('Failed to get organic traffic:', error);
      throw error;
    }
  }

  // Compare periods
  async comparePeriods(userId, propertyId, currentStart, currentEnd, previousStart, previousEnd) {
    try {
      const [currentData, previousData] = await Promise.all([
        this.runReport(userId, propertyId, {
          startDate: currentStart,
          endDate: currentEnd,
          metrics: ['totalUsers', 'sessions', 'screenPageViews', 'totalRevenue']
        }),
        this.runReport(userId, propertyId, {
          startDate: previousStart,
          endDate: previousEnd,
          metrics: ['totalUsers', 'sessions', 'screenPageViews', 'totalRevenue']
        })
      ]);

      const sumMetrics = (rows) => {
        return rows.reduce((acc, row) => ({
          users: acc.users + (parseInt(row.totalUsers) || 0),
          sessions: acc.sessions + (parseInt(row.sessions) || 0),
          pageviews: acc.pageviews + (parseInt(row.screenPageViews) || 0),
          revenue: acc.revenue + (parseFloat(row.totalRevenue) || 0)
        }), { users: 0, sessions: 0, pageviews: 0, revenue: 0 });
      };

      const current = sumMetrics(currentData.rows);
      const previous = sumMetrics(previousData.rows);

      const calculateChange = (curr, prev) => {
        return prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      };

      return {
        current,
        previous,
        change: {
          users: calculateChange(current.users, previous.users),
          sessions: calculateChange(current.sessions, previous.sessions),
          pageviews: calculateChange(current.pageviews, previous.pageviews),
          revenue: calculateChange(current.revenue, previous.revenue)
        }
      };
    } catch (error) {
      logger.error('Failed to compare periods:', error);
      throw error;
    }
  }

  // Parse report response
  parseReportResponse(response) {
    const rows = [];
    
    if (!response.rows) {
      return { rows, rowCount: 0 };
    }

    const dimensionHeaders = response.dimensionHeaders || [];
    const metricHeaders = response.metricHeaders || [];

    for (const row of response.rows) {
      const parsedRow = {};
      
      // Parse dimensions
      if (row.dimensionValues) {
        row.dimensionValues.forEach((value, index) => {
          const header = dimensionHeaders[index];
          if (header) {
            parsedRow[header.name] = value.value;
          }
        });
      }

      // Parse metrics
      if (row.metricValues) {
        row.metricValues.forEach((value, index) => {
          const header = metricHeaders[index];
          if (header) {
            parsedRow[header.name] = value.value;
          }
        });
      }

      rows.push(parsedRow);
    }

    return {
      rows,
      rowCount: response.rowCount || rows.length,
      metadata: response.metadata
    };
  }
}

module.exports = new AnalyticsService();