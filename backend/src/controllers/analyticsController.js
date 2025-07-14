const analyticsService = require('../services/google/analytics');
const searchConsoleService = require('../services/google/searchConsole');
const Website = require('../models/Website');
const AnalyticsData = require('../models/AnalyticsData');
const logger = require('../utils/logger');
const { dateHelpers } = require('../utils/helpers');
const { Cache, TTL } = require('../utils/cache');

// Get analytics overview
exports.getOverview = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify website ownership
    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    if (!website.google_view_id) {
      return res.status(400).json({
        error: 'Google Analytics not connected',
        message: 'Please connect Google Analytics for this website'
      });
    }

    // Get date range
    const start = startDate || dateHelpers.formatDate(dateHelpers.daysAgo(30));
    const end = endDate || dateHelpers.formatDate(new Date());

    // Get analytics data
    const [traffic, sources, topPages, devices] = await Promise.all([
      analyticsService.getWebsiteTraffic(req.user.id, website.google_view_id, start, end),
      analyticsService.getTrafficSources(req.user.id, website.google_view_id, start, end),
      analyticsService.getTopPages(req.user.id, website.google_view_id, start, end, 10),
      analyticsService.getDeviceBreakdown(req.user.id, website.google_view_id, start, end)
    ]);

    // Calculate totals
    const totals = traffic.reduce((acc, day) => ({
      users: acc.users + day.users,
      sessions: acc.sessions + day.sessions,
      pageviews: acc.pageviews + day.pageviews,
      newUsers: acc.newUsers + day.newUsers
    }), { users: 0, sessions: 0, pageviews: 0, newUsers: 0 });

    // Calculate averages
    const avgBounceRate = traffic.reduce((sum, day) => sum + day.bounceRate, 0) / traffic.length;
    const avgSessionDuration = traffic.reduce((sum, day) => sum + day.avgSessionDuration, 0) / traffic.length;

    res.json({
      dateRange: { startDate: start, endDate: end },
      totals: {
        ...totals,
        avgBounceRate: avgBounceRate.toFixed(2),
        avgSessionDuration: avgSessionDuration.toFixed(2)
      },
      traffic,
      trafficSources: sources.slice(0, 10),
      topPages,
      devices
    });

  } catch (error) {
    logger.error('Get analytics overview error:', error);
    next(error);
  }
};

// Get traffic data
exports.getTraffic = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { startDate, endDate, source } = req.query;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const start = startDate || dateHelpers.formatDate(dateHelpers.daysAgo(30));
    const end = endDate || dateHelpers.formatDate(new Date());

    let data;
    if (source === 'google-analytics' && website.google_view_id) {
      // Get from Google Analytics
      data = await analyticsService.getWebsiteTraffic(
        req.user.id,
        website.google_view_id,
        start,
        end
      );
    } else {
      // Get from database
      data = await AnalyticsData.getDailyData(websiteId, 30);
    }

    res.json({
      dateRange: { startDate: start, endDate: end },
      data
    });

  } catch (error) {
    logger.error('Get traffic error:', error);
    next(error);
  }
};

// Get realtime data
exports.getRealtimeData = async (req, res, next) => {
  try {
    const { websiteId } = req.params;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website || !website.google_view_id) {
      return res.status(404).json({
        error: 'Website not found or Google Analytics not connected'
      });
    }

    const data = await analyticsService.getRealtimeData(
      req.user.id,
      website.google_view_id
    );

    res.json(data);

  } catch (error) {
    logger.error('Get realtime data error:', error);
    next(error);
  }
};

// Get conversions
exports.getConversions = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { startDate, endDate } = req.query;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website || !website.google_view_id) {
      return res.status(404).json({
        error: 'Website not found or Google Analytics not connected'
      });
    }

    const start = startDate || dateHelpers.formatDate(dateHelpers.daysAgo(30));
    const end = endDate || dateHelpers.formatDate(new Date());

    const data = await analyticsService.getConversions(
      req.user.id,
      website.google_view_id,
      start,
      end
    );

    res.json({
      dateRange: { startDate: start, endDate: end },
      data
    });

  } catch (error) {
    logger.error('Get conversions error:', error);
    next(error);
  }
};

// Get organic traffic
exports.getOrganicTraffic = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { startDate, endDate } = req.query;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const start = startDate || dateHelpers.formatDate(dateHelpers.daysAgo(30));
    const end = endDate || dateHelpers.formatDate(new Date());

    // Get organic traffic from both sources
    const promises = [];

    if (website.google_view_id) {
      promises.push(
        analyticsService.getOrganicTraffic(req.user.id, website.google_view_id, start, end)
      );
    }

    if (website.google_site_id) {
      promises.push(
        searchConsoleService.getPerformanceByDate(req.user.id, website.google_site_id, {
          startDate: start,
          endDate: end
        })
      );
    }

    const results = await Promise.all(promises);
    
    res.json({
      dateRange: { startDate: start, endDate: end },
      analytics: results[0] || [],
      searchConsole: results[1] || []
    });

  } catch (error) {
    logger.error('Get organic traffic error:', error);
    next(error);
  }
};

// Compare periods
exports.comparePeriods = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { currentStart, currentEnd, previousStart, previousEnd } = req.query;

    if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
      return res.status(400).json({
        error: 'Missing date parameters',
        message: 'Please provide all date parameters'
      });
    }

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const comparisons = {};

    // Compare Google Analytics data
    if (website.google_view_id) {
      comparisons.analytics = await analyticsService.comparePeriods(
        req.user.id,
        website.google_view_id,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
      );
    }

    // Compare Search Console data
    if (website.google_site_id) {
      comparisons.searchConsole = await searchConsoleService.comparePeriods(
        req.user.id,
        website.google_site_id,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
      );
    }

    // Compare database data
    comparisons.database = await AnalyticsData.comparePeriods(
      websiteId,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd
    );

    res.json(comparisons);

  } catch (error) {
    logger.error('Compare periods error:', error);
    next(error);
  }
};

// Sync analytics data
exports.syncAnalytics = async (req, res, next) => {
  try {
    const { websiteId } = req.params;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website || !website.google_view_id) {
      return res.status(404).json({
        error: 'Website not found or Google Analytics not connected'
      });
    }

    // Get last 30 days of data
    const endDate = new Date();
    const startDate = dateHelpers.daysAgo(30);

    const traffic = await analyticsService.getWebsiteTraffic(
      req.user.id,
      website.google_view_id,
      dateHelpers.formatDate(startDate),
      dateHelpers.formatDate(endDate)
    );

    // Save to database
    const analyticsData = traffic.map(day => ({
      website_id: websiteId,
      date: day.date,
      visitors: day.users,
      page_views: day.pageviews,
      bounce_rate: day.bounceRate,
      avg_session_duration: Math.round(day.avgSessionDuration),
      organic_traffic: 0 // Will be updated from Search Console
    }));

    await AnalyticsData.bulkCreate(analyticsData, {
      updateOnDuplicate: [
        'visitors',
        'page_views',
        'bounce_rate',
        'avg_session_duration'
      ]
    });

    // Update organic traffic if Search Console is connected
    if (website.google_site_id) {
      const organicData = await searchConsoleService.getPerformanceByDate(
        req.user.id,
        website.google_site_id,
        {
          startDate: dateHelpers.formatDate(startDate),
          endDate: dateHelpers.formatDate(endDate)
        }
      );

      for (const day of organicData) {
        await AnalyticsData.update(
          { organic_traffic: day.clicks },
          {
            where: {
              website_id: websiteId,
              date: day.date
            }
          }
        );
      }
    }

    res.json({
      message: 'Analytics data synced successfully',
      daysProcessed: traffic.length
    });

  } catch (error) {
    logger.error('Sync analytics error:', error);
    next(error);
  }
};