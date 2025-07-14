const express = require('express');
const router = express.Router();
const keywordController = require('../controllers/keywordController');
const { authenticate, checkOwnership } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const { body, query } = require('express-validator');
const { validate, isValidKeyword } = require('../middleware/validation');
const { endpointLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(authenticate);

// Get keywords for website
router.get(
  '/:websiteId',
  checkOwnership('website'),
  validatePagination,
  [
    query('status').optional().isIn(['active', 'paused', 'deleted']),
    query('sortBy').optional().isIn(['current_position', 'keyword', 'search_volume', 'created_at']),
    query('order').optional().isIn(['ASC', 'DESC'])
  ],
  validate,
  keywordController.getKeywords
);

// Add keyword
router.post(
  '/:websiteId',
  checkOwnership('website'),
  [
    body('keyword')
      .trim()
      .notEmpty().withMessage('Keyword is required')
      .isLength({ min: 2, max: 100 }).withMessage('Keyword must be between 2 and 100 characters')
      .custom(isValidKeyword).withMessage('Invalid keyword format'),
    body('target_url').optional().isURL().withMessage('Invalid URL format')
  ],
  validate,
  keywordController.addKeyword
);

// Bulk add keywords
router.post(
  '/:websiteId/bulk',
  checkOwnership('website'),
  endpointLimiter('bulk-keywords', 5, 60), // 5 bulk operations per hour
  [
    body('keywords').isArray({ min: 1, max: 50 }).withMessage('Keywords array must contain 1-50 items'),
    body('keywords.*.keyword')
      .trim()
      .notEmpty().withMessage('Keyword is required')
      .custom(isValidKeyword).withMessage('Invalid keyword format'),
    body('keywords.*.target_url').optional().isURL().withMessage('Invalid URL format')
  ],
  validate,
  keywordController.bulkAddKeywords
);

// Update keyword
router.put(
  '/:websiteId/:keywordId',
  checkOwnership('website'),
  [
    body('target_url').optional().isURL().withMessage('Invalid URL format'),
    body('status').optional().isIn(['active', 'paused', 'deleted'])
  ],
  validate,
  keywordController.updateKeyword
);

// Delete keyword
router.delete(
  '/:websiteId/:keywordId',
  checkOwnership('website'),
  keywordController.deleteKeyword
);

// Track keyword positions
router.post(
  '/:websiteId/track',
  checkOwnership('website'),
  endpointLimiter('keyword-tracking', 10, 60), // 10 tracking requests per hour
  keywordController.trackPositions
);

// Get keyword history
router.get(
  '/:websiteId/:keywordId/history',
  checkOwnership('website'),
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
  ],
  validate,
  keywordController.getKeywordHistory
);

// Get rankings distribution
router.get(
  '/:websiteId/distribution',
  checkOwnership('website'),
  keywordController.getRankingsDistribution
);

// Find keyword opportunities
router.get(
  '/:websiteId/opportunities',
  checkOwnership('website'),
  endpointLimiter('keyword-opportunities', 5, 60), // 5 requests per hour
  keywordController.findOpportunities
);

// Get keyword competitors
router.get(
  '/:websiteId/:keywordId/competitors',
  checkOwnership('website'),
  keywordController.getCompetitors
);

module.exports = router;