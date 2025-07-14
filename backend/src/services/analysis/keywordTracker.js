const searchConsoleService = require('../google/searchConsole');
const Keyword = require('../../models/Keyword');
const Website = require('../../models/Website');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { batchArray, calculatePercentageChange, dateHelpers } = require('../../utils/helpers');
const { addJob } = require('../../utils/scheduler');

class KeywordTracker {
  constructor() {
    this.batchSize = 50;
    this.maxKeywordsPerWebsite = parseInt(process.env.MAX_KEYWORDS_PER_WEBSITE) || 100;
  }

  // Track keyword positions
  async trackKeywordPositions(websiteId) {
    try {
      logger.info(`Starting keyword tracking for website ${websiteId}`);

      // Get website with active keywords
      const website = await Website.findByPk(websiteId, {
        include: [{
          model: Keyword,
          as: 'keywords',
          where: { status: 'active' }
        }]
      });

      if (!website || !website.google_site_id) {
        logger.warn(`Website ${websiteId} not found or missing Google Search Console`);
        return null;
      }

      const keywords = website.keywords;
      if (keywords.length === 0) {
        logger.info(`No active keywords to track for website ${websiteId}`);
        return { tracked: 0, updated: 0 };
      }

      // Get user ID for Google API
      const userId = website.user_id;
      
      // Track positions in batches
      const batches = batchArray(keywords, this.batchSize);
      let totalUpdated = 0;

      for (const batch of batches) {
        const keywordTexts = batch.map(k => k.keyword);
        
        // Get positions from Search Console
        const positions = await searchConsoleService.getKeywordPositions(
          userId,
          website.google_site_id,
          keywordTexts
        );

        // Update each keyword
        for (const keywordData of positions) {
          const keyword = batch.find(k => k.keyword === keywordData.keyword);
          if (keyword && keywordData.position !== null) {
            await keyword.updatePosition(keywordData.position);
            totalUpdated++;
          }
        }
      }

      logger.info(`Completed keyword tracking for website ${websiteId}: ${totalUpdated}/${keywords.length} updated`);

      return {
        tracked: keywords.length,
        updated: totalUpdated
      };

    } catch (error) {
      logger.error('Track keyword positions error:', error);
      throw error;
    }
  }

  // Add new keyword
  async addKeyword(websiteId, keywordData) {
    try {
      const { keyword, target_url } = keywordData;

      // Check keyword limit
      const currentCount = await Keyword.count({
        where: { website_id: websiteId, status: 'active' }
      });

      if (currentCount >= this.maxKeywordsPerWebsite) {
        throw new Error(`Maximum keywords limit (${this.maxKeywordsPerWebsite}) reached`);
      }

      // Create keyword
      const newKeyword = await Keyword.create({
        website_id: websiteId,
        keyword: keyword.toLowerCase().trim(),
        target_url,
        status: 'active'
      });

      // Get initial position
      await this.trackSingleKeyword(websiteId, newKeyword.id);

      return newKeyword;

    } catch (error) {
      logger.error('Add keyword error:', error);
      throw error;
    }
  }

  // Track single keyword
  async trackSingleKeyword(websiteId, keywordId) {
    try {
      const keyword = await Keyword.findOne({
        where: { id: keywordId, website_id: websiteId },
        include: [{
          model: Website,
          as: 'website'
        }]
      });

      if (!keyword || !keyword.website.google_site_id) {
        throw new Error('Keyword or website not found');
      }

      // Get position from Search Console
      const positions = await searchConsoleService.getKeywordPositions(
        keyword.website.user_id,
        keyword.website.google_site_id,
        [keyword.keyword]
      );

      if (positions.length > 0 && positions[0].position !== null) {
        await keyword.updatePosition(positions[0].position);
        
        // Update search volume if available
        if (positions[0].impressions) {
          keyword.search_volume = Math.round(positions[0].impressions * 30); // Estimate monthly volume
          await keyword.save();
        }
      }

      return keyword;

    } catch (error) {
      logger.error('Track single keyword error:', error);
      throw error;
    }
  }

  // Get keyword performance
  async getKeywordPerformance(websiteId, options = {}) {
    try {
      const {
        status = 'active',
        sortBy = 'current_position',
        order = 'ASC',
        limit = 100,
        offset = 0
      } = options;

      const cacheKey = `keywords:performance:${websiteId}:${JSON.stringify(options)}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const keywords = await Keyword.findAll({
        where: {
          website_id: websiteId,
          status
        },
        order: [[sortBy, order]],
        limit,
        offset
      });

      // Calculate performance metrics
      const performance = await Promise.all(keywords.map(async (keyword) => {
        const history = await keyword.getHistory(30);
        
        const data = {
          id: keyword.id,
          keyword: keyword.keyword,
          targetUrl: keyword.target_url,
          currentPosition: keyword.current_position,
          previousPosition: keyword.previous_position,
          bestPosition: keyword.best_position,
          searchVolume: keyword.search_volume,
          difficulty: keyword.difficulty,
          positionChange: keyword.getPositionChange(),
          improved: keyword.hasImproved(),
          history: history.map(h => ({
            date: h.tracked_at,
            position: h.position
          }))
        };

        // Calculate trend
        if (history.length >= 7) {
          const weekAgo = history[6]?.position;
          const monthAgo = history[history.length - 1]?.position;
          
          data.weeklyTrend = weekAgo ? keyword.current_position - weekAgo : 0;
          data.monthlyTrend = monthAgo ? keyword.current_position - monthAgo : 0;
        }

        return data;
      }));

      const result = {
        keywords: performance,
        summary: this.calculateSummary(performance)
      };

      await Cache.set(cacheKey, result, TTL.short);
      return result;

    } catch (error) {
      logger.error('Get keyword performance error:', error);
      throw error;
    }
  }

  // Get keyword rankings distribution
  async getRankingsDistribution(websiteId) {
    try {
      const keywords = await Keyword.findAll({
        where: {
          website_id: websiteId,
          status: 'active',
          current_position: { [sequelize.Op.not]: null }
        },
        attributes: ['current_position']
      });

      const distribution = {
        top3: 0,
        top10: 0,
        top20: 0,
        top50: 0,
        top100: 0,
        beyond100: 0,
        notRanking: 0
      };

      keywords.forEach(keyword => {
        const pos = keyword.current_position;
        if (pos <= 3) distribution.top3++;
        else if (pos <= 10) distribution.top10++;
        else if (pos <= 20) distribution.top20++;
        else if (pos <= 50) distribution.top50++;
        else if (pos <= 100) distribution.top100++;
        else distribution.beyond100++;
      });

      // Count not ranking
      const notRanking = await Keyword.count({
        where: {
          website_id: websiteId,
          status: 'active',
          current_position: null
        }
      });
      distribution.notRanking = notRanking;

      return distribution;

    } catch (error) {
      logger.error('Get rankings distribution error:', error);
      throw error;
    }
  }

  // Get competitors for keywords
  async getKeywordCompetitors(websiteId, keywordId) {
    try {
      const keyword = await Keyword.findOne({
        where: { id: keywordId, website_id: websiteId },
        include: [{
          model: Website,
          as: 'website'
        }]
      });

      if (!keyword) {
        throw new Error('Keyword not found');
      }

      // This would integrate with a third-party API for competitor data
      // For now, return mock data structure
      const competitors = {
        keyword: keyword.keyword,
        topCompetitors: [],
        // Would include: domain, position, title, url
        message: 'Competitor analysis requires additional API integration'
      };

      return competitors;

    } catch (error) {
      logger.error('Get keyword competitors error:', error);
      throw error;
    }
  }

  // Find keyword opportunities
  async findOpportunities(websiteId) {
    try {
      const website = await Website.findByPk(websiteId);
      if (!website || !website.google_site_id) {
        throw new Error('Website not found or missing Google Search Console');
      }

      // Get top queries from Search Console that aren't tracked
      const topQueries = await searchConsoleService.getTopQueries(
        website.user_id,
        website.google_site_id,
        { limit: 200 }
      );

      // Get existing keywords
      const existingKeywords = await Keyword.findAll({
        where: { website_id: websiteId },
        attributes: ['keyword']
      });
      const existingSet = new Set(existingKeywords.map(k => k.keyword.toLowerCase()));

      // Find opportunities
      const opportunities = topQueries
        .filter(query => !existingSet.has(query.query.toLowerCase()))
        .filter(query => query.impressions > 10) // Min impressions threshold
        .map(query => ({
          keyword: query.query,
          impressions: query.impressions,
          clicks: query.clicks,
          ctr: query.ctr,
          position: Math.round(query.position),
          potential: this.calculatePotential(query)
        }))
        .sort((a, b) => b.potential - a.potential)
        .slice(0, 50);

      return opportunities;

    } catch (error) {
      logger.error('Find opportunities error:', error);
      throw error;
    }
  }

  // Schedule daily tracking
  async scheduleDailyTracking(websiteId) {
    try {
      await addJob('analysis', {
        type: 'keyword-tracking',
        websiteId,
        scheduled: true
      }, {
        repeat: {
          cron: '0 9 * * *' // Daily at 9 AM
        }
      });

      logger.info(`Scheduled daily keyword tracking for website ${websiteId}`);
      return true;

    } catch (error) {
      logger.error('Schedule daily tracking error:', error);
      throw error;
    }
  }

  // Calculate keyword summary
  calculateSummary(keywords) {
    const total = keywords.length;
    if (total === 0) {
      return {
        total: 0,
        improved: 0,
        declined: 0,
        unchanged: 0,
        averagePosition: 0
      };
    }

    const improved = keywords.filter(k => k.positionChange > 0).length;
    const declined = keywords.filter(k => k.positionChange < 0).length;
    const unchanged = total - improved - declined;

    const rankedKeywords = keywords.filter(k => k.currentPosition !== null);
    const averagePosition = rankedKeywords.length > 0
      ? rankedKeywords.reduce((sum, k) => sum + k.currentPosition, 0) / rankedKeywords.length
      : 0;

    return {
      total,
      improved,
      declined,
      unchanged,
      averagePosition: Math.round(averagePosition * 10) / 10
    };
  }

  // Calculate keyword potential score
  calculatePotential(query) {
    // Higher impressions + lower position + higher CTR = more potential
    const impressionScore = Math.min(query.impressions / 1000, 10);
    const positionScore = Math.max(0, 10 - (query.position / 10));
    const ctrScore = query.ctr * 100;

    return impressionScore + positionScore + ctrScore;
  }
}

module.exports = new KeywordTracker();