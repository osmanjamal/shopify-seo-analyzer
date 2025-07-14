const { getPageSpeedAPI } = require('../../config/google');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { retry, parseUrl } = require('../../utils/helpers');

class PageSpeedService {
  constructor() {
    this.categories = [
      'performance',
      'accessibility',
      'best-practices',
      'seo'
    ];

    this.strategies = ['mobile', 'desktop'];
  }

  // Run PageSpeed analysis
  async analyze(url, options = {}) {
    try {
      const {
        strategy = 'mobile',
        categories = this.categories,
        locale = 'en'
      } = options;

      const cacheKey = `ps:${url}:${strategy}:${categories.join(',')}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const pageSpeed = getPageSpeedAPI();
      
      const response = await retry(async () => {
        return pageSpeed.pagespeedapi.runpagespeed({
          url,
          strategy,
          category: categories,
          locale
        });
      }, {
        maxAttempts: 3,
        delay: 2000
      });

      const data = this.parsePageSpeedResponse(response.data);
      await Cache.set(cacheKey, data, TTL.long);
      return data;

    } catch (error) {
      logger.error('PageSpeed analysis error:', error);
      throw new Error(`Failed to analyze page speed: ${error.message}`);
    }
  }

  // Analyze multiple URLs
  async analyzeMultiple(urls, options = {}) {
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await this.analyze(url, options);
        results.push({
          url,
          success: true,
          data: result
        });
      } catch (error) {
        logger.error(`Failed to analyze ${url}:`, error);
        results.push({
          url,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Get Core Web Vitals
  async getCoreWebVitals(url, strategy = 'mobile') {
    try {
      const data = await this.analyze(url, {
        strategy,
        categories: ['performance']
      });

      const metrics = data.lighthouseResult?.audits || {};
      
      return {
        lcp: {
          score: metrics['largest-contentful-paint']?.score,
          value: metrics['largest-contentful-paint']?.numericValue,
          displayValue: metrics['largest-contentful-paint']?.displayValue
        },
        fid: {
          score: metrics['max-potential-fid']?.score,
          value: metrics['max-potential-fid']?.numericValue,
          displayValue: metrics['max-potential-fid']?.displayValue
        },
        cls: {
          score: metrics['cumulative-layout-shift']?.score,
          value: metrics['cumulative-layout-shift']?.numericValue,
          displayValue: metrics['cumulative-layout-shift']?.displayValue
        },
        fcp: {
          score: metrics['first-contentful-paint']?.score,
          value: metrics['first-contentful-paint']?.numericValue,
          displayValue: metrics['first-contentful-paint']?.displayValue
        },
        si: {
          score: metrics['speed-index']?.score,
          value: metrics['speed-index']?.numericValue,
          displayValue: metrics['speed-index']?.displayValue
        },
        tti: {
          score: metrics['interactive']?.score,
          value: metrics['interactive']?.numericValue,
          displayValue: metrics['interactive']?.displayValue
        },
        tbt: {
          score: metrics['total-blocking-time']?.score,
          value: metrics['total-blocking-time']?.numericValue,
          displayValue: metrics['total-blocking-time']?.displayValue
        }
      };
    } catch (error) {
      logger.error('Get Core Web Vitals error:', error);
      throw error;
    }
  }

  // Get SEO insights
  async getSEOInsights(url) {
    try {
      const data = await this.analyze(url, {
        categories: ['seo']
      });

      const audits = data.lighthouseResult?.audits || {};
      const insights = [];

      // Check each SEO audit
      const seoAudits = [
        'document-title',
        'meta-description',
        'link-text',
        'crawlable-anchors',
        'is-crawlable',
        'robots-txt',
        'image-alt',
        'hreflang',
        'canonical',
        'font-size',
        'plugins',
        'tap-targets',
        'structured-data'
      ];

      for (const auditName of seoAudits) {
        const audit = audits[auditName];
        if (audit && audit.score !== null) {
          insights.push({
            id: auditName,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            displayValue: audit.displayValue,
            warnings: audit.warnings,
            passed: audit.score === 1
          });
        }
      }

      return {
        score: data.lighthouseResult?.categories?.seo?.score,
        insights: insights.sort((a, b) => a.score - b.score)
      };
    } catch (error) {
      logger.error('Get SEO insights error:', error);
      throw error;
    }
  }

  // Get performance opportunities
  async getOpportunities(url) {
    try {
      const data = await this.analyze(url, {
        categories: ['performance']
      });

      const audits = data.lighthouseResult?.audits || {};
      const opportunities = [];

      // Performance opportunity audits
      const opportunityAudits = [
        'render-blocking-resources',
        'uses-responsive-images',
        'offscreen-images',
        'unminified-css',
        'unminified-javascript',
        'unused-css-rules',
        'unused-javascript',
        'modern-image-formats',
        'uses-optimized-images',
        'uses-text-compression',
        'uses-rel-preconnect',
        'server-response-time',
        'redirects',
        'uses-rel-preload',
        'efficient-animated-content',
        'duplicated-javascript',
        'legacy-javascript'
      ];

      for (const auditName of opportunityAudits) {
        const audit = audits[auditName];
        if (audit && audit.score !== null && audit.score < 1) {
          opportunities.push({
            id: auditName,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            displayValue: audit.displayValue,
            savings: {
              bytes: audit.details?.overallSavingsBytes,
              ms: audit.details?.overallSavingsMs
            },
            items: audit.details?.items?.slice(0, 5) // Top 5 items
          });
        }
      }

      return opportunities.sort((a, b) => {
        // Sort by potential time savings
        const aSavings = a.savings?.ms || 0;
        const bSavings = b.savings?.ms || 0;
        return bSavings - aSavings;
      });
    } catch (error) {
      logger.error('Get opportunities error:', error);
      throw error;
    }
  }

  // Get diagnostics
  async getDiagnostics(url) {
    try {
      const data = await this.analyze(url, {
        categories: ['performance']
      });

      const audits = data.lighthouseResult?.audits || {};
      const diagnostics = [];

      // Diagnostic audits
      const diagnosticAudits = [
        'total-byte-weight',
        'uses-long-cache-ttl',
        'dom-size',
        'critical-request-chains',
        'user-timings',
        'bootup-time',
        'mainthread-work-breakdown',
        'font-display',
        'performance-budget',
        'timing-budget',
        'resource-summary',
        'third-party-summary',
        'third-party-facades',
        'largest-contentful-paint-element',
        'lcp-lazy-loaded',
        'layout-shift-elements',
        'long-tasks',
        'non-composited-animations'
      ];

      for (const auditName of diagnosticAudits) {
        const audit = audits[auditName];
        if (audit && audit.score !== null) {
          diagnostics.push({
            id: auditName,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            displayValue: audit.displayValue,
            numericValue: audit.numericValue,
            details: audit.details
          });
        }
      }

      return diagnostics;
    } catch (error) {
      logger.error('Get diagnostics error:', error);
      throw error;
    }
  }

  // Compare mobile vs desktop
  async compareStrategies(url) {
    try {
      const [mobileData, desktopData] = await Promise.all([
        this.analyze(url, { strategy: 'mobile' }),
        this.analyze(url, { strategy: 'desktop' })
      ]);

      const getScores = (data) => ({
        performance: data.lighthouseResult?.categories?.performance?.score,
        accessibility: data.lighthouseResult?.categories?.accessibility?.score,
        bestPractices: data.lighthouseResult?.categories?.['best-practices']?.score,
        seo: data.lighthouseResult?.categories?.seo?.score
      });

      return {
        mobile: {
          scores: getScores(mobileData),
          metrics: this.extractMetrics(mobileData)
        },
        desktop: {
          scores: getScores(desktopData),
          metrics: this.extractMetrics(desktopData)
        }
      };
    } catch (error) {
      logger.error('Compare strategies error:', error);
      throw error;
    }
  }

  // Parse PageSpeed response
  parsePageSpeedResponse(response) {
    const result = {
      id: response.id,
      loadingExperience: response.loadingExperience,
      originLoadingExperience: response.originLoadingExperience,
      lighthouseResult: response.lighthouseResult,
      analysisUTCTimestamp: response.analysisUTCTimestamp
    };

    // Add field data if available
    if (response.loadingExperience?.metrics) {
      result.fieldData = this.parseFieldData(response.loadingExperience.metrics);
    }

    // Add origin field data if available
    if (response.originLoadingExperience?.metrics) {
      result.originFieldData = this.parseFieldData(response.originLoadingExperience.metrics);
    }

    return result;
  }

  // Parse field data
  parseFieldData(metrics) {
    const data = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      data[key] = {
        percentile: value.percentile,
        distributions: value.distributions?.map(d => ({
          min: d.min,
          max: d.max,
          proportion: d.proportion
        })),
        category: value.category
      };
    }

    return data;
  }

  // Extract key metrics
  extractMetrics(data) {
    const audits = data.lighthouseResult?.audits || {};
    
    return {
      firstContentfulPaint: audits['first-contentful-paint']?.numericValue,
      speedIndex: audits['speed-index']?.numericValue,
      largestContentfulPaint: audits['largest-contentful-paint']?.numericValue,
      timeToInteractive: audits['interactive']?.numericValue,
      totalBlockingTime: audits['total-blocking-time']?.numericValue,
      cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue
    };
  }
}

module.exports = new PageSpeedService();