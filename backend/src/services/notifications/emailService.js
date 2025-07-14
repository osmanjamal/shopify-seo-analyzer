const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');
const logger = require('../../utils/logger');
const { encrypt, decrypt } = require('../../utils/encryption');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initialized = false;
    this.initializeTransporter();
    this.loadTemplates();
  }

  /**
   * Initialize email transporter
   */
  async initializeTransporter() {
    try {
      // Create transporter based on environment
      if (process.env.NODE_ENV === 'test') {
        // Use Ethereal email for testing
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } else {
        // Production transporter
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT, 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 5,
        });
      }

      // Verify transporter configuration
      await this.transporter.verify();
      this.initialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  /**
   * Load email templates
   */
  async loadTemplates() {
    try {
      const templateDir = process.env.EMAIL_TEMPLATE_DIR || path.join(__dirname, '../../../templates/emails');
      const templateFiles = await fs.readdir(templateDir);

      for (const file of templateFiles) {
        if (file.endsWith('.hbs') || file.endsWith('.html')) {
          const templateName = path.basename(file, path.extname(file));
          const templatePath = path.join(templateDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          
          // Compile template
          const compiledTemplate = handlebars.compile(templateContent);
          this.templates.set(templateName, compiledTemplate);
        }
      }

      // Register Handlebars helpers
      this.registerHelpers();

      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
  }

  /**
   * Register Handlebars helpers
   */
  registerHelpers() {
    // Date formatter
    handlebars.registerHelper('formatDate', (date, format) => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      }
      return d.toLocaleString();
    });

    // Number formatter
    handlebars.registerHelper('formatNumber', (number) => {
      return new Intl.NumberFormat().format(number);
    });

    // Percentage formatter
    handlebars.registerHelper('formatPercent', (value) => {
      return `${(value * 100).toFixed(2)}%`;
    });

    // Conditional helper
    handlebars.registerHelper('ifEquals', (a, b, options) => {
      return a === b ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Send email
   */
  async sendEmail({
    to,
    cc,
    bcc,
    subject,
    template,
    data = {},
    attachments = [],
    priority = 'normal',
    replyTo,
  }) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      // Get template
      let html;
      if (template) {
        const compiledTemplate = this.templates.get(template);
        if (!compiledTemplate) {
          throw new Error(`Email template '${template}' not found`);
        }
        html = compiledTemplate(data);
      } else if (data.html) {
        html = data.html;
      } else {
        throw new Error('No template or HTML content provided');
      }

      // Prepare email options
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: Array.isArray(to) ? to.join(', ') : to,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        subject,
        html,
        text: data.text || this.htmlToText(html),
        attachments,
        priority,
        replyTo: replyTo || process.env.EMAIL_SUPPORT,
        headers: {
          'X-App-Name': process.env.APP_NAME,
          'X-Environment': process.env.NODE_ENV,
        },
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      // Log email sent
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to,
        subject,
        template,
      });

      // Get test URL for development
      if (process.env.NODE_ENV === 'test') {
        const testUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`Preview URL: ${testUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        preview: nodemailer.getTestMessageUrl(info),
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emails) {
    const results = [];
    const chunks = this.chunkArray(emails, 10); // Process 10 emails at a time

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(email => this.sendEmail(email))
      );
      results.push(...chunkResults);
      
      // Rate limiting
      await this.delay(1000);
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk email completed: ${successful} sent, ${failed} failed`);

    return {
      total: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Send notification emails
   */
  async sendNotificationEmail(type, recipient, data) {
    const notifications = {
      welcome: {
        subject: 'Welcome to Shopify SEO Analyzer!',
        template: 'welcome',
      },
      password_reset: {
        subject: 'Reset Your Password',
        template: 'password-reset',
      },
      ranking_alert: {
        subject: 'Keyword Ranking Alert',
        template: 'ranking-alert',
      },
      weekly_report: {
        subject: 'Your Weekly SEO Report',
        template: 'weekly-report',
      },
      technical_issue: {
        subject: 'Technical SEO Issues Detected',
        template: 'technical-issues',
      },
      competitor_alert: {
        subject: 'Competitor Activity Alert',
        template: 'competitor-alert',
      },
      payment_success: {
        subject: 'Payment Successful',
        template: 'payment-success',
      },
      payment_failed: {
        subject: 'Payment Failed',
        template: 'payment-failed',
      },
      trial_ending: {
        subject: 'Your Trial is Ending Soon',
        template: 'trial-ending',
      },
      data_export: {
        subject: 'Your Data Export is Ready',
        template: 'data-export',
      },
    };

    const notification = notifications[type];
    if (!notification) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    return this.sendEmail({
      to: recipient,
      subject: notification.subject,
      template: notification.template,
      data,
    });
  }

  /**
   * Send report email with attachments
   */
  async sendReportEmail(recipient, reportType, reportData, attachments = []) {
    const reportConfig = {
      seo_audit: {
        subject: 'SEO Audit Report',
        template: 'seo-audit-report',
      },
      keyword_performance: {
        subject: 'Keyword Performance Report',
        template: 'keyword-report',
      },
      competitor_analysis: {
        subject: 'Competitor Analysis Report',
        template: 'competitor-report',
      },
      monthly_summary: {
        subject: 'Monthly SEO Summary',
        template: 'monthly-summary',
      },
    };

    const config = reportConfig[reportType];
    if (!config) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    // Add PDF attachment if not already included
    if (!attachments.some(a => a.filename.endsWith('.pdf'))) {
      // Generate PDF report (placeholder)
      attachments.push({
        filename: `${reportType}_${Date.now()}.pdf`,
        content: Buffer.from('PDF report content'), // Actual PDF generation would go here
        contentType: 'application/pdf',
      });
    }

    return this.sendEmail({
      to: recipient,
      subject: config.subject,
      template: config.template,
      data: reportData,
      attachments,
    });
  }

  /**
   * Send alert emails based on conditions
   */
  async sendAlertEmail(alertType, recipients, data) {
    const alerts = {
      ranking_drop: {
        subject: '⚠️ Significant Ranking Drop Detected',
        template: 'alert-ranking-drop',
        priority: 'high',
      },
      site_down: {
        subject: '🚨 Website Down Alert',
        template: 'alert-site-down',
        priority: 'high',
      },
      ssl_expiring: {
        subject: '🔒 SSL Certificate Expiring Soon',
        template: 'alert-ssl-expiring',
        priority: 'high',
      },
      quota_exceeded: {
        subject: '📊 API Quota Exceeded',
        template: 'alert-quota-exceeded',
        priority: 'normal',
      },
      security_issue: {
        subject: '🛡️ Security Issue Detected',
        template: 'alert-security',
        priority: 'high',
      },
    };

    const alert = alerts[alertType];
    if (!alert) {
      throw new Error(`Unknown alert type: ${alertType}`);
    }

    return this.sendEmail({
      to: recipients,
      subject: alert.subject,
      template: alert.template,
      data,
      priority: alert.priority,
    });
  }

  /**
   * Queue email for later sending
   */
  async queueEmail(emailData, scheduledTime = null) {
    const Queue = require('bull');
    const emailQueue = new Queue('email', process.env.QUEUE_REDIS_URL);

    const job = await emailQueue.add('send-email', emailData, {
      delay: scheduledTime ? new Date(scheduledTime) - new Date() : 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    logger.info(`Email queued with job ID: ${job.id}`);
    return job.id;
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Chunk array into smaller arrays
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      
      const testResult = await this.sendEmail({
        to: process.env.EMAIL_ADMIN,
        subject: 'Email Configuration Test',
        template: 'test',
        data: {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          smtpHost: process.env.SMTP_HOST,
        },
      });

      return {
        success: true,
        message: 'Email configuration is working correctly',
        testResult,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Email configuration test failed',
        error: error.message,
      };
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(startDate, endDate) {
    // This would typically query a database or external service
    // Placeholder implementation
    return {
      sent: 1250,
      delivered: 1200,
      opened: 800,
      clicked: 300,
      bounced: 30,
      complained: 5,
      deliveryRate: 0.96,
      openRate: 0.64,
      clickRate: 0.24,
    };
  }
}

// Export singleton instance
module.exports = new EmailService();