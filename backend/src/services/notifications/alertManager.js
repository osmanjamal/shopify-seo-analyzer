const EventEmitter = require('events');
const emailService = require('./emailService');
const slackService = require('./slackService');
const logger = require('../../utils/logger');
const cache = require('../../utils/cache');
const { Settings } = require('../../models');

class AlertManager extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map();
    this.rules = new Map();
    this.history = [];
    this.rateLimiter = new Map();
    this.initialize();
  }

  /**
   * Initialize alert manager
   */
  async initialize() {
    try {
      // Load alert rules from database or config
      await this.loadAlertRules();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start monitoring
      this.startMonitoring();
      
      logger.info('Alert Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Alert Manager:', error);
    }
  }

  /**
   * Load alert rules from configuration
   */
  async loadAlertRules() {
    // Default alert rules
    const defaultRules = [
      {
        id: 'ranking_drop',
        name: 'Keyword Ranking Drop',
        description: 'Alert when keyword ranking drops significantly',
        conditions: {
          type: 'ranking_change',
          threshold: -5,
          comparison: 'less_than',
        },
        actions: ['email', 'slack'],
        severity: 'high',
        cooldown: 3600, // 1 hour
        enabled: true,
      },
      {
        id: 'traffic_drop',
        name: 'Traffic Drop',
        description: 'Alert when organic traffic drops',
        conditions: {
          type: 'traffic_change',
          threshold: -20,
          comparison: 'percent_less_than',
          timeframe: 'day',
        },
        actions: ['email', 'slack'],
        severity: 'high',
        cooldown: 86400, // 24 hours
        enabled: true,
      },
      {
        id: 'site_down',
        name: 'Website Down',
        description: 'Alert when website is not accessible',
        conditions: {
          type: 'uptime',
          threshold: false,
        },
        actions: ['email', 'slack', 'sms'],
        severity: 'critical',
        cooldown: 300, // 5 minutes
        enabled: true,
      },
      {
        id: 'ssl_expiring',
        name: 'SSL Certificate Expiring',
        description: 'Alert when SSL certificate is about to expire',
        conditions: {
          type: 'ssl_expiry',
          threshold: 30, // days
          comparison: 'less_than',
        },
        actions: ['email'],
        severity: 'medium',
        cooldown: 86400, // 24 hours
        enabled: true,
      },
      {
        id: 'crawl_errors',
        name: 'Crawl Errors',
        description: 'Alert when new crawl errors are detected',
        conditions: {
          type: 'crawl_errors',
          threshold: 10,
          comparison: 'greater_than',
        },
        actions: ['email', 'slack'],
        severity: 'medium',
        cooldown: 43200, // 12 hours
        enabled: true,
      },
      {
        id: 'competitor_outranking',
        name: 'Competitor Outranking',
        description: 'Alert when competitor outranks you',
        conditions: {
          type: 'competitor_position',
          comparison: 'better_than',
        },
        actions: ['email', 'slack'],
        severity: 'medium',
        cooldown: 86400, // 24 hours
        enabled: true,
      },
      {
        id: 'page_speed_degradation',
        name: 'Page Speed Degradation',
        description: 'Alert when page speed score drops',
        conditions: {
          type: 'page_speed',
          threshold: 70,
          comparison: 'less_than',
        },
        actions: ['email', 'slack'],
        severity: 'medium',
        cooldown: 43200, // 12 hours
        enabled: true,
      },
      {
        id: 'security_issue',
        name: 'Security Issue',
        description: 'Alert when security issue is detected',
        conditions: {
          type: 'security',
          severity: ['high', 'critical'],
        },
        actions: ['email', 'slack', 'sms'],
        severity: 'critical',
        cooldown: 0, // No cooldown for security issues
        enabled: true,
      },
    ];

    // Load custom rules from database
    try {
      const customRules = await Settings.getAlertRules();
      const allRules = [...defaultRules, ...customRules];
      
      allRules.forEach(rule => {
        this.rules.set(rule.id, rule);
      });
      
      logger.info(`Loaded ${this.rules.size} alert rules`);
    } catch (error) {
      // Use default rules if database fails
      defaultRules.forEach(rule => {
        this.rules.set(rule.id, rule);
      });
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for various events
    this.on('ranking:change', data => this.checkRankingAlerts(data));
    this.on('traffic:update', data => this.checkTrafficAlerts(data));
    this.on('uptime:check', data => this.checkUptimeAlerts(data));
    this.on('ssl:check', data => this.checkSSLAlerts(data));
    this.on('crawl:complete', data => this.checkCrawlAlerts(data));
    this.on('competitor:update', data => this.checkCompetitorAlerts(data));
    this.on('performance:update', data => this.checkPerformanceAlerts(data));
    this.on('security:scan', data => this.checkSecurityAlerts(data));
  }

  /**
   * Start monitoring services
   */
  startMonitoring() {
    // Periodic checks can be implemented here
    // This is a placeholder for monitoring logic
  }

  /**
   * Trigger alert
   */
  async triggerAlert(ruleId, data) {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) {
      return;
    }

    // Check rate limiting
    if (this.isRateLimited(ruleId, rule.cooldown)) {
      logger.debug(`Alert ${ruleId} is rate limited`);
      return;
    }

    // Create alert object
    const alert = {
      id: `${ruleId}_${Date.now()}`,
      ruleId,
      ruleName: rule.name,
      severity: rule.severity,
      timestamp: new Date(),
      data,
      status: 'triggered',
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.history.push(alert);

    // Execute actions
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert, rule);
      } catch (error) {
        logger.error(`Failed to execute ${action} action for alert ${ruleId}:`, error);
      }
    }

    // Update rate limiter
    this.rateLimiter.set(ruleId, Date.now());

    logger.info(`Alert triggered: ${rule.name}`, {
      ruleId,
      severity: rule.severity,
      actions: rule.actions,
    });
  }

  /**
   * Execute alert action
   */
  async executeAction(action, alert, rule) {
    const recipients = await this.getRecipients(rule, action);

    switch (action) {
      case 'email':
        await this.sendEmailAlert(alert, rule, recipients);
        break;
      
      case 'slack':
        await this.sendSlackAlert(alert, rule);
        break;
      
      case 'sms':
        await this.sendSMSAlert(alert, rule, recipients);
        break;
      
      case 'webhook':
        await this.sendWebhookAlert(alert, rule);
        break;
      
      case 'dashboard':
        await this.createDashboardNotification(alert, rule);
        break;
      
      default:
        logger.warn(`Unknown alert action: ${action}`);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert, rule, recipients) {
    const emailData = {
      to: recipients.email || process.env.EMAIL_ADMIN,
      subject: `[${alert.severity.toUpperCase()}] ${rule.name}`,
      template: 'alert',
      data: {
        alertName: rule.name,
        description: rule.description,
        severity: alert.severity,
        timestamp: alert.timestamp,
        details: alert.data,
        actionUrl: `${process.env.APP_URL}/alerts/${alert.id}`,
      },
      priority: alert.severity === 'critical' ? 'high' : 'normal',
    };

    await emailService.sendNotificationEmail('alert', emailData.to, emailData.data);
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(alert, rule) {
    const slackData = {
      alertType: rule.id,
      message: rule.description,
      severity: alert.severity,
      timestamp: alert.timestamp,
      ...alert.data,
      actions: [
        {
          text: 'View Details',
          url: `${process.env.APP_URL}/alerts/${alert.id}`,
        },
        {
          text: 'Acknowledge',
          url: `${process.env.APP_URL}/api/alerts/${alert.id}/acknowledge`,
        },
      ],
    };

    await slackService.sendSEOAlert(rule.id, slackData);
  }

  /**
   * Send SMS alert
   */
  async sendSMSAlert(alert, rule, recipients) {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      logger.warn('SMS alerts not configured - missing Twilio credentials');
      return;
    }

    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = `[${alert.severity.toUpperCase()}] ${rule.name}: ${rule.description}. Check ${process.env.APP_URL} for details.`;

    const phoneNumbers = recipients.sms || [process.env.ALERT_PHONE_NUMBER];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        await twilio.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber,
        });
      } catch (error) {
        logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      }
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert, rule) {
    const webhookUrl = rule.webhookUrl || process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn('Webhook URL not configured for alert');
      return;
    }

    const axios = require('axios');
    
    try {
      await axios.post(webhookUrl, {
        alert: {
          id: alert.id,
          rule: rule.name,
          severity: alert.severity,
          timestamp: alert.timestamp,
          data: alert.data,
        },
        metadata: {
          app: process.env.APP_NAME,
          environment: process.env.NODE_ENV,
        },
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Signature': this.generateWebhookSignature(alert),
        },
      });
    } catch (error) {
      logger.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Create dashboard notification
   */
  async createDashboardNotification(alert, rule) {
    // Store notification in database for dashboard display
    const Notification = require('../../models/Notification');
    
    await Notification.create({
      type: 'alert',
      title: rule.name,
      message: rule.description,
      severity: alert.severity,
      data: alert.data,
      read: false,
      alertId: alert.id,
    });
  }

  /**
   * Check ranking alerts
   */
  async checkRankingAlerts(data) {
    const rule = this.rules.get('ranking_drop');
    if (!rule || !rule.enabled) return;

    for (const keyword of data.keywords) {
      if (keyword.change < rule.conditions.threshold) {
        await this.triggerAlert('ranking_drop', {
          keyword: keyword.keyword,
          previousPosition: keyword.previousPosition,
          currentPosition: keyword.currentPosition,
          change: keyword.change,
          domain: data.domain,
        });
      }
    }
  }

  /**
   * Check traffic alerts
   */
  async checkTrafficAlerts(data) {
    const rule = this.rules.get('traffic_drop');
    if (!rule || !rule.enabled) return;

    const percentChange = ((data.current - data.previous) / data.previous) * 100;
    
    if (percentChange < rule.conditions.threshold) {
      await this.triggerAlert('traffic_drop', {
        currentTraffic: data.current,
        previousTraffic: data.previous,
        percentChange,
        period: data.period,
        domain: data.domain,
      });
    }
  }

  /**
   * Check uptime alerts
   */
  async checkUptimeAlerts(data) {
    const rule = this.rules.get('site_down');
    if (!rule || !rule.enabled) return;

    if (!data.isUp) {
      await this.triggerAlert('site_down', {
        domain: data.domain,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        error: data.error,
        downSince: data.downSince,
      });
    }
  }

  /**
   * Check SSL alerts
   */
  async checkSSLAlerts(data) {
    const rule = this.rules.get('ssl_expiring');
    if (!rule || !rule.enabled) return;

    if (data.daysUntilExpiry < rule.conditions.threshold) {
      await this.triggerAlert('ssl_expiring', {
        domain: data.domain,
        expiryDate: data.expiryDate,
        daysUntilExpiry: data.daysUntilExpiry,
        issuer: data.issuer,
      });
    }
  }

  /**
   * Check crawl alerts
   */
  async checkCrawlAlerts(data) {
    const rule = this.rules.get('crawl_errors');
    if (!rule || !rule.enabled) return;

    if (data.errorCount > rule.conditions.threshold) {
      await this.triggerAlert('crawl_errors', {
        domain: data.domain,
        errorCount: data.errorCount,
        errors: data.errors.slice(0, 10), // First 10 errors
        crawlDate: data.crawlDate,
      });
    }
  }

  /**
   * Check competitor alerts
   */
  async checkCompetitorAlerts(data) {
    const rule = this.rules.get('competitor_outranking');
    if (!rule || !rule.enabled) return;

    for (const comparison of data.comparisons) {
      if (comparison.competitorPosition < comparison.yourPosition) {
        await this.triggerAlert('competitor_outranking', {
          competitor: comparison.competitor,
          keyword: comparison.keyword,
          yourPosition: comparison.yourPosition,
          competitorPosition: comparison.competitorPosition,
          difference: comparison.yourPosition - comparison.competitorPosition,
        });
      }
    }
  }

  /**
   * Check performance alerts
   */
  async checkPerformanceAlerts(data) {
    const rule = this.rules.get('page_speed_degradation');
    if (!rule || !rule.enabled) return;

    if (data.score < rule.conditions.threshold) {
      await this.triggerAlert('page_speed_degradation', {
        url: data.url,
        score: data.score,
        previousScore: data.previousScore,
        metrics: data.metrics,
        recommendations: data.recommendations,
      });
    }
  }

  /**
   * Check security alerts
   */
  async checkSecurityAlerts(data) {
    const rule = this.rules.get('security_issue');
    if (!rule || !rule.enabled) return;

    const criticalIssues = data.issues.filter(issue => 
      rule.conditions.severity.includes(issue.severity)
    );

    if (criticalIssues.length > 0) {
      await this.triggerAlert('security_issue', {
        issueCount: criticalIssues.length,
        issues: criticalIssues,
        scanDate: data.scanDate,
        domain: data.domain,
      });
    }
  }

  /**
   * Get recipients for alert
   */
  async getRecipients(rule, action) {
    try {
      const settings = await Settings.getAlertRecipients(rule.id, action);
      return settings || {
        email: [process.env.EMAIL_ADMIN],
        slack: process.env.SLACK_CHANNEL,
        sms: [process.env.ALERT_PHONE_NUMBER],
      };
    } catch (error) {
      return {
        email: [process.env.EMAIL_ADMIN],
        slack: process.env.SLACK_CHANNEL,
        sms: [process.env.ALERT_PHONE_NUMBER],
      };
    }
  }

  /**
   * Check if alert is rate limited
   */
  isRateLimited(ruleId, cooldown) {
    if (!cooldown) return false;
    
    const lastTrigger = this.rateLimiter.get(ruleId);
    if (!lastTrigger) return false;
    
    return Date.now() - lastTrigger < cooldown * 1000;
  }

  /**
   * Generate webhook signature
   */
  generateWebhookSignature(alert) {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(alert))
      .digest('hex');
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId) {
    return this.alerts.get(alertId);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    // Update in database if persisted
    logger.info(`Alert ${alertId} acknowledged by user ${userId}`);
    
    return alert;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, userId, resolution) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;

    // Update in database if persisted
    logger.info(`Alert ${alertId} resolved by user ${userId}`);
    
    return alert;
  }

  /**
   * Get alert history
   */
  getAlertHistory(filters = {}) {
    let history = [...this.history];

    // Apply filters
    if (filters.severity) {
      history = history.filter(alert => alert.severity === filters.severity);
    }
    
    if (filters.ruleId) {
      history = history.filter(alert => alert.ruleId === filters.ruleId);
    }
    
    if (filters.status) {
      history = history.filter(alert => alert.status === filters.status);
    }
    
    if (filters.startDate) {
      history = history.filter(alert => 
        new Date(alert.timestamp) >= new Date(filters.startDate)
      );
    }
    
    if (filters.endDate) {
      history = history.filter(alert => 
        new Date(alert.timestamp) <= new Date(filters.endDate)
      );
    }

    // Sort by timestamp descending
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      alerts: history.slice(start, end),
      total: history.length,
      page,
      limit,
      pages: Math.ceil(history.length / limit),
    };
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(ruleId, updates) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    // Update rule
    Object.assign(rule, updates);
    this.rules.set(ruleId, rule);

    // Persist to database
    await Settings.updateAlertRule(ruleId, updates);

    logger.info(`Alert rule ${ruleId} updated`);
    
    return rule;
  }

  /**
   * Create custom alert rule
   */
  async createAlertRule(ruleData) {
    const rule = {
      id: `custom_${Date.now()}`,
      ...ruleData,
      custom: true,
    };

    this.rules.set(rule.id, rule);

    // Persist to database
    await Settings.createAlertRule(rule);

    logger.info(`Custom alert rule ${rule.id} created`);
    
    return rule;
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.custom) {
      throw new Error('Cannot delete non-custom alert rule');
    }

    this.rules.delete(ruleId);

    // Remove from database
    await Settings.deleteAlertRule(ruleId);

    logger.info(`Alert rule ${ruleId} deleted`);
  }

  /**
   * Test alert rule
   */
  async testAlertRule(ruleId, testData) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    // Temporarily disable rate limiting for test
    const originalCooldown = rule.cooldown;
    rule.cooldown = 0;

    try {
      await this.triggerAlert(ruleId, testData || {
        test: true,
        message: 'This is a test alert',
        timestamp: new Date(),
      });
      
      return { success: true, message: 'Test alert sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      rule.cooldown = originalCooldown;
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(timeframe = '24h') {
    const now = Date.now();
    const timeframes = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };
    
    const duration = timeframes[timeframe] || timeframes['24h'];
    const startTime = now - duration;

    const recentAlerts = this.history.filter(alert => 
      new Date(alert.timestamp).getTime() > startTime
    );

    const stats = {
      total: recentAlerts.length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      byStatus: {
        triggered: 0,
        acknowledged: 0,
        resolved: 0,
      },
      byRule: {},
      averageResponseTime: 0,
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    recentAlerts.forEach(alert => {
      // Count by severity
      stats.bySeverity[alert.severity]++;
      
      // Count by status
      stats.byStatus[alert.status]++;
      
      // Count by rule
      stats.byRule[alert.ruleId] = (stats.byRule[alert.ruleId] || 0) + 1;
      
      // Calculate response time
      if (alert.acknowledgedAt) {
        const responseTime = new Date(alert.acknowledgedAt) - new Date(alert.timestamp);
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    if (responseCount > 0) {
      stats.averageResponseTime = Math.round(totalResponseTime / responseCount / 60000); // in minutes
    }

    return stats;
  }
}

// Export singleton instance
module.exports = new AlertManager();