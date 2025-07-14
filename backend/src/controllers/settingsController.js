const Settings = require('../models/Settings');
const Alert = require('../models/Settings'); // Alert model is in Settings file
const User = require('../models/User');
const Website = require('../models/Website');
const googleAuthService = require('../services/google/auth');
const logger = require('../utils/logger');
const { Cache } = require('../utils/cache');

// Get user settings
exports.getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get or create settings
    const settings = await Settings.getOrCreate(userId);
    
    // Check Google connection status
    let googleConnected = false;
    let googlePermissions = null;
    
    if (settings.google_refresh_token) {
      const permissions = await googleAuthService.checkUserPermissions(userId);
      googleConnected = permissions.valid;
      googlePermissions = permissions;
    }

    // Get Shopify connection status
    const shopifyWebsites = await Website.count({
      where: {
        user_id: userId,
        shopify_access_token: { [sequelize.Op.not]: null }
      }
    });

    res.json({
      settings: settings.toJSON(),
      connections: {
        google: {
          connected: googleConnected,
          permissions: googlePermissions
        },
        shopify: {
          connected: shopifyWebsites > 0,
          websiteCount: shopifyWebsites
        }
      }
    });

  } catch (error) {
    logger.error('Get settings error:', error);
    next(error);
  }
};

// Update settings
exports.updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Get existing settings
    const settings = await Settings.getOrCreate(userId);

    // Update allowed fields
    const allowedFields = [
      'email_notifications',
      'slack_webhook_url',
      'slack_notifications',
      'weekly_report',
      'daily_analysis_time',
      'timezone'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        settings[field] = updates[field];
      }
    });

    await settings.save();

    // Clear settings cache
    await Cache.deletePattern(`settings:${userId}:*`);

    res.json({
      message: 'Settings updated successfully',
      settings: settings.toJSON()
    });

  } catch (error) {
    logger.error('Update settings error:', error);
    next(error);
  }
};

// Update notification preferences
exports.updateNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const settings = await Settings.getOrCreate(userId);
    await settings.updateNotifications(preferences);

    res.json({
      message: 'Notification preferences updated',
      notifications: {
        email_notifications: settings.email_notifications,
        slack_notifications: settings.slack_notifications,
        weekly_report: settings.weekly_report
      }
    });

  } catch (error) {
    logger.error('Update notifications error:', error);
    next(error);
  }
};

// Connect Google account
exports.connectGoogle = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Authorization code required'
      });
    }

    // Exchange code for tokens
    const tokens = await googleAuthService.exchangeCodeForTokens(code);
    
    // Store tokens
    await googleAuthService.storeUserTokens(userId, tokens);

    // Check permissions
    const permissions = await googleAuthService.checkUserPermissions(userId);

    res.json({
      message: 'Google account connected successfully',
      permissions
    });

  } catch (error) {
    logger.error('Connect Google error:', error);
    next(error);
  }
};

// Disconnect Google account
exports.disconnectGoogle = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Revoke tokens
    await googleAuthService.revokeUserTokens(userId);

    // Clear Google IDs from websites
    await Website.update(
      {
        google_site_id: null,
        google_view_id: null
      },
      {
        where: { user_id: userId }
      }
    );

    res.json({
      message: 'Google account disconnected successfully'
    });

  } catch (error) {
    logger.error('Disconnect Google error:', error);
    next(error);
  }
};

// Get Google auth URL
exports.getGoogleAuthUrl = async (req, res, next) => {
  try {
    const state = req.user.id; // Pass user ID as state
    const authUrl = googleAuthService.generateAuthUrl(state);

    res.json({ authUrl });

  } catch (error) {
    logger.error('Get Google auth URL error:', error);
    next(error);
  }
};

// Get alerts
exports.getAlerts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { websiteId } = req.query;

    const alerts = await Alert.findActive(userId, websiteId);

    res.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        name: alert.alert_name,
        type: alert.alert_type,
        conditionType: alert.condition_type,
        conditionValue: alert.condition_value,
        websiteId: alert.website_id,
        isActive: alert.is_active,
        lastTriggered: alert.last_triggered_at,
        createdAt: alert.created_at
      }))
    });

  } catch (error) {
    logger.error('Get alerts error:', error);
    next(error);
  }
};

// Create alert
exports.createAlert = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      alert_name,
      alert_type,
      condition_type,
      condition_value,
      website_id
    } = req.body;

    // Verify website ownership if specified
    if (website_id) {
      const website = await Website.findOne({
        where: {
          id: website_id,
          user_id: userId
        }
      });

      if (!website) {
        return res.status(404).json({
          error: 'Website not found'
        });
      }
    }

    const alert = await Alert.create({
      user_id: userId,
      website_id,
      alert_name,
      alert_type,
      condition_type,
      condition_value,
      is_active: true
    });

    res.status(201).json({
      message: 'Alert created successfully',
      alert
    });

  } catch (error) {
    logger.error('Create alert error:', error);
    next(error);
  }
};

// Update alert
exports.updateAlert = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { alertId } = req.params;
    const updates = req.body;

    const alert = await Alert.findOne({
      where: {
        id: alertId,
        user_id: userId
      }
    });

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'alert_name',
      'alert_type',
      'condition_type',
      'condition_value',
      'is_active'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        alert[field] = updates[field];
      }
    });

    await alert.save();

    res.json({
      message: 'Alert updated successfully',
      alert
    });

  } catch (error) {
    logger.error('Update alert error:', error);
    next(error);
  }
};

// Delete alert
exports.deleteAlert = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { alertId } = req.params;

    const alert = await Alert.findOne({
      where: {
        id: alertId,
        user_id: userId
      }
    });

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    await alert.destroy();

    res.json({
      message: 'Alert deleted successfully'
    });

  } catch (error) {
    logger.error('Delete alert error:', error);
    next(error);
  }
};

// Get API keys
exports.getApiKeys = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // This would typically fetch from a separate API keys table
    // For now, return structure
    res.json({
      apiKeys: [],
      message: 'API key management requires additional implementation'
    });

  } catch (error) {
    logger.error('Get API keys error:', error);
    next(error);
  }
};

// Create API key
exports.createApiKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, permissions } = req.body;

    // This would typically create a new API key
    // For now, return structure
    res.json({
      message: 'API key creation requires additional implementation',
      apiKey: {
        name,
        key: 'sk_' + Buffer.from(Math.random().toString()).toString('base64').substring(0, 32),
        permissions,
        createdAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Create API key error:', error);
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url } = req.body;

    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update allowed fields
    if (full_name !== undefined) user.full_name = full_name;
    if (avatar_url !== undefined) user.avatar_url = avatar_url;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

// Get billing information
exports.getBilling = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // This would typically fetch from a billing service
    // For now, return structure
    const billing = {
      plan: 'free',
      status: 'active',
      limits: {
        websites: 1,
        keywords: 10,
        monthlyAnalysis: 100
      },
      usage: {
        websites: await Website.count({ where: { user_id: userId } }),
        keywords: await Keyword.count({
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
        monthlyAnalysis: 0
      }
    };

    res.json(billing);

  } catch (error) {
    logger.error('Get billing error:', error);
    next(error);
  }
};

// Export data
exports.exportData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { format = 'json', includeWebsites, includeKeywords, includeAnalytics } = req.query;

    const exportData = {
      exportedAt: new Date(),
      user: await User.findByPk(userId, {
        attributes: ['id', 'email', 'full_name', 'created_at']
      })
    };

    if (includeWebsites === 'true') {
      exportData.websites = await Website.findAll({
        where: { user_id: userId },
        attributes: { exclude: ['shopify_access_token'] }
      });
    }

    if (includeKeywords === 'true') {
      exportData.keywords = await Keyword.findAll({
        include: [{
          model: Website,
          as: 'website',
          where: { user_id: userId },
          attributes: ['domain']
        }]
      });
    }

    if (includeAnalytics === 'true') {
      exportData.analytics = await AnalyticsData.findAll({
        where: {
          created_at: {
            [sequelize.Op.gte]: dateHelpers.daysAgo(30)
          }
        },
        include: [{
          model: Website,
          as: 'website',
          where: { user_id: userId },
          attributes: ['domain']
        }],
        order: [['date', 'DESC']]
      });
    }

    if (format === 'csv') {
      // CSV export would be implemented here
      return res.status(501).json({
        error: 'CSV export not yet implemented'
      });
    }

    res.json(exportData);

  } catch (error) {
    logger.error('Export data error:', error);
    next(error);
  }
};