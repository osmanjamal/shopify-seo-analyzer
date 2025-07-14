const searchConsoleService = require('../google/searchConsole');
const websiteAnalyzer = require('./websiteAnalyzer');
const Competitor = require('../../models/Settings'); // Competitor model is in Settings file
const Website = require('../../models/Website');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { httpRequest, extractDomain } = require('../../utils/helpers');

class CompetitorAnalysisService {
  constructor() {
    this.maxCompetitors = 10;
  }

  // Analyze competitors
  async analyzeCompetitors(websiteId, competitorDomains = []) {
    try {
      const website = await Website.findByPk(websiteId);
      if (!website) {
        throw new Error('Website not found');
      }

      const analysis = {
        websiteId,
        domain: website.domain,
        competitors: [],
        comparison: {},
        opportunities: []
      };

      // If no competitors provided, try to find them
      if (competitorDomains.length === 0) {
        competitorDomains = await this.findCompetitors(website);
      }

      // Analyze each competitor
      for (const domain of competitorDomains.slice(0, this.maxCompetitors)) {
        try {
          const competitorData = await this.analyzeCompetitorDomain(domain);
          analysis.competitors.push(competitorData);

          // Save to database
          await Competitor.upsert({
            website_id: websiteId,
            competitor_domain: domain,
            organic_keywords: competitorData.organicKeywords,
            organic_traffic: competitorData.estimatedTraffic,
            domain_rating: competitorData.domainAuthority,
            backlinks: competitorData.backlinks,
            last_analyzed_at: new Date()
          });
        } catch (error) {
          logger.error(`Failed to analyze competitor ${domain}:`, error);
        }
      }

      // Generate comparison
      analysis.comparison = await this.generateComparison(website, analysis.competitors);

      // Find opportunities
      analysis.opportunities = await this.findOpportunities(website, analysis.competitors);

      return analysis;

    } catch (error) {
      logger.error('Analyze competitors error:', error);
      throw error;
    }
  }

  // Find competitors automatically
  async findCompetitors(website) {
    try {
      const cacheKey = `competitors:find:${website.id}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const competitors = new Set();

      // Method 1: Search Console - Find sites ranking for same keywords
      if (website.google_site_id) {
        const topQueries = await searchConsoleService.getTopQueries(
          website.user_id,
          website.google_site_id,
          { limit: 20 }
        );

        // This would require additional SERP API integration
        // For now, add placeholder logic
        logger.info('Competitor finding via SERP API not implemented');
      }

      // Method 2: Similar sites based on category
      // This would use a third-party API like SimilarWeb
      
      // Method 3: Manual list of common competitors in e-commerce
      const commonEcommerceCompetitors = [
        'amazon.com',
        'etsy.com',
        'ebay.com'
      ];

      // Filter out own domain and add to set
      commonEcommerceCompetitors.forEach(domain => {
        if (!domain.includes(website.domain)) {
          competitors.add(domain);
        }
      });

      const competitorList = Array.from(competitors).slice(0, 5);
      await Cache.set(cacheKey, competitorList, TTL.long);
      
      return competitorList;

    } catch (error) {
      logger.error('Find competitors error:', error);
      return [];
    }
  }

  // Analyze single competitor domain
  async analyzeCompetitorDomain(domain) {
    try {
      const cacheKey = `competitor:analysis:${domain}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const analysis = {
        domain,
        url: `https://${domain}`,
        lastAnalyzed: new Date()
      };

      // Analyze website
      const websiteData = await websiteAnalyzer.analyzeWebsite(analysis.url);

      // Extract basic SEO metrics
      analysis.meta = {
        title: websiteData.meta.title,
        description: websiteData.meta.description,
        hasCanonical: !!websiteData.meta.canonical
      };

      // Technical analysis
      analysis.technical = {
        hasSSL: websiteData.technical.security.https,
        hasRobotsTxt: true, // Would check separately
        hasSitemap: true, // Would check separately
        pageLoadTime: websiteData.technical.responseTime || 'N/A'
      };

      // Content analysis
      analysis.content = {
        totalImages: websiteData.images.total,
        imagesWithoutAlt: websiteData.images.missingAlt,
        headingStructure: {
          h1Count: websiteData.headings.h1.length,
          hasMultipleH1: websiteData.headings.h1.length > 1
        },
        internalLinks: websiteData.links.internal.count,
        externalLinks: websiteData.links.external.count
      };

      // Estimated metrics (would come from third-party APIs)
      analysis.estimatedMetrics = this.estimateMetrics(websiteData);
      
      // Merge estimated metrics
      Object.assign(analysis, analysis.estimatedMetrics);

      await Cache.set(cacheKey, analysis, TTL.long);
      return analysis;

    } catch (error) {
      logger.error(`Analyze competitor domain error for ${domain}:`, error);
      return {
        domain,
        error: error.message,
        lastAnalyzed: new Date()
      };
    }
  }

  // Estimate competitor metrics
  estimateMetrics(websiteData) {
    // These would typically come from APIs like Ahrefs, SEMrush, or Moz
    // For now, return estimated values based on site analysis

    const baseScore = 50;
    let score = baseScore;

    // Adjust based on technical factors
    if (websiteData.technical.security.https) score += 10;
    if (!websiteData.meta.issues?.length) score += 10;
    if (websiteData.headings.h1.length === 1) score += 5;
    if (websiteData.links.broken.length === 0) score += 5;

    // Estimate other metrics based on score
    return {
      domainAuthority: Math.min(100, Math.round(score)),
      organicKeywords: Math.round(score * 100),
      estimatedTraffic: Math.round(score * 500),
      backlinks: Math.round(score * 50),
      referringDomains: Math.round(score * 10)
    };
  }

  // Generate comparison with own website
  async generateComparison(website, competitors) {
    try {
      // Get own website metrics
      const ownMetrics = {
        domain: website.domain,
        keywords: await Keyword.count({
          where: { website_id: website.id, status: 'active' }
        }),
        // Would get more metrics from analytics and other sources
        estimatedTraffic: 0,
        domainAuthority: 0
      };

      // Calculate averages
      const avgCompetitorMetrics = {
        organicKeywords: 0,
        estimatedTraffic: 0,
        domainAuthority: 0,
        backlinks: 0
      };

      if (competitors.length > 0) {
        competitors.forEach(comp => {
          avgCompetitorMetrics.organicKeywords += comp.organicKeywords || 0;
          avgCompetitorMetrics.estimatedTraffic += comp.estimatedTraffic || 0;
          avgCompetitorMetrics.domainAuthority += comp.domainAuthority || 0;
          avgCompetitorMetrics.backlinks += comp.backlinks || 0;
        });

        Object.keys(avgCompetitorMetrics).forEach(key => {
          avgCompetitorMetrics[key] = Math.round(avgCompetitorMetrics[key] / competitors.length);
        });
      }

      return {
        ownMetrics,
        competitorAverage: avgCompetitorMetrics,
        gaps: {
          keywords: avgCompetitorMetrics.organicKeywords - ownMetrics.keywords,
          traffic: avgCompetitorMetrics.estimatedTraffic - ownMetrics.estimatedTraffic,
          authority: avgCompetitorMetrics.domainAuthority - ownMetrics.domainAuthority
        }
      };

    } catch (error) {
      logger.error('Generate comparison error:', error);
      return null;
    }
  }

  // Find opportunities from competitor analysis
  async findOpportunities(website, competitors) {
    const opportunities = [];

    // Technical opportunities
    competitors.forEach(comp => {
      if (comp.technical) {
        // SSL
        if (comp.technical.hasSSL && !website.domain.startsWith('https')) {
          opportunities.push({
            type: 'technical',
            priority: 'high',
            title: 'Implement SSL/HTTPS',
            description: 'Competitors are using HTTPS for better security and SEO',
            competitors: [comp.domain]
          });
        }
      }

      // Content opportunities
      if (comp.content) {
        if (comp.content.totalImages > 20) {
          opportunities.push({
            type: 'content',
            priority: 'medium',
            title: 'Increase visual content',
            description: `${comp.domain} uses ${comp.content.totalImages} images. Consider adding more visual content.`,
            competitors: [comp.domain]
          });
        }
      }
    });

    // Keyword gap opportunities
    const keywordGaps = await this.findKeywordGaps(website, competitors);
    opportunities.push(...keywordGaps);

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return opportunities.slice(0, 10); // Top 10 opportunities
  }

  // Find keyword gaps
  async findKeywordGaps(website, competitors) {
    const gaps = [];

    // This would typically use a keyword research API
    // For now, return placeholder recommendations
    
    if (competitors.some(c => c.organicKeywords > 1000)) {
      gaps.push({
        type: 'keywords',
        priority: 'high',
        title: 'Expand keyword targeting',
        description: 'Competitors are ranking for significantly more keywords',
        action: 'Conduct keyword research to find new opportunities'
      });
    }

    return gaps;
  }

  // Get competitor performance over time
  async getCompetitorTrends(websiteId, competitorDomain, days = 30) {
    try {
      const competitor = await Competitor.findOne({
        where: {
          website_id: websiteId,
          competitor_domain: competitorDomain
        }
      });

      if (!competitor) {
        throw new Error('Competitor not found');
      }

      // This would typically fetch historical data
      // For now, return current data as single point
      return {
        domain: competitorDomain,
        trends: {
          traffic: [{ date: new Date(), value: competitor.organic_traffic }],
          keywords: [{ date: new Date(), value: competitor.organic_keywords }],
          authority: [{ date: new Date(), value: competitor.domain_rating }]
        }
      };

    } catch (error) {
      logger.error('Get competitor trends error:', error);
      throw error;
    }
  }

  // Compare multiple competitors
  async compareCompetitors(websiteId, competitorDomains) {
    try {
      const competitors = await Competitor.findAll({
        where: {
          website_id: websiteId,
          competitor_domain: competitorDomains
        }
      });

      const comparison = {
        metrics: ['organic_traffic', 'organic_keywords', 'domain_rating', 'backlinks'],
        competitors: {}
      };

      competitors.forEach(comp => {
        comparison.competitors[comp.competitor_domain] = {
          organic_traffic: comp.organic_traffic,
          organic_keywords: comp.organic_keywords,
          domain_rating: comp.domain_rating,
          backlinks: comp.backlinks,
          last_analyzed: comp.last_analyzed_at
        };
      });

      return comparison;

    } catch (error) {
      logger.error('Compare competitors error:', error);
      throw error;
    }
  }

  // Monitor competitor changes
  async monitorCompetitorChanges(websiteId) {
    try {
      const competitors = await Competitor.findAll({
        where: { website_id: websiteId }
      });

      const changes = [];

      for (const competitor of competitors) {
        // Re-analyze if data is older than 7 days
        const daysSinceAnalysis = Math.floor(
          (new Date() - new Date(competitor.last_analyzed_at)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceAnalysis > 7) {
          const newData = await this.analyzeCompetitorDomain(competitor.competitor_domain);
          
          // Compare with previous data
          const trafficChange = newData.estimatedTraffic - competitor.organic_traffic;
          const keywordChange = newData.organicKeywords - competitor.organic_keywords;

          if (Math.abs(trafficChange) > competitor.organic_traffic * 0.1) {
            changes.push({
              domain: competitor.competitor_domain,
              type: 'traffic',
              change: trafficChange,
              percentage: (trafficChange / competitor.organic_traffic) * 100
            });
          }

          if (Math.abs(keywordChange) > competitor.organic_keywords * 0.1) {
            changes.push({
              domain: competitor.competitor_domain,
              type: 'keywords',
              change: keywordChange,
              percentage: (keywordChange / competitor.organic_keywords) * 100
            });
          }

          // Update database
          await competitor.update({
            organic_traffic: newData.estimatedTraffic,
            organic_keywords: newData.organicKeywords,
            domain_rating: newData.domainAuthority,
            backlinks: newData.backlinks,
            last_analyzed_at: new Date()
          });
        }
      }

      return changes;

    } catch (error) {
      logger.error('Monitor competitor changes error:', error);
      throw error;
    }
  }
}

module.exports = new CompetitorAnalysisService();