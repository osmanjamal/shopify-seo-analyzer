const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { body, query } = require('express-validator');
const { validate, isValidTimezone } = require('../middleware/validation');
const { endpointLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(authenticate);

// Get user settings
router.get(
  '/',
  settingsController.getSettings
);

// Update settings
router.put(
  '/',
  [
    body('email_notifications').optional().isBoolean(),
    body('slack_notifications').optional().isBoolean(),
    body('slack_webhook_url').optional().isURL().withMessage('Invalid Slack webhook URL'),
    body('weekly_report').optional().isBoolean(),
    body('daily_analysis_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).withMessage('Invalid time format (HH:MM:SS)'),
    body('timezone').optional().custom(isValidTimezone).withMessage('Invalid timezone')
  ],
  validate,
  settingsController.updateSettings
);

// Update notification preferences
router.patch(
  '/notifications',
  [
    body('email_notifications').optional().isBoolean(),
    body('slack_notifications').optional().isBoolean(),
    body('slack_webhook_url').optional().isURL(),
    body('weekly_report').optional().isBoolean()
  ],
  validate,
  settingsController.updateNotifications
);

// Google integration
router.get(
  '/google/auth-url',
  settingsController.getGoogleAuthUrl
);

router.post(
  '/google/connect',
  [
    body('code').notEmpty().withMessage('Authorization code is required')
  ],
  validate,
  settingsController.connectGoogle
);

router.post(
  '/google/disconnect',
  settingsController.disconnectGoogle
);

// Alerts management
router.get(
  '/alerts',
  [
    query('websiteId').optional().isUUID()
  ],
  validate,
  settingsController.getAlerts
);

router.post(
  '/alerts',
  [
    body('alert_name').trim().notEmpty().withMessage('Alert name is required'),
    body('alert_type').isIn(['email', 'slack', 'webhook']).withMessage('Invalid alert type'),
    body('condition_type').isIn(['greater_than', 'less_than', 'equals', 'contains', 'percentage_change']).withMessage('Invalid condition type'),
    body('condition_value').notEmpty().withMessage('Condition value is required'),
    body('website_id').optional().isUUID()
  ],
  validate,
  settingsController.createAlert
);

router.put(
  '/alerts/:alertId',
  [
    body('alert_name').optional().trim().notEmpty(),
    body('alert_type').optional().isIn(['email', 'slack', 'webhook']),
    body('condition_type').optional().isIn(['greater_than', 'less_than', 'equals', 'contains', 'percentage_change']),
    body('condition_value').optional().notEmpty(),
    body('is_active').optional().isBoolean()
  ],
  validate,
  settingsController.updateAlert
);

router.delete(
  '/alerts/:alertId',
  settingsController.deleteAlert
);

// API Keys (placeholder)
router.get(
  '/api-keys',
  settingsController.getApiKeys
);

router.post(
  '/api-keys',
  endpointLimiter('create-api-key', 5, 60), // 5 API keys per hour
  [
    body('name').trim().notEmpty().withMessage('API key name is required'),
    body('permissions').isArray().withMessage('Permissions must be an array')
  ],
  validate,
  settingsController.createApiKey
);

// User profile
router.put(
  '/profile',
  [
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('avatar_url').optional().isURL()
  ],
  validate,
  settingsController.updateProfile
);

// Billing
router.get(
  '/billing',
  settingsController.getBilling
);

// Data export
router.get(
  '/export',
  [
    query('format').optional().isIn(['json', 'csv']),
    query('includeWebsites').optional().isBoolean(),
    query('includeKeywords').optional().isBoolean(),
    query('includeAnalytics').optional().isBoolean()
  ],
  validate,
  settingsController.exportData
);

module.exports = router;