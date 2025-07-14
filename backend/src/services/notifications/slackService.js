const axios = require('axios');
const { WebClient } = require('@slack/web-api');
const { IncomingWebhook } = require('@slack/webhook');
const logger = require('../../utils/logger');
const cache = require('../../utils/cache');

class SlackService {
  constructor() {
    this.webhook = null;
    this.webClient = null;
    this.initialized = false;
    this.channelCache = new Map();
    this.initialize();
  }

  /**
   * Initialize Slack clients
   */
  initialize() {
    try {
      // Initialize webhook for simple notifications
      if (process.env.SLACK_WEBHOOK_URL) {
        this.webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
      }

      // Initialize Web API client for advanced features
      if (process.env.SLACK_BOT_TOKEN) {
        this.webClient = new WebClient(process.env.SLACK_BOT_TOKEN);
      }

      this.initialized = !!(this.webhook || this.webClient);
      
      if (this.initialized) {
        logger.info('Slack service initialized successfully');
      } else {
        logger.warn('Slack service not configured - missing webhook URL or bot token');
      }
    } catch (error) {
      logger.error('Failed to initialize Slack service:', error);
      this.initialized = false;
    }
  }

  /**
   * Send simple notification via webhook
   */
  async sendNotification(message, options = {}) {
    if (!this.webhook) {
      logger.warn('Slack webhook not configured');
      return { success: false, error: 'Webhook not configured' };
    }

    try {
      const payload = typeof message === 'string' 
        ? { text: message, ...options }
        : { ...message, ...options };

      // Add default channel if specified
      if (process.env.SLACK_CHANNEL && !payload.channel) {
        payload.channel = process.env.SLACK_CHANNEL;
      }

      await this.webhook.send(payload);
      
      logger.info('Slack notification sent successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send rich message with blocks
   */
  async sendRichMessage(channel, blocks, options = {}) {
    if (!this.webClient) {
      return this.sendNotification({
        channel,
        blocks,
        ...options,
      });
    }

    try {
      const result = await this.webClient.chat.postMessage({
        channel: channel || process.env.SLACK_CHANNEL,
        blocks,
        ...options,
      });

      logger.info('Rich Slack message sent', { 
        channel: result.channel, 
        ts: result.ts 
      });

      return { 
        success: true, 
        messageId: result.ts,
        channel: result.channel,
      };
    } catch (error) {
      logger.error('Failed to send rich Slack message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SEO alert
   */
  async sendSEOAlert(alertType, data) {
    const alerts = {
      ranking_drop: {
        color: 'danger',
        emoji: '📉',
        title: 'Ranking Drop Alert',
      },
      ranking_improvement: {
        color: 'good',
        emoji: '📈',
        title: 'Ranking Improvement',
      },
      technical_issue: {
        color: 'warning',
        emoji: '⚠️',
        title: 'Technical SEO Issue',
      },
      competitor_change: {
        color: 'warning',
        emoji: '👀',
        title: 'Competitor Update',
      },
      site_down: {
        color: 'danger',
        emoji: '🚨',
        title: 'Website Down',
      },
      performance_issue: {
        color: 'warning',
        emoji: '🐌',
        title: 'Performance Issue',
      },
    };

    const alert = alerts[alertType] || {
      color: 'warning',
      emoji: '📢',
      title: 'SEO Alert',
    };

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${alert.emoji} ${alert.title}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: data.message || 'An SEO alert has been triggered.',
        },
      },
    ];

    // Add fields if provided
    if (data.fields && data.fields.length > 0) {
      blocks.push({
        type: 'section',
        fields: data.fields.map(field => ({
          type: 'mrkdwn',
          text: `*${field.title}:*\n${field.value}`,
        })),
      });
    }

    // Add context
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🌐 *Domain:* ${data.domain || 'N/A'} | ⏰ *Time:* ${new Date().toLocaleString()}`,
        },
      ],
    });

    // Add actions if provided
    if (data.actions && data.actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: data.actions.map(action => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.text,
          },
          url: action.url,
          style: action.style || 'primary',
        })),
      });
    }

    // Send as attachment for color coding
    return this.sendNotification({
      attachments: [{
        color: alert.color,
        blocks,
      }],
    });
  }

  /**
   * Send keyword ranking update
   */
  async sendKeywordUpdate(keywords) {
    const improved = keywords.filter(k => k.change > 0);
    const declined = keywords.filter(k => k.change < 0);
    const unchanged = keywords.filter(k => k.change === 0);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 Daily Keyword Ranking Update',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:* ${improved.length} improved, ${declined.length} declined, ${unchanged.length} unchanged`,
        },
      },
    ];

    // Add top improvements
    if (improved.length > 0) {
      const topImproved = improved
        .sort((a, b) => b.change - a.change)
        .slice(0, 5);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📈 Top Improvements:*',
        },
      });

      topImproved.forEach(keyword => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${keyword.keyword}*: Position ${keyword.previousPosition} → ${keyword.currentPosition} (↑${keyword.change})`,
          },
        });
      });
    }

    // Add top declines
    if (declined.length > 0) {
      const topDeclined = declined
        .sort((a, b) => a.change - b.change)
        .slice(0, 5);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📉 Top Declines:*',
        },
      });

      topDeclined.forEach(keyword => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${keyword.keyword}*: Position ${keyword.previousPosition} → ${keyword.currentPosition} (↓${Math.abs(keyword.change)})`,
          },
        });
      });
    }

    // Add action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Full Report',
          },
          url: `${process.env.APP_URL}/keywords`,
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Export Data',
          },
          url: `${process.env.APP_URL}/keywords/export`,
        },
      ],
    });

    return this.sendRichMessage(null, blocks);
  }

  /**
   * Send technical SEO report
   */
  async sendTechnicalReport(issues) {
    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const medium = issues.filter(i => i.severity === 'medium');
    const low = issues.filter(i => i.severity === 'low');

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔧 Technical SEO Report',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*🔴 Critical:* ${critical.length}`,
          },
          {
            type: 'mrkdwn',
            text: `*🟠 High:* ${high.length}`,
          },
          {
            type: 'mrkdwn',
            text: `*🟡 Medium:* ${medium.length}`,
          },
          {
            type: 'mrkdwn',
            text: `*🟢 Low:* ${low.length}`,
          },
        ],
      },
    ];

    // Add critical issues
    if (critical.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🔴 Critical Issues (Immediate action required):*',
        },
      });

      critical.slice(0, 3).forEach(issue => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${issue.title}*\n  ${issue.description}\n  _Affected: ${issue.affectedPages} pages_`,
          },
        });
      });
    }

    // Add summary chart (using emoji as visual)
    const total = issues.length;
    const criticalPercent = Math.round((critical.length / total) * 10);
    const highPercent = Math.round((high.length / total) * 10);
    const chart = '🔴'.repeat(criticalPercent) + 
                  '🟠'.repeat(highPercent) + 
                  '🟡'.repeat(10 - criticalPercent - highPercent);

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Issue Distribution:*\n${chart}`,
      },
    });

    // Add action button
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View All Issues',
          },
          url: `${process.env.APP_URL}/technical`,
          style: critical.length > 0 ? 'danger' : 'primary',
        },
      ],
    });

    return this.sendRichMessage(null, blocks);
  }

  /**
   * Send competitor alert
   */
  async sendCompetitorAlert(competitor, changes) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '👀 Competitor Activity Detected',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Competitor:* ${competitor.name} (${competitor.domain})`,
        },
      },
    ];

    // Add changes
    if (changes.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Changes Detected:*',
        },
      });

      changes.forEach(change => {
        let emoji = '•';
        if (change.type === 'ranking_improvement') emoji = '📈';
        else if (change.type === 'new_content') emoji = '📝';
        else if (change.type === 'backlink') emoji = '🔗';
        else if (change.type === 'technical') emoji = '🔧';

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} ${change.description}`,
          },
        });
      });
    }

    // Add comparison data
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Their Position:* ${competitor.averagePosition}`,
        },
        {
          type: 'mrkdwn',
          text: `*Your Position:* ${competitor.yourPosition}`,
        },
      ],
    });

    // Add action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Analysis',
          },
          url: `${process.env.APP_URL}/competitors/${competitor.id}`,
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Compare Keywords',
          },
          url: `${process.env.APP_URL}/competitors/${competitor.id}/keywords`,
        },
      ],
    });

    return this.sendRichMessage(null, blocks);
  }

  /**
   * Send performance alert
   */
  async sendPerformanceAlert(metrics) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚀 Website Performance Update',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Overall Score:* ${metrics.score}/100 ${this.getScoreEmoji(metrics.score)}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*⚡ Speed Index:* ${metrics.speedIndex}ms`,
          },
          {
            type: 'mrkdwn',
            text: `*📱 Mobile Score:* ${metrics.mobileScore}/100`,
          },
          {
            type: 'mrkdwn',
            text: `*🖥️ Desktop Score:* ${metrics.desktopScore}/100`,
          },
          {
            type: 'mrkdwn',
            text: `*📊 Core Web Vitals:* ${metrics.coreWebVitals}`,
          },
        ],
      },
    ];

    // Add recommendations
    if (metrics.recommendations && metrics.recommendations.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*💡 Top Recommendations:*',
        },
      });

      metrics.recommendations.slice(0, 3).forEach(rec => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• ${rec.title} _(Impact: ${rec.impact})_`,
          },
        });
      });
    }

    return this.sendRichMessage(null, blocks);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(data) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📅 Daily SEO Summary',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Date:* ${new Date().toLocaleDateString()}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📊 Key Metrics:*',
        },
        fields: [
          {
            type: 'mrkdwn',
            text: `*Organic Traffic:* ${data.traffic.toLocaleString()} (${data.trafficChange > 0 ? '+' : ''}${data.trafficChange}%)`,
          },
          {
            type: 'mrkdwn',
            text: `*Keywords Tracked:* ${data.keywordsTracked}`,
          },
          {
            type: 'mrkdwn',
            text: `*Avg. Position:* ${data.avgPosition.toFixed(1)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Pages Indexed:* ${data.pagesIndexed}`,
          },
        ],
      },
    ];

    // Add highlights
    if (data.highlights && data.highlights.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*✨ Highlights:*',
        },
      });

      data.highlights.forEach(highlight => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• ${highlight}`,
          },
        });
      });
    }

    // Add action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Dashboard',
          },
          url: `${process.env.APP_URL}/dashboard`,
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Download Report',
          },
          url: `${process.env.APP_URL}/reports/daily/${new Date().toISOString().split('T')[0]}`,
        },
      ],
    });

    return this.sendRichMessage(null, blocks);
  }

  /**
   * Send interactive message
   */
  async sendInteractiveMessage(channel, message) {
    if (!this.webClient) {
      logger.warn('Slack Web API not configured for interactive messages');
      return { success: false, error: 'Web API not configured' };
    }

    try {
      const result = await this.webClient.chat.postMessage({
        channel: channel || process.env.SLACK_CHANNEL,
        ...message,
      });

      return {
        success: true,
        messageId: result.ts,
        channel: result.channel,
      };
    } catch (error) {
      logger.error('Failed to send interactive message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update existing message
   */
  async updateMessage(channel, messageId, updates) {
    if (!this.webClient) {
      logger.warn('Slack Web API not configured for message updates');
      return { success: false, error: 'Web API not configured' };
    }

    try {
      const result = await this.webClient.chat.update({
        channel,
        ts: messageId,
        ...updates,
      });

      return {
        success: true,
        messageId: result.ts,
      };
    } catch (error) {
      logger.error('Failed to update message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload file to Slack
   */
  async uploadFile(channels, file, options = {}) {
    if (!this.webClient) {
      logger.warn('Slack Web API not configured for file uploads');
      return { success: false, error: 'Web API not configured' };
    }

    try {
      const result = await this.webClient.files.upload({
        channels: Array.isArray(channels) ? channels.join(',') : channels,
        file,
        ...options,
      });

      return {
        success: true,
        fileId: result.file.id,
        permalink: result.file.permalink,
      };
    } catch (error) {
      logger.error('Failed to upload file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get score emoji based on value
   */
  getScoreEmoji(score) {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  /**
   * Test Slack configuration
   */
  async testConfiguration() {
    try {
      const result = await this.sendNotification({
        text: '✅ Slack integration test successful!',
        attachments: [{
          color: 'good',
          fields: [
            {
              title: 'Environment',
              value: process.env.NODE_ENV,
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true,
            },
          ],
        }],
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new SlackService();