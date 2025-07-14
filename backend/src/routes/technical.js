const express = require('express');
const router = express.Router();
const technicalController = require('../controllers/technicalController');
const { authenticate, checkOwnership } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validation');
const { endpointLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(authenticate);

// Get technical SEO overview
router.get(
  '/:websiteId/overview',
  checkOwnership('website'),
  technicalController.getOverview
);

// Run full technical audit (rate limited)
router.post(
  '/:websiteId/audit',
  checkOwnership('website'),
  endpointLimiter('technical-audit', 5, 60), // 5 audits per hour
  technicalController.runAudit
);

// Analyze specific page
router.post(
  '/:websiteId/analyze',
  checkOwnership('website'),
  endpointLimiter('page-analysis', 20, 60), // 20 analyses per hour
  [
    body('url').isURL().withMessage('Valid URL is required')
  ],
  validate,
  technicalController.analyzePage
);

// Run PageSpeed test
router.post(
  '/:websiteId/pagespeed',
  checkOwnership('website'),
  endpointLimiter('pagespeed', 10, 60), // 10 tests per hour
  [
    body('url').optional().isURL().withMessage('Valid URL is required'),
    body('strategy').optional().isIn(['mobile', 'desktop']).withMessage('Strategy must be mobile or desktop')
  ],
  validate,
  technicalController.runPageSpeed
);

// Get technical issues
router.get(
  '/:websiteId/issues',
  checkOwnership('website'),
  validatePagination,
  [
    query('severity').optional().isIn(['critical', 'high', 'medium', 'low']),
    query('resolved').optional().isBoolean()
  ],
  validate,
  technicalController.getIssues
);

// Resolve issue
router.patch(
  '/:websiteId/issues/:issueId/resolve',
  checkOwnership('website'),
  technicalController.resolveIssue
);

// Get PageSpeed history
router.get(
  '/:websiteId/pagespeed/history',
  checkOwnership('website'),
  [
    query('url').optional().isURL(),
    query('days').optional().isInt({ min: 1, max: 90 })
  ],
  validate,
  technicalController.getPageSpeedHistory
);

module.exports = router;