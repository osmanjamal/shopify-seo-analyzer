const Website = require('../models/Website');
const AnalyticsData = require('../models/AnalyticsData');
const Keyword = require('../models/Keyword');
const TechnicalIssue = require('../models/TechnicalIssue');
const PageSpeedMetrics = require('../models/TechnicalIssue');
const analyticsService = require('../services/google/analytics');
const searchConsoleService = require('../services/google/searchConsole');
const shopifyOrdersService = require('../services/shopify/orders');
const logger = require('../utils/logger');
const { Cache, TTL } = require('../utils/cache');
const { dateHelpers, calculatePercentageChange } = require('../utils/helpers');

// Get dashboard overview
exports.getDashboardOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { websiteId, period = '30days' } = req.query;

    // Get date range based on period
    const { startDate, endDate, previousStart, previousEnd } = this.getDateRanges(period);

    // Get user's websites
    let websites;
    if (websiteId) {
      const website = await Website.findOne({
        where: { id: websiteId, user_id: userId }
      });
      if (!website) {
        return res.status(404).json({ error: 'Website not found' });
      }
      websites = [website];
    } else {
      websites = await Website.findActiveByUser(userId);
    }

    if (websites.length === 0) {
      return res.json({
        message: 'No active websites found',
        data: this.getEmptyDashboard()
      });
    }

    // Cache key for dashboard data
    const cacheKey = `dashboard:${userId}:${websiteId || 'all'}:${period}`;
    const cached = await Cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Collect dashboard data
    const dashboardData = {
      period: { startDate, endDate },
      websites: websites.map(w => ({
        id: w.id,
        name: w.name,
        domain: w.domain
      })),
      metrics: {},
      comparison: {},
      realtimeUsers: 0
    };

    // Get metrics for each website
    const metricsPromises = websites.map(async (website) => {
      const websiteMetrics = await this.getWebsiteMetrics(
        website,
        startDate,
        endDate,
        previousStart,
        previousEnd
      );
      return { websiteId: website.id, metrics: websiteMetrics };
    });

    const allMetrics = await Promise.all(metricsPromises);

    // Aggregate metrics
    dashboardData.metrics = this.aggregateMetrics(allMetrics);
    dashboardData.comparison = this.calculateComparison(
      dashboardData.metrics,
      allMetrics.map(m => m.metrics.previous)
    );

    // Get additional dashboard components
    const [
      topPages,
      topKeywords,
      recentIssues,
      trafficSources
    ] = await Promise.all([
      this.getTopPages(websites, startDate, endDate),
      this.getTopKeywords(websites),
      this.getRecentIssues(websites),
      this.getTrafficSources(websites, startDate, endDate)
    ]);

    dashboardData.topPages = topPages;
    dashboardData.topKeywords = topKeywords;
    dashboardData.recentIssues = recentIssues;
    dashboardData.trafficSources = trafficSources;

    // Get realtime users if available
    if (websites[0].google_view_id) {
      try {
        const realtimeData = await analyticsService.getRealtimeData(
          userId,
          websites[0].google_view_id
        );
        dashboardData.realtimeUsers = realtimeData.rows.reduce(
          (sum, row) => sum + parseInt(row.activeUsers || 0),
          0
        );
      } catch (error) {
        logger.error('Failed to get realtime data:', error);
      }
    }

    // Cache the result
    await Cache.set(cacheKey, dashboardData, TTL.short);

    res.json(dashboardData);

  } catch (error) {
    logger.error('Get dashboard overview error:', error);
    next(error);
  }
};

// Get SEO score
exports.getSEOScore = async (req, res, next) => {
  try {
    const { websiteId } = req.params;

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

    const score = await this.calculateSEOScore(website);

    res.json(score);

  } catch (error) {
    logger.error('Get SEO score error:', error);
    next(error);
  }
};

// Get performance metrics
exports.getPerformanceMetrics = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { period = '30days' } = req.query;

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

    const { startDate, endDate } = this.getDateRanges(period);

    // Get performance data from multiple sources
    const [
      analyticsData,
      searchConsoleData,
      pageSpeedData,
      shopifyData
    ] = await Promise.all([
      this.getAnalyticsPerformance(website, startDate, endDate),
      this.getSearchConsolePerformance(website, startDate, endDate),
      this.getPageSpeedPerformance(website),
      this.getShopifyPerformance(website, startDate, endDate)
    ]);

    const performance = {
      period: { startDate, endDate },
      analytics: analyticsData,
      searchConsole: searchConsoleData,
      pageSpeed: pageSpeedData,
      ecommerce: shopifyData
    };

    res.json(performance);

  } catch (error) {
    logger.error('Get performance metrics error:', error);
    next(error);
  }
};

// Get quick stats
exports.getQuickStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cacheKey = `dashboard:quickstats:${userId}`;
    const cached = await Cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Get counts
    const [
      websiteCount,
      activeKeywords,
      unresolvedIssues,
      totalVisitors
    ] = await Promise.all([
      Website.count({ where: { user_id: userId, is_active: true } }),
      Keyword.count({ 
        where: { 
          status: 'active',
          '$website.user_id$': userId 
        },
        include: [{
          model: Website,
          as: 'website',
          attributes: []
        }]
      }),
      TechnicalIssue.count({
        where: {
          is_resolved: false,
          '$website.user_id$': userId
        },
        include: [{
          model: Website,
          as: 'website',
          attributes: []
        }]
      }),
      AnalyticsData.sum('visitors', {
        where: {
          date: {
            [sequelize.Op.gte]: dateHelpers.daysAgo(30)
          },
          '$website.user_id: userId
        },
        include: [{
          model: Website,
          as: 'website',
          attributes: []
        }]
      })
    ]);

    const stats = {
      websites: websiteCount,
      keywords: activeKeywords,
      issues: unresolvedIssues,
      visitors: totalVisitors || 0
    };

    await Cache.set(cacheKey, stats, TTL.medium);
    res.json(stats);

  } catch (error) {
    logger.error('Get quick stats error:', error);
    next(error);
  }
};

// Helper methods

// Get date ranges based on period
exports.getDateRanges = function(period) {
  const endDate = new Date();
  let startDate, previousStart, previousEnd;

  switch (period) {
    case '7days':
      startDate = dateHelpers.daysAgo(7);
      previousEnd = dateHelpers.daysAgo(7);
      previousStart = dateHelpers.daysAgo(14);
      break;
    case '30days':
      startDate = dateHelpers.daysAgo(30);
      previousEnd = dateHelpers.daysAgo(30);
      previousStart = dateHelpers.daysAgo(60);
      break;
    case '90days':
      startDate = dateHelpers.daysAgo(90);
      previousEnd = dateHelpers.daysAgo(90);
      previousStart = dateHelpers.daysAgo(180);
      break;
    default:
      startDate = dateHelpers.daysAgo(30);
      previousEnd = dateHelpers.daysAgo(30);
      previousStart = dateHelpers.daysAgo(60);
  }

  return {
    startDate: dateHelpers.formatDate(startDate),
    endDate: dateHelpers.formatDate(endDate),
    previousStart: dateHelpers.formatDate(previousStart),
    previousEnd: dateHelpers.formatDate(previousEnd)
  };
};

// Get website metrics
exports.getWebsiteMetrics = async function(website, startDate, endDate, previousStart, previousEnd) {
  const metrics = {
    current: {},
    previous: {}
  };

  // Get analytics data
  const [currentAnalytics, previousAnalytics] = await Promise.all([
    AnalyticsData.getSummary(website.id, startDate, endDate),
    AnalyticsData.getSummary(website.id, previousStart, previousEnd)
  ]);

  metrics.current = {
    visitors: currentAnalytics.total_visitors,
    pageViews: currentAnalytics.total_page_views,
    organicTraffic: currentAnalytics.total_organic_traffic,
    bounceRate: currentAnalytics.avg_bounce_rate,
    avgSessionDuration: currentAnalytics.avg_session_duration,
    conversionRate: currentAnalytics.avg_conversion_rate,
    revenue: currentAnalytics.total_revenue,
    transactions: currentAnalytics.total_transactions
  };

  metrics.previous = {
    visitors: previousAnalytics.total_visitors,
    pageViews: previousAnalytics.total_page_views,
    organicTraffic: previousAnalytics.total_organic_traffic,
    revenue: previousAnalytics.total_revenue
  };

  // Get keyword metrics
  const [rankedKeywords, improvedKeywords] = await Promise.all([
    Keyword.count({
      where: {
        website_id: website.id,
        status: 'active',
        current_position: { [sequelize.Op.not]: null }
      }
    }),
    Keyword.count({
      where: {
        website_id: website.id,
        status: 'active',
        current_position: { [sequelize.Op.lt]: sequelize.col('previous_position') }
      }
    })
  ]);

  metrics.current.rankedKeywords = rankedKeywords;
  metrics.current.improvedKeywords = improvedKeywords;

  // Get technical issues
  const issueCount = await TechnicalIssue.countBySeverity(website.id);
  metrics.current.technicalIssues = issueCount;

  return metrics;
};

// Aggregate metrics from multiple websites
exports.aggregateMetrics = function(websiteMetrics) {
  const aggregated = {
    visitors: 0,
    pageViews: 0,
    organicTraffic: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    conversionRate: 0,
    revenue: 0,
    transactions: 0,
    rankedKeywords: 0,
    improvedKeywords: 0,
    technicalIssues: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  };

  let websiteCount = 0;

  websiteMetrics.forEach(({ metrics }) => {
    if (metrics.current) {
      aggregated.visitors += metrics.current.visitors;
      aggregated.pageViews += metrics.current.pageViews;
      aggregated.organicTraffic += metrics.current.organicTraffic;
      aggregated.revenue += metrics.current.revenue;
      aggregated.transactions += metrics.current.transactions;
      aggregated.rankedKeywords += metrics.current.rankedKeywords || 0;
      aggregated.improvedKeywords += metrics.current.improvedKeywords || 0;
      
      if (metrics.current.bounceRate > 0) {
        aggregated.bounceRate += metrics.current.bounceRate;
        websiteCount++;
      }
      
      aggregated.avgSessionDuration += metrics.current.avgSessionDuration;
      aggregated.conversionRate += metrics.current.conversionRate;

      // Aggregate technical issues
      if (metrics.current.technicalIssues) {
        Object.keys(metrics.current.technicalIssues).forEach(severity => {
          aggregated.technicalIssues[severity] += metrics.current.technicalIssues[severity];
        });
      }
    }
  });

  // Calculate averages
  if (websiteCount > 0) {
    aggregated.bounceRate = aggregated.bounceRate / websiteCount;
    aggregated.avgSessionDuration = aggregated.avgSessionDuration / websiteCount;
    aggregated.conversionRate = aggregated.conversionRate / websiteCount;
  }

  return aggregated;
};

// Calculate comparison
exports.calculateComparison = function(current, previousArray) {
  const previous = this.aggregateMetrics(previousArray.map(p => ({ current: p })));
  
  return {
    visitors: calculatePercentageChange(previous.visitors, current.visitors),
    pageViews: calculatePercentageChange(previous.pageViews, current.pageViews),
    organicTraffic: calculatePercentageChange(previous.organicTraffic, current.organicTraffic),
    revenue: calculatePercentageChange(previous.revenue, current.revenue)
  };
};

// Get top pages
exports.getTopPages = async function(websites, startDate, endDate) {
  const topPages = [];

  for (const website of websites) {
    if (website.google_view_id) {
      try {
        const pages = await analyticsService.getTopPages(
          website.user_id,
          website.google_view_id,
          startDate,
          endDate,
          5
        );
        
        topPages.push(...pages.map(page => ({
          ...page,
          websiteId: website.id,
          websiteName: website.name
        })));
      } catch (error) {
        logger.error(`Failed to get top pages for ${website.domain}:`, error);
      }
    }
  }

  // Sort by pageviews and return top 10
  return topPages
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 10);
};

// Get top keywords
exports.getTopKeywords = async function(websites) {
  const websiteIds = websites.map(w => w.id);
  
  const keywords = await Keyword.findAll({
    where: {
      website_id: websiteIds,
      status: 'active',
      current_position: { 
        [sequelize.Op.and]: [
          { [sequelize.Op.not]: null },
          { [sequelize.Op.lte]: 20 }
        ]
      }
    },
    order: [['current_position', 'ASC']],
    limit: 10,
    include: [{
      model: Website,
      as: 'website',
      attributes: ['name', 'domain']
    }]
  });

  return keywords.map(k => ({
    id: k.id,
    keyword: k.keyword,
    position: k.current_position,
    previousPosition: k.previous_position,
    change: k.getPositionChange(),
    website: k.website.name
  }));
};

// Get recent issues
exports.getRecentIssues = async function(websites) {
  const websiteIds = websites.map(w => w.id);
  
  const issues = await TechnicalIssue.findAll({
    where: {
      website_id: websiteIds,
      is_resolved: false
    },
    order: [
      ['severity', 'DESC'],
      ['first_detected_at', 'DESC']
    ],
    limit: 10,
    include: [{
      model: Website,
      as: 'website',
      attributes: ['name', 'domain']
    }]
  });

  return issues.map(issue => ({
    id: issue.id,
    type: issue.issue_type,
    description: issue.issue_description,
    severity: issue.severity,
    url: issue.page_url,
    website: issue.website.name,
    daysOpen: issue.getDurationDays()
  }));
};

// Get traffic sources
exports.getTrafficSources = async function(websites, startDate, endDate) {
  const sources = {};

  for (const website of websites) {
    if (website.google_view_id) {
      try {
        const trafficSources = await analyticsService.getTrafficSources(
          website.user_id,
          website.google_view_id,
          startDate,
          endDate
        );
        
        // Aggregate sources
        trafficSources.forEach(source => {
          const key = `${source.source}/${source.medium}`;
          if (!sources[key]) {
            sources[key] = {
              source: source.source,
              medium: source.medium,
              users: 0,
              sessions: 0
            };
          }
          sources[key].users += source.users;
          sources[key].sessions += source.sessions;
        });
      } catch (error) {
        logger.error(`Failed to get traffic sources for ${website.domain}:`, error);
      }
    }
  }

  // Convert to array and sort
  return Object.values(sources)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);
};

// Calculate SEO score
exports.calculateSEOScore = async function(website) {
  let score = 100;
  const breakdown = {
    technical: 25,
    content: 25,
    keywords: 25,
    backlinks: 25
  };

  // Technical score
  const issueCount = await TechnicalIssue.countBySeverity(website.id);
  const technicalDeduction = 
    (issueCount.critical * 5) +
    (issueCount.high * 3) +
    (issueCount.medium * 1) +
    (issueCount.low * 0.5);
  breakdown.technical = Math.max(0, 25 - Math.min(25, technicalDeduction));

  // Keywords score
  const [totalKeywords, rankedKeywords, top10Keywords] = await Promise.all([
    Keyword.count({ where: { website_id: website.id, status: 'active' } }),
    Keyword.count({ 
      where: { 
        website_id: website.id, 
        status: 'active',
        current_position: { [sequelize.Op.not]: null }
      }
    }),
    Keyword.count({
      where: {
        website_id: website.id,
        status: 'active',
        current_position: { [sequelize.Op.lte]: 10 }
      }
    })
  ]);

  if (totalKeywords > 0) {
    const rankingRate = rankedKeywords / totalKeywords;
    const top10Rate = top10Keywords / totalKeywords;
    breakdown.keywords = Math.round((rankingRate * 15) + (top10Rate * 10));
  }

  // Content score (based on PageSpeed SEO score)
  const latestPageSpeed = await PageSpeedMetrics.findOne({
    where: { website_id: website.id },
    order: [['measured_at', 'DESC']]
  });

  if (latestPageSpeed && latestPageSpeed.seo_score) {
    breakdown.content = Math.round((latestPageSpeed.seo_score / 100) * 25);
  }

  // Calculate total
  const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    score: Math.round(totalScore),
    breakdown,
    recommendations: this.generateRecommendations(breakdown)
  };
};

// Generate recommendations
exports.generateRecommendations = function(breakdown) {
  const recommendations = [];

  if (breakdown.technical < 20) {
    recommendations.push({
      category: 'technical',
      priority: 'high',
      message: 'Fix critical technical SEO issues to improve crawlability'
    });
  }

  if (breakdown.keywords < 15) {
    recommendations.push({
      category: 'keywords',
      priority: 'high',
      message: 'Add more keywords and improve rankings for existing ones'
    });
  }

  if (breakdown.content < 20) {
    recommendations.push({
      category: 'content',
      priority: 'medium',
      message: 'Optimize on-page SEO elements like titles and descriptions'
    });
  }

  return recommendations;
};

// Get analytics performance
exports.getAnalyticsPerformance = async function(website, startDate, endDate) {
  if (!website.google_view_id) return null;

  try {
    const data = await analyticsService.getWebsiteTraffic(
      website.user_id,
      website.google_view_id,
      startDate,
      endDate
    );

    return {
      available: true,
      data: data.map(d => ({
        date: d.date,
        users: d.users,
        sessions: d.sessions,
        pageviews: d.pageviews,
        bounceRate: d.bounceRate,
        avgSessionDuration: d.avgSessionDuration
      }))
    };
  } catch (error) {
    logger.error('Get analytics performance error:', error);
    return { available: false, error: error.message };
  }
};

// Get Search Console performance
exports.getSearchConsolePerformance = async function(website, startDate, endDate) {
  if (!website.google_site_id) return null;

  try {
    const data = await searchConsoleService.getPerformanceByDate(
      website.user_id,
      website.google_site_id,
      { startDate, endDate }
    );

    return {
      available: true,
      data: data.map(d => ({
        date: d.date,
        clicks: d.clicks,
        impressions: d.impressions,
        ctr: d.ctr,
        position: d.position
      }))
    };
  } catch (error) {
    logger.error('Get search console performance error:', error);
    return { available: false, error: error.message };
  }
};

// Get PageSpeed performance
exports.getPageSpeedPerformance = async function(website) {
  const latestMetrics = await PageSpeedMetrics.findOne({
    where: { website_id: website.id },
    order: [['measured_at', 'DESC']]
  });

  if (!latestMetrics) return null;

  return {
    available: true,
    scores: {
      performance: latestMetrics.performance_score,
      seo: latestMetrics.seo_score,
      accessibility: latestMetrics.accessibility_score,
      bestPractices: latestMetrics.best_practices_score
    },
    metrics: {
      fcp: latestMetrics.first_contentful_paint,
      si: latestMetrics.speed_index,
      lcp: latestMetrics.largest_contentful_paint,
      tti: latestMetrics.time_to_interactive,
      tbt: latestMetrics.total_blocking_time,
      cls: latestMetrics.cumulative_layout_shift
    },
    measuredAt: latestMetrics.measured_at
  };
};

// Get Shopify performance
exports.getShopifyPerformance = async function(website, startDate, endDate) {
  if (!website.shopify_store_id || !website.shopify_access_token) return null;

  try {
    const orderAnalytics = await shopifyOrdersService.getOrderAnalytics(
      website.domain,
      website.shopify_access_token,
      startDate,
      endDate
    );

    return {
      available: true,
      totalOrders: orderAnalytics.totalOrders,
      totalRevenue: orderAnalytics.totalRevenue,
      averageOrderValue: orderAnalytics.averageOrderValue,
      conversionMetrics: orderAnalytics.conversionMetrics,
      topProducts: orderAnalytics.topProducts.slice(0, 5)
    };
  } catch (error) {
    logger.error('Get Shopify performance error:', error);
    return { available: false, error: error.message };
  }
};

// Get empty dashboard
exports.getEmptyDashboard = function() {
  return {
    metrics: {
      visitors: 0,
      pageViews: 0,
      organicTraffic: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      conversionRate: 0,
      revenue: 0,
      transactions: 0,
      rankedKeywords: 0,
      improvedKeywords: 0,
      technicalIssues: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    },
    comparison: {
      visitors: 0,
      pageViews: 0,
      organicTraffic: 0,
      revenue: 0
    },
    topPages: [],
    topKeywords: [],
    recentIssues: [],
    trafficSources: []
  };
};