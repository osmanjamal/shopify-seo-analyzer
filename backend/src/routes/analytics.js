const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, checkOwnership } = require('../middleware/auth');
const { validateDateRange, validatePagination } = require('../middleware/validation');
const { cacheMiddleware, TTL } = require('../utils/cache');

// All routes require authentication
router.use(authenticate);

// Get analytics overview
router.get(
  '/:websiteId/overview',
  checkOwnership('website'),
  validateDateRange,
  cacheMiddleware(
    (req) => `analytics:overview:${req.params.websiteId}:${req.query.startDate}:${req.query.endDate}`,
    TTL.medium
  ),
  analyticsController.getOverview
);

// Get traffic data
router.get(
  '/:websiteId/traffic',
  checkOwnership('website'),
  validateDateRange,
  cacheMiddleware(
    (req) => `analytics:traffic:${req.params.websiteId}:${req.query.startDate}:${req.query.endDate}:${req.query.source}`,
    TTL.medium
  ),
  analyticsController.getTraffic
);

// Get realtime data
router.get(
  '/:websiteId/realtime',
  checkOwnership('website'),
  cacheMiddleware(
    (req) => `analytics:realtime:${req.params.websiteId}`,
    TTL.short
  ),
  analyticsController.getRealtimeData
);

// Get conversions
router.get(
  '/:websiteId/conversions',
  checkOwnership('website'),
  validateDateRange,
  cacheMiddleware(
    (req) => `analytics:conversions:${req.params.websiteId}:${req.query.startDate}:${req.query.endDate}`,
    TTL.medium
  ),
  analyticsController.getConversions
);

// Get organic traffic
router.get(
  '/:websiteId/organic',
  checkOwnership('website'),
  validateDateRange,
  cacheMiddleware(
    (req) => `analytics:organic:${req.params.websiteId}:${req.query.startDate}:${req.query.endDate}`,
    TTL.medium
  ),
  analyticsController.getOrganicTraffic
);

// Compare periods
router.get(
  '/:websiteId/compare',
  checkOwnership('website'),
  analyticsController.comparePeriods
);

// Sync analytics data
router.post(
  '/:websiteId/sync',
  checkOwnership('website'),
  analyticsController.syncAnalytics
);

module.exports = router;