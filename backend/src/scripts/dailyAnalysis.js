const { sequelize } = require('../utils/database');
const Website = require('../models/Website');
const AnalyticsData = require('../models/AnalyticsData');
const TechnicalIssue = require('../models/TechnicalIssue');
const keywordTracker = require('../services/analysis/keywordTracker');
const analyticsService = require('../services/google/analytics');
const searchConsoleService = require('../services/google/searchConsole');
const technicalSeoService = require('../services/analysis/technicalSeo');
const websiteAnalyzer = require('../services/analysis/websiteAnalyzer');
const logger = require('../utils/logger');
const { addJob } = require('../utils/scheduler');
const { dateHelpers } = require('../utils/helpers');

class DailyAnalysis {
  constructor() {
    this.isRunning = false;
  }

  // Run daily analysis for all active websites
  async runDailyAnalysis() {
    if (this.isRunning) {
      logger.warn('Daily analysis is already running');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('Starting daily analysis...');

      // Get all active websites
      const websites = await Website.findAll({
        where: { is_active: true },
        include: [{
          model: require('../models/User'),
          as: 'user',
          where: { is_active: true }
        }]
      });

      logger.info(`Found ${websites.length} active websites to analyze`);

      const results = {
        total: websites.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Process each website
      for (const website of websites) {
        try {
          await this.analyzeWebsite(website);
          results.success++;
        } catch (error) {
          logger.error(`Failed to analyze website ${website.domain}:`, error);
          results.failed++;
          results.errors.push({
            website: website.domain,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Daily analysis completed in ${duration}ms`, results);

      // Send summary report
      await this.sendSummaryReport(results);

      return results;

    } catch (error) {
      logger.error('Daily analysis error:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Analyze individual website
  async analyzeWebsite(website) {
    logger.info(`Analyzing website: ${website.domain}`);

    const tasks = [];

    // 1. Track keyword positions
    if (website.google_site_id) {
      tasks.push(
        this.trackKeywords(website.id)
          .catch(err => logger.error(`Keyword tracking failed for ${website.domain}:`, err))
      );
    }

    // 2. Sync analytics data
    if (website.google_view_id) {
      tasks.push(
        this.syncAnalytics(website)
          .catch(err => logger.error(`Analytics sync failed for ${website.domain}:`, err))
      );
    }

    // 3. Update Search Console data
    if (website.google_site_id) {
      tasks.push(
        this.updateSearchConsoleData(website)
          .catch(err => logger.error(`Search Console update failed for ${website.domain}:`, err))
      );
    }

    // 4. Run technical SEO checks
    tasks.push(
      this.runTechnicalChecks(website)
        .catch(err => logger.error(`Technical checks failed for ${website.domain}:`, err))
    );

    // 5. Check for alerts
    tasks.push(
      this.checkAlerts(website)
        .catch(err => logger.error(`Alert check failed for ${website.domain}:`, err))
    );

    // Execute all tasks in parallel
    await Promise.all(tasks);

    logger.info(`Completed analysis for website: ${website.domain}`);
  }

  // Track keyword positions
  async trackKeywords(websiteId) {
    logger.debug(`Tracking keywords for website ${websiteId}`);
    const result = await keywordTracker.trackKeywordPositions(websiteId);
    return result;
  }

  // Sync analytics data
  async syncAnalytics(website) {
    logger.debug(`Syncing analytics for website ${website.domain}`);
    
    const endDate = new Date();
    const startDate = dateHelpers.daysAgo(1);

    // Get data from Google Analytics
    const traffic = await analyticsService.getWebsiteTraffic(
      website.user_id,
      website.google_view_id,
      dateHelpers.formatDate(startDate),
      dateHelpers.formatDate(endDate)
    );

    // Save to database
    for (const day of traffic) {
      await AnalyticsData.upsert({
        website_id: website.id,
        date: day.date,
        visitors: day.users,
        page_views: day.pageviews,
        bounce_rate: day.bounceRate,
        avg_session_duration: Math.round(day.avgSessionDuration)
      });
    }

    // Get conversion data
    const conversions = await analyticsService.getConversions(
      website.user_id,
      website.google_view_id,
      dateHelpers.formatDate(startDate),
      dateHelpers.formatDate(endDate)
    );

    // Update conversion metrics
    for (const day of conversions) {
      await AnalyticsData.update(
        {
          conversion_rate: day.conversionRate,
          revenue: day.revenue,
          transactions: day.conversions
        },
        {
          where: {
            website_id: website.id,
            date: day.date
          }
        }
      );
    }
  }

  // Update Search Console data
  async updateSearchConsoleData(website) {
    logger.debug(`Updating Search Console data for website ${website.domain}`);
    
    const endDate = new Date();
    const startDate = dateHelpers.daysAgo(1);

    // Get performance data
    const performance = await searchConsoleService.getPerformanceByDate(
      website.user_id,
      website.google_site_id,
      {
        startDate: dateHelpers.formatDate(startDate),
        endDate: dateHelpers.formatDate(endDate)
      }
    );

    // Update organic traffic in analytics data
    for (const day of performance) {
      await AnalyticsData.update(
        { organic_traffic: day.clicks },
        {
          where: {
            website_id: website.id,
            date: day.date
          }
        }
      );
    }

    // Check for new crawl errors
    const crawlErrors = await searchConsoleService.getCrawlErrors(
      website.user_id,
      website.google_site_id
    );

    // Log any new errors
    if (crawlErrors.length > 0) {
      logger.warn(`Found ${crawlErrors.length} crawl errors for ${website.domain}`);
    }
  }

  // Run technical SEO checks
  async runTechnicalChecks(website) {
    logger.debug(`Running technical checks for website ${website.domain}`);
    
    const websiteUrl = `https://${website.domain}`;
    
    // Analyze homepage
    const analysis = await websiteAnalyzer.analyzeWebsite(websiteUrl);
    
    // Process and save issues
    const issues = [];
    
    // Meta issues
    if (analysis.meta.issues) {
      analysis.meta.issues.forEach(issue => {
        issues.push({
          website_id: website.id,
          page_url: websiteUrl,
          issue_type: issue.type,
          issue_description: issue.message,
          severity: issue.severity
        });
      });
    }

    // Other issues
    ['headings', 'images', 'links', 'structuredData', 'social', 'technical'].forEach(section => {
      if (analysis[section]?.issues) {
        analysis[section].issues.forEach(issue => {
          issues.push({
            website_id: website.id,
            page_url: websiteUrl,
            issue_type: issue.type,
            issue_description: issue.message,
            severity: issue.severity
          });
        });
      }
    });

    // Save new issues
    if (issues.length > 0) {
      await TechnicalIssue.bulkCreate(issues, {
        updateOnDuplicate: ['last_detected_at']
      });
    }

    // Mark resolved issues
    const currentIssueTypes = new Set(issues.map(i => i.issue_type));
    const existingIssues = await TechnicalIssue.findAll({
      where: {
        website_id: website.id,
        page_url: websiteUrl,
        is_resolved: false
      }
    });

    for (const existingIssue of existingIssues) {
      if (!currentIssueTypes.has(existingIssue.issue_type)) {
        await existingIssue.markAsResolved();
      }
    }
  }

  // Check alerts
  async checkAlerts(website) {
    logger.debug(`Checking alerts for website ${website.domain}`);
    
    const Alert = require('../models/Settings'); // Alert model is in Settings file
    const alerts = await Alert.findActive(website.user_id, website.id);

    for (const alert of alerts) {
      try {
        const shouldTrigger = await this.evaluateAlert(alert, website);
        
        if (shouldTrigger) {
          await this.triggerAlert(alert, website);
        }
      } catch (error) {
        logger.error(`Failed to evaluate alert ${alert.id}:`, error);
      }
    }
  }

  // Evaluate alert condition
  async evaluateAlert(alert, website) {
    // Get current value based on alert type
    let currentValue;
    
    switch (alert.condition_type) {
      case 'keyword_position_drop':
        // Check if any keyword dropped significantly
        const Keyword = require('../models/Keyword');
        const droppedKeywords = await Keyword.findAll({
          where: {
            website_id: website.id,
            status: 'active',
            [sequelize.Op.and]: [
              { previous_position: { [sequelize.Op.not]: null } },
              { current_position: { [sequelize.Op.not]: null } },
              sequelize.literal(`current_position - previous_position > ${alert.condition_value.value}`)
            ]
          }
        });
        return droppedKeywords.length > 0;

      case 'traffic_drop':
        // Check if traffic dropped
        const recentAnalytics = await AnalyticsData.getDailyData(website.id, 7);
        if (recentAnalytics.length >= 7) {
          const lastWeek = recentAnalytics.slice(0, 3).reduce((sum, d) => sum + d.visitors, 0) / 3;
          const previousWeek = recentAnalytics.slice(4, 7).reduce((sum, d) => sum + d.visitors, 0) / 3;
          const dropPercentage = ((previousWeek - lastWeek) / previousWeek) * 100;
          return dropPercentage > alert.condition_value.value;
        }
        return false;

      default:
        return false;
    }
  }

  // Trigger alert
  async triggerAlert(alert, website) {
    logger.info(`Triggering alert ${alert.alert_name} for website ${website.domain}`);
    
    await alert.markAsTriggered();

    // Queue notification
    await addJob('notifications', {
      alertId: alert.id,
      websiteId: website.id,
      type: alert.alert_type,
      alertName: alert.alert_name,
      websiteName: website.name
    });
  }

  // Send summary report
  async sendSummaryReport(results) {
    logger.info('Sending daily analysis summary report');
    
    // Queue email job for admins
    await addJob('email', {
      to: process.env.ADMIN_EMAIL,
      subject: 'Daily Analysis Summary',
      template: 'daily-analysis-summary',
      data: {
        date: new Date().toISOString().split('T')[0],
        results
      }
    });
  }
}

// Create instance
const dailyAnalysis = new DailyAnalysis();

// Run if called directly
if (require.main === module) {
  dailyAnalysis.runDailyAnalysis()
    .then(() => {
      logger.info('Daily analysis script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Daily analysis script failed:', error);
      process.exit(1);
    });
}

module.exports = dailyAnalysis;