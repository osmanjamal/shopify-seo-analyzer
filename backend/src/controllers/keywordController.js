const keywordTracker = require('../services/analysis/keywordTracker');
const Keyword = require('../models/Keyword');
const Website = require('../models/Website');
const logger = require('../utils/logger');
const { Cache } = require('../utils/cache');

// Get keywords for website
exports.getKeywords = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { status, sortBy, order } = req.query;

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

    const performance = await keywordTracker.getKeywordPerformance(websiteId, {
      status: status || 'active',
      sortBy: sortBy || 'current_position',
      order: order || 'ASC',
      limit: req.pagination?.limit || 100,
      offset: req.pagination?.offset || 0
    });

    const total = await Keyword.count({
      where: { 
        website_id: websiteId,
        status: status || 'active'
      }
    });

    res.json({
      ...performance,
      pagination: {
        total,
        page: req.pagination?.page || 1,
        limit: req.pagination?.limit || 100,
        pages: Math.ceil(total / (req.pagination?.limit || 100))
      }
    });

  } catch (error) {
    logger.error('Get keywords error:', error);
    next(error);
  }
};

// Add keyword
exports.addKeyword = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { keyword, target_url } = req.body;

    if (!keyword) {
      return res.status(400).json({
        error: 'Keyword is required'
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

    const newKeyword = await keywordTracker.addKeyword(websiteId, {
      keyword,
      target_url
    });

    res.status(201).json({
      message: 'Keyword added successfully',
      keyword: newKeyword
    });

  } catch (error) {
    logger.error('Add keyword error:', error);
    
    if (error.message.includes('Maximum keywords limit')) {
      return res.status(400).json({
        error: error.message
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Keyword already exists for this website'
      });
    }
    
    next(error);
  }
};

// Update keyword
exports.updateKeyword = async (req, res, next) => {
  try {
    const { websiteId, keywordId } = req.params;
    const { target_url, status } = req.body;

    const keyword = await Keyword.findOne({
      where: {
        id: keywordId,
        website_id: websiteId
      },
      include: [{
        model: Website,
        as: 'website',
        where: { user_id: req.user.id }
      }]
    });

    if (!keyword) {
      return res.status(404).json({
        error: 'Keyword not found'
      });
    }

    // Update fields
    if (target_url !== undefined) keyword.target_url = target_url;
    if (status !== undefined) keyword.status = status;
    
    await keyword.save();

    res.json({
      message: 'Keyword updated successfully',
      keyword
    });

  } catch (error) {
    logger.error('Update keyword error:', error);
    next(error);
  }
};

// Delete keyword
exports.deleteKeyword = async (req, res, next) => {
  try {
    const { websiteId, keywordId } = req.params;

    const keyword = await Keyword.findOne({
      where: {
        id: keywordId,
        website_id: websiteId
      },
      include: [{
        model: Website,
        as: 'website',
        where: { user_id: req.user.id }
      }]
    });

    if (!keyword) {
      return res.status(404).json({
        error: 'Keyword not found'
      });
    }

    // Soft delete by changing status
    keyword.status = 'deleted';
    await keyword.save();

    res.json({
      message: 'Keyword deleted successfully'
    });

  } catch (error) {
    logger.error('Delete keyword error:', error);
    next(error);
  }
};

// Track keyword positions
exports.trackPositions = async (req, res, next) => {
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

    if (!website.google_site_id) {
      return res.status(400).json({
        error: 'Google Search Console not connected',
        message: 'Please connect Google Search Console to track keyword positions'
      });
    }

    // Start tracking (async process)
    const trackingResult = await keywordTracker.trackKeywordPositions(websiteId);

    res.json({
      message: 'Keyword tracking completed',
      result: trackingResult
    });

  } catch (error) {
    logger.error('Track positions error:', error);
    next(error);
  }
};

// Get keyword history
exports.getKeywordHistory = async (req, res, next) => {
  try {
    const { websiteId, keywordId } = req.params;
    const { days = 30 } = req.query;

    const keyword = await Keyword.findOne({
      where: {
        id: keywordId,
        website_id: websiteId
      },
      include: [{
        model: Website,
        as: 'website',
        where: { user_id: req.user.id }
      }]
    });

    if (!keyword) {
      return res.status(404).json({
        error: 'Keyword not found'
      });
    }

    const history = await keyword.getHistory(parseInt(days));

    res.json({
      keyword: {
        id: keyword.id,
        text: keyword.keyword,
        currentPosition: keyword.current_position
      },
      history: history.map(h => ({
        date: h.tracked_at,
        position: h.position,
        searchVolume: h.search_volume
      }))
    });

  } catch (error) {
    logger.error('Get keyword history error:', error);
    next(error);
  }
};

// Get rankings distribution
exports.getRankingsDistribution = async (req, res, next) => {
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

    const distribution = await keywordTracker.getRankingsDistribution(websiteId);

    res.json(distribution);

  } catch (error) {
    logger.error('Get rankings distribution error:', error);
    next(error);
  }
};

// Find keyword opportunities
exports.findOpportunities = async (req, res, next) => {
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

    if (!website.google_site_id) {
      return res.status(400).json({
        error: 'Google Search Console not connected',
        message: 'Please connect Google Search Console to find keyword opportunities'
      });
    }

    const opportunities = await keywordTracker.findOpportunities(websiteId);

    res.json({
      opportunities,
      message: `Found ${opportunities.length} keyword opportunities`
    });

  } catch (error) {
    logger.error('Find opportunities error:', error);
    next(error);
  }
};

// Get keyword competitors
exports.getCompetitors = async (req, res, next) => {
  try {
    const { websiteId, keywordId } = req.params;

    const keyword = await Keyword.findOne({
      where: {
        id: keywordId,
        website_id: websiteId
      },
      include: [{
        model: Website,
        as: 'website',
        where: { user_id: req.user.id }
      }]
    });

    if (!keyword) {
      return res.status(404).json({
        error: 'Keyword not found'
      });
    }

    const competitors = await keywordTracker.getKeywordCompetitors(websiteId, keywordId);

    res.json(competitors);

  } catch (error) {
    logger.error('Get competitors error:', error);
    next(error);
  }
};

// Bulk add keywords
exports.bulkAddKeywords = async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { keywords } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        error: 'Keywords array is required'
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

    const results = {
      success: [],
      failed: []
    };

    for (const keywordData of keywords) {
      try {
        const newKeyword = await keywordTracker.addKeyword(websiteId, keywordData);
        results.success.push({
          keyword: keywordData.keyword,
          id: newKeyword.id
        });
      } catch (error) {
        results.failed.push({
          keyword: keywordData.keyword,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk add completed',
      results
    });

  } catch (error) {
    logger.error('Bulk add keywords error:', error);
    next(error);
  }
};