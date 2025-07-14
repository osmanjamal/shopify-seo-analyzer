const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { query } = require('express-validator');
const { validate } = require('../middleware/validation');
const { cacheMiddleware, TTL } = require('../utils/cache');

// All routes require authentication
router.use(authenticate);

// Get dashboard overview
router.get(
  '/overview',
  [
    query('websiteId').optional().isUUID().withMessage('Invalid website ID'),
    query('period').optional().isIn(['7days', '30days', '90days']).withMessage('Invalid period')
  ],
  validate,
  cacheMiddleware(
    (req) => `dashboard:overview:${req.user.id}:${req.query.websiteId || 'all'}:${req.query.period || '30days'}`,
    TTL.short
  ),
  dashboardController.getDashboardOverview
);

// Get quick stats
router.get(
  '/quick-stats',
  cacheMiddleware(
    (req) => `dashboard:quickstats:${req.user.id}`,
    TTL.medium
  ),
  dashboardController.getQuickStats
);

// Get SEO score for website
router.get(
  '/seo-score/:websiteId',
  [
    query('websiteId').isUUID().withMessage('Invalid website ID')
  ],
  validate,
  cacheMiddleware(
    (req) => `dashboard:seoscore:${req.params.websiteId}`,
    TTL.medium
  ),
  dashboardController.getSEOScore
);

// Get performance metrics
router.get(
  '/performance/:websiteId',
  [
    query('websiteId').isUUID().withMessage('Invalid website ID'),
    query('period').optional().isIn(['7days', '30days', '90days']).withMessage('Invalid period')
  ],
  validate,
  cacheMiddleware(
    (req) => `dashboard:performance:${req.params.websiteId}:${req.query.period || '30days'}`,
    TTL.short
  ),
  dashboardController.getPerformanceMetrics
);

module.exports = router;