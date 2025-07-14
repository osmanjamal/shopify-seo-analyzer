const technicalSeoService = require('../services/analysis/technicalSeo');
const websiteAnalyzer = require('../services/analysis/websiteAnalyzer');
const pageSpeedService = require('../services/google/pagespeed');
const Website = require('../models/Website');
const TechnicalIssue = require('../models/TechnicalIssue');
const PageSpeedMetrics = require('../models/TechnicalIssue'); // PageSpeedMetrics is in same file
const logger = require('../utils/logger');
const { Cache, TTL } = require('../utils/cache');

// Get technical SEO overview
exports.getOverview = async (req, res, next) => {
  try {
    const { websiteId } = req.params;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const websiteUrl = `https://${website.domain}`;

    // Get technical issues from database
    const [issues, issuesSummary] = await Promise.all([
      TechnicalIssue.findUnresolved(websiteId),
      TechnicalIssue.getSummary(websiteId)
    ]);

    // Get latest page speed metrics
    const pageSpeedMetrics = await PageSpeedMetrics.getLatest(websiteId, websiteUrl);

    res.json({
      website: {
        id: website.id,
        domain: website.domain,
        url: websiteUrl
      },
      issues: {
        unresolved: issues.slice(0, 10),
        summary: issuesSummary
      },
      pageSpeed: pageSpeedMetrics ? {
        score: pageSpeedMetrics.getOverallScore(),
        metrics: {
          performance: pageSpeedMetrics.performance_score,
          seo: pageSpeedMetrics.seo_score,
          accessibility: pageSpeedMetrics.accessibility_score,
          bestPractices: pageSpeedMetrics.best_practices_score
        }
      } : null
    });

  } catch (error) {
    logger.error('Get technical overview error:', error);
    next(error);
  }
};

// Run technical SEO audit
exports.runAudit = async (req, res, next) => {
  try {
    const { websiteId } = req.params;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const websiteUrl = `https://${website.domain}`;
    
    // Run comprehensive audit
    const audit = await technicalSeoService.runAudit(websiteUrl);

    // Save issues to database
    const issuesToSave = [];
    
    // Process each audit section
    Object.entries(audit).forEach(([section, data]) => {
      if (data.issues && Array.isArray(data.issues)) {
        data.issues.forEach(issue => {
          issuesToSave.push({
            website_id: websiteId,
            page_url: websiteUrl,
            issue_type: issue.type,
            issue_description: issue.message,
            severity: issue.severity
          });
        });
      }
    });

    // Save new issues
    if (issuesToSave.length > 0) {
      await TechnicalIssue.bulkCreate(issuesToSave, {
        updateOnDuplicate: ['last_detected_at', 'issue_description']
      });
    }

    res.json({
      audit,
      issuesFound: issuesToSave.length,
      message: 'Technical SEO audit completed successfully'
    });

  } catch (error) {
    logger.error('Run audit error:', error);
    next(error);
  }
};

// Analyze specific page
exports.analyzePage = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    // Verify URL belongs to website
    if (!url.includes(website.domain)) {
      return res.status(400).json({
        error: 'URL does not belong to this website'
      });
    }

    const analysis = await websiteAnalyzer.analyzeWebsite(url);

    // Save any issues found
    const issuesToSave = [];
    
    // Process meta issues
    if (analysis.meta.issues) {
      analysis.meta.issues.forEach(issue => {
        issuesToSave.push({
          website_id: websiteId,
          page_url: url,
          issue_type: issue.type,
          issue_description: issue.message,
          severity: issue.severity
        });
      });
    }

    // Process other issues
    ['headings', 'images', 'links', 'structuredData', 'social', 'technical'].forEach(section => {
      if (analysis[section]?.issues) {
        analysis[section].issues.forEach(issue => {
          issuesToSave.push({
            website_id: websiteId,
            page_url: url,
            issue_type: issue.type,
            issue_description: issue.message,
            severity: issue.severity
          });
        });
      }
    });

    if (issuesToSave.length > 0) {
      await TechnicalIssue.bulkCreate(issuesToSave, {
        updateOnDuplicate: ['last_detected_at', 'issue_description']
      });
    }

    res.json({
      analysis,
      issuesFound: issuesToSave.length
    });

  } catch (error) {
    logger.error('Analyze page error:', error);
    next(error);
  }
};

// Run PageSpeed test
exports.runPageSpeed = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { url, strategy = 'mobile' } = req.body;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const testUrl = url || `https://${website.domain}`;

    // Run PageSpeed analysis
    const result = await pageSpeedService.analyze(testUrl, { strategy });

    // Extract scores and metrics
    const categories = result.lighthouseResult?.categories || {};
    const audits = result.lighthouseResult?.audits || {};

    const metrics = {
      website_id: websiteId,
      page_url: testUrl,
      performance_score: Math.round((categories.performance?.score || 0) * 100),
      seo_score: Math.round((categories.seo?.score || 0) * 100),
      accessibility_score: Math.round((categories.accessibility?.score || 0) * 100),
      best_practices_score: Math.round((categories['best-practices']?.score || 0) * 100),
      first_contentful_paint: audits['first-contentful-paint']?.numericValue,
      speed_index: audits['speed-index']?.numericValue,
      largest_contentful_paint: audits['largest-contentful-paint']?.numericValue,
      time_to_interactive: audits['interactive']?.numericValue,
      total_blocking_time: audits['total-blocking-time']?.numericValue,
      cumulative_layout_shift: audits['cumulative-layout-shift']?.numericValue
    };

    // Save to database
    await PageSpeedMetrics.create(metrics);

    // Get opportunities and diagnostics
    const [opportunities, diagnostics] = await Promise.all([
      pageSpeedService.getOpportunities(testUrl),
      pageSpeedService.getDiagnostics(testUrl)
    ]);

    res.json({
      url: testUrl,
      strategy,
      scores: {
        performance: metrics.performance_score,
        seo: metrics.seo_score,
        accessibility: metrics.accessibility_score,
        bestPractices: metrics.best_practices_score
      },
      metrics: {
        fcp: metrics.first_contentful_paint,
        si: metrics.speed_index,
        lcp: metrics.largest_contentful_paint,
        tti: metrics.time_to_interactive,
        tbt: metrics.total_blocking_time,
        cls: metrics.cumulative_layout_shift
      },
      opportunities: opportunities.slice(0, 5),
      diagnostics: diagnostics.slice(0, 5)
    });

  } catch (error) {
    logger.error('Run PageSpeed error:', error);
    next(error);
  }
};

// Get technical issues
exports.getIssues = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { severity, resolved, page } = req.query;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    // Build query
    const where = { website_id: websiteId };
    
    if (severity) {
      where.severity = severity;
    }
    
    if (resolved !== undefined) {
      where.is_resolved = resolved === 'true';
    }

    const issues = await TechnicalIssue.findAll({
      where,
      order: [
        ['severity', 'DESC'],
        ['first_detected_at', 'ASC']
      ],
      limit: req.pagination?.limit || 50,
      offset: req.pagination?.offset || 0
    });

    const total = await TechnicalIssue.count({ where });

    res.json({
      issues,
      pagination: {
        total,
        page: req.pagination?.page || 1,
        limit: req.pagination?.limit || 50,
        pages: Math.ceil(total / (req.pagination?.limit || 50))
      }
    });

  } catch (error) {
    logger.error('Get issues error:', error);
    next(error);
  }
};

// Resolve issue
exports.resolveIssue = async (req, res, next) => {
  try {
    const { websiteId, issueId } = req.params;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const issue = await TechnicalIssue.findOne({
      where: {
        id: issueId,
        website_id: websiteId
      }
    });

    if (!issue) {
      return res.status(404).json({
        error: 'Issue not found'
      });
    }

    await issue.markAsResolved();

    res.json({
      message: 'Issue marked as resolved',
      issue
    });

  } catch (error) {
    logger.error('Resolve issue error:', error);
    next(error);
  }
};

// Get PageSpeed history
exports.getPageSpeedHistory = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { url, days = 30 } = req.query;

    const website = await Website.findOne({
      where: {
        id: websiteId,
        user_id: req.user.id
      }
    });

    if (!website) {
      return res.status(404).json({
        error: 'Website not found'
      });
    }

    const pageUrl = url || `https://${website.domain}`;
    const history = await PageSpeedMetrics.getHistory(websiteId, pageUrl, days);

    res.json({
      url: pageUrl,
      days,
      history
    });

  } catch (error) {
    logger.error('Get PageSpeed history error:', error);
    next(error);
  }
};