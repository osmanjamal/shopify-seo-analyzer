const axios = require('axios');
const xml2js = require('xml2js');
const robotsParser = require('robots-parser');
const dns = require('dns').promises;
const { URL } = require('url');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const websiteAnalyzer = require('./websiteAnalyzer');
const pageSpeedService = require('../google/pagespeed');

class TechnicalSEOService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; ShopifySEOAnalyzer/1.0)';
  }

  // Run complete technical SEO audit
  async runAudit(websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      const domain = url.hostname;

      logger.info(`Starting technical SEO audit for ${domain}`);

      // Run all checks in parallel where possible
      const [
        robotsTxt,
        sitemap,
        ssl,
        dns,
        redirects,
        mobileUsability,
        schemaValidation,
        internationalSEO
      ] = await Promise.all([
        this.checkRobotsTxt(websiteUrl),
        this.checkSitemap(websiteUrl),
        this.checkSSL(domain),
        this.checkDNS(domain),
        this.checkRedirects(websiteUrl),
        this.checkMobileUsability(websiteUrl),
        this.validateSchema(websiteUrl),
        this.checkInternationalSEO(websiteUrl)
      ]);

      const audit = {
        url: websiteUrl,
        timestamp: new Date().toISOString(),
        robotsTxt,
        sitemap,
        ssl,
        dns,
        redirects,
        mobileUsability,
        schemaValidation,
        internationalSEO,
        score: this.calculateTechnicalScore({
          robotsTxt,
          sitemap,
          ssl,
          redirects,
          mobileUsability,
          schemaValidation
        })
      };

      return audit;

    } catch (error) {
      logger.error('Technical SEO audit error:', error);
      throw error;
    }
  }

  // Check robots.txt
  async checkRobotsTxt(websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      const robotsUrl = `${url.protocol}//${url.hostname}/robots.txt`;
      
      const response = await axios.get(robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const robots = robotsParser(robotsUrl, response.data);
      
      // Analyze robots.txt
      const lines = response.data.split('\n');
      const analysis = {
        exists: true,
        url: robotsUrl,
        size: response.data.length,
        lineCount: lines.length,
        userAgents: [],
        sitemapReferences: [],
        crawlDelay: null,
        issues: []
      };

      // Parse user agents and rules
      const userAgentMap = new Map();
      let currentAgent = '*';

      lines.forEach(line => {
        const trimmed = line.trim();
        
        if (trimmed.toLowerCase().startsWith('user-agent:')) {
          currentAgent = trimmed.substring(11).trim();
          if (!userAgentMap.has(currentAgent)) {
            userAgentMap.set(currentAgent, {
              name: currentAgent,
              rules: []
            });
          }
        } else if (trimmed.toLowerCase().startsWith('disallow:')) {
          const rule = trimmed.substring(9).trim();
          if (userAgentMap.has(currentAgent)) {
            userAgentMap.get(currentAgent).rules.push({
              type: 'disallow',
              path: rule
            });
          }
        } else if (trimmed.toLowerCase().startsWith('allow:')) {
          const rule = trimmed.substring(6).trim();
          if (userAgentMap.has(currentAgent)) {
            userAgentMap.get(currentAgent).rules.push({
              type: 'allow',
              path: rule
            });
          }
        } else if (trimmed.toLowerCase().startsWith('sitemap:')) {
          analysis.sitemapReferences.push(trimmed.substring(8).trim());
        } else if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
          analysis.crawlDelay = parseInt(trimmed.substring(12).trim());
        }
      });

      analysis.userAgents = Array.from(userAgentMap.values());

      // Check for issues
      if (analysis.size > 500000) {
        analysis.issues.push({
          type: 'large_robots_file',
          severity: 'low',
          message: 'Robots.txt file is very large (>500KB)'
        });
      }

      if (analysis.sitemapReferences.length === 0) {
        analysis.issues.push({
          type: 'no_sitemap_reference',
          severity: 'medium',
          message: 'No sitemap reference found in robots.txt'
        });
      }

      // Check if entire site is blocked
      const allDisallowed = userAgentMap.get('*')?.rules.some(
        rule => rule.type === 'disallow' && rule.path === '/'
      );
      
      if (allDisallowed) {
        analysis.issues.push({
          type: 'site_blocked',
          severity: 'critical',
          message: 'Entire site is blocked for all crawlers'
        });
      }

      return analysis;

    } catch (error) {
      if (error.response?.status === 404) {
        return {
          exists: false,
          issues: [{
            type: 'missing_robots_txt',
            severity: 'low',
            message: 'No robots.txt file found'
          }]
        };
      }
      throw error;
    }
  }

  // Check sitemap
  async checkSitemap(websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      const sitemapUrls = [
        `${url.protocol}//${url.hostname}/sitemap.xml`,
        `${url.protocol}//${url.hostname}/sitemap_index.xml`,
        `${url.protocol}//${url.hostname}/sitemap/sitemap.xml`
      ];

      let sitemapData = null;
      let sitemapUrl = null;

      // Try to find sitemap
      for (const testUrl of sitemapUrls) {
        try {
          const response = await axios.get(testUrl, {
            headers: { 'User-Agent': this.userAgent },
            timeout: 10000
          });
          sitemapData = response.data;
          sitemapUrl = testUrl;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!sitemapData) {
        return {
          exists: false,
          issues: [{
            type: 'missing_sitemap',
            severity: 'high',
            message: 'No sitemap.xml file found'
          }]
        };
      }

      // Parse sitemap
      const parser = new xml2js.Parser();
      const parsed = await parser.parseStringPromise(sitemapData);
      
      const analysis = {
        exists: true,
        url: sitemapUrl,
        type: parsed.sitemapindex ? 'index' : 'urlset',
        urlCount: 0,
        issues: [],
        sitemaps: []
      };

      if (parsed.sitemapindex) {
        // Sitemap index
        analysis.sitemaps = parsed.sitemapindex.sitemap.map(s => ({
          loc: s.loc[0],
          lastmod: s.lastmod ? s.lastmod[0] : null
        }));
        analysis.urlCount = analysis.sitemaps.length;
      } else if (parsed.urlset) {
        // Regular sitemap
        analysis.urlCount = parsed.urlset.url ? parsed.urlset.url.length : 0;
        
        // Sample URLs for analysis
        const sampleUrls = parsed.urlset.url?.slice(0, 10).map(u => ({
          loc: u.loc[0],
          lastmod: u.lastmod ? u.lastmod[0] : null,
          changefreq: u.changefreq ? u.changefreq[0] : null,
          priority: u.priority ? u.priority[0] : null
        }));
        
        analysis.sampleUrls = sampleUrls;
      }

      // Check for issues
      if (analysis.urlCount === 0) {
        analysis.issues.push({
          type: 'empty_sitemap',
          severity: 'high',
          message: 'Sitemap contains no URLs'
        });
      } else if (analysis.urlCount > 50000) {
        analysis.issues.push({
          type: 'large_sitemap',
          severity: 'medium',
          message: `Sitemap contains ${analysis.urlCount} URLs (limit is 50,000)`
        });
      }

      return analysis;

    } catch (error) {
      logger.error('Sitemap check error:', error);
      return {
        exists: false,
        error: error.message,
        issues: [{
          type: 'sitemap_error',
          severity: 'high',
          message: 'Error accessing or parsing sitemap'
        }]
      };
    }
  }

  // Check SSL certificate
  async checkSSL(domain) {
    try {
      const response = await axios.get(`https://${domain}`, {
        timeout: 10000,
        maxRedirects: 0,
        validateStatus: () => true
      });

      const analysis = {
        enabled: true,
        issues: []
      };

      // Check for mixed content by analyzing the page
      if (response.status === 200) {
        const mixedContentRegex = /src=["']http:\/\/|href=["']http:\/\//gi;
        const hasMixedContent = mixedContentRegex.test(response.data);
        
        if (hasMixedContent) {
          analysis.issues.push({
            type: 'mixed_content',
            severity: 'high',
            message: 'Page contains mixed content (HTTP resources on HTTPS page)'
          });
        }
      }

      return analysis;

    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          enabled: false,
          issues: [{
            type: 'no_ssl',
            severity: 'critical',
            message: 'HTTPS is not enabled or accessible'
          }]
        };
      }
      throw error;
    }
  }

  // Check DNS settings
  async checkDNS(domain) {
    try {
      const [aRecords, aaaaRecords, cnameRecords, mxRecords, txtRecords] = await Promise.all([
        dns.resolve4(domain).catch(() => []),
        dns.resolve6(domain).catch(() => []),
        dns.resolveCname(domain).catch(() => []),
        dns.resolveMx(domain).catch(() => []),
        dns.resolveTxt(domain).catch(() => [])
      ]);

      const analysis = {
        aRecords,
        aaaaRecords,
        cnameRecords,
        mxRecords: mxRecords.map(mx => ({ exchange: mx.exchange, priority: mx.priority })),
        txtRecords: txtRecords.flat(),
        issues: []
      };

      // Check for SPF record
      const spfRecord = analysis.txtRecords.find(txt => txt.includes('v=spf1'));
      if (!spfRecord && mxRecords.length > 0) {
        analysis.issues.push({
          type: 'missing_spf',
          severity: 'low',
          message: 'No SPF record found (recommended for email deliverability)'
        });
      }

      // Check for multiple A records (load balancing)
      if (aRecords.length > 1) {
        analysis.loadBalanced = true;
      }

      return analysis;

    } catch (error) {
      logger.error('DNS check error:', error);
      return {
        error: error.message,
        issues: [{
          type: 'dns_error',
          severity: 'critical',
          message: 'DNS resolution failed'
        }]
      };
    }
  }

  // Check redirects
  async checkRedirects(websiteUrl) {
    try {
      const checks = [];
      const url = new URL(websiteUrl);
      
      // Check WWW to non-WWW or vice versa
      const wwwVariant = url.hostname.startsWith('www.') 
        ? url.hostname.substring(4)
        : `www.${url.hostname}`;
      
      // Check HTTP to HTTPS
      const httpUrl = `http://${url.hostname}${url.pathname}`;
      const httpsUrl = `https://${url.hostname}${url.pathname}`;
      
      const redirectChains = [];
      
      // Test redirect scenarios
      const testUrls = [
        { from: httpUrl, to: httpsUrl, type: 'http_to_https' },
        { from: `http://${wwwVariant}`, to: websiteUrl, type: 'www_redirect' }
      ];

      for (const test of testUrls) {
        try {
          const chain = await this.followRedirectChain(test.from);
          redirectChains.push({
            type: test.type,
            from: test.from,
            chain,
            finalUrl: chain[chain.length - 1]?.url || test.from,
            chainLength: chain.length
          });
        } catch (error) {
          // Ignore errors for redirect checks
        }
      }

      const issues = [];
      
      // Check for redirect chains
      redirectChains.forEach(redirect => {
        if (redirect.chainLength > 2) {
          issues.push({
            type: 'long_redirect_chain',
            severity: 'medium',
            message: `Redirect chain too long: ${redirect.chainLength} redirects`,
            details: redirect
          });
        }
      });

      // Check if HTTP redirects to HTTPS
      const httpToHttps = redirectChains.find(r => r.type === 'http_to_https');
      if (httpToHttps && !httpToHttps.finalUrl.startsWith('https://')) {
        issues.push({
          type: 'no_https_redirect',
          severity: 'high',
          message: 'HTTP does not redirect to HTTPS'
        });
      }

      return {
        redirectChains,
        issues
      };

    } catch (error) {
      logger.error('Redirect check error:', error);
      return {
        error: error.message,
        issues: []
      };
    }
  }

  // Follow redirect chain
  async followRedirectChain(url, maxRedirects = 5) {
    const chain = [];
    let currentUrl = url;
    
    for (let i = 0; i < maxRedirects; i++) {
      try {
        const response = await axios.get(currentUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status < 400,
          headers: { 'User-Agent': this.userAgent },
          timeout: 5000
        });

        const status = response.status;
        
        if (status >= 300 && status < 400) {
          const location = response.headers.location;
          if (location) {
            chain.push({
              url: currentUrl,
              status,
              location
            });
            currentUrl = new URL(location, currentUrl).href;
          } else {
            break;
          }
        } else {
          chain.push({
            url: currentUrl,
            status,
            final: true
          });
          break;
        }
      } catch (error) {
        if (error.response?.status >= 300 && error.response?.status < 400) {
          const location = error.response.headers.location;
          if (location) {
            chain.push({
              url: currentUrl,
              status: error.response.status,
              location
            });
            currentUrl = new URL(location, currentUrl).href;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    return chain;
  }

  // Check mobile usability
  async checkMobileUsability(websiteUrl) {
    try {
      // Get PageSpeed mobile data
      const pageSpeedData = await pageSpeedService.analyze(websiteUrl, {
        strategy: 'mobile',
        categories: ['performance', 'accessibility']
      });

      const mobileScore = pageSpeedData.lighthouseResult?.categories?.performance?.score || 0;
      const issues = [];

      // Check viewport
      const hasViewport = pageSpeedData.lighthouseResult?.audits?.viewport?.score === 1;
      if (!hasViewport) {
        issues.push({
          type: 'missing_viewport',
          severity: 'high',
          message: 'Viewport meta tag is missing or incorrectly configured'
        });
      }

      // Check text size
      const textSize = pageSpeedData.lighthouseResult?.audits?.['font-size']?.score;
      if (textSize !== null && textSize < 1) {
        issues.push({
          type: 'small_text',
          severity: 'medium',
          message: 'Text is too small for mobile devices'
        });
      }

      // Check tap targets
      const tapTargets = pageSpeedData.lighthouseResult?.audits?.['tap-targets']?.score;
      if (tapTargets !== null && tapTargets < 1) {
        issues.push({
          type: 'small_tap_targets',
          severity: 'medium',
          message: 'Tap targets are too small for mobile devices'
        });
      }

      return {
        score: mobileScore,
        hasViewport,
        issues
      };

    } catch (error) {
      logger.error('Mobile usability check error:', error);
      return {
        error: error.message,
        issues: []
      };
    }
  }

  // Validate schema markup
  async validateSchema(websiteUrl) {
    try {
      const analysis = await websiteAnalyzer.analyzeWebsite(websiteUrl);
      const structuredData = analysis.structuredData;

      const validation = {
        hasSchema: structuredData.found,
        types: structuredData.types,
        issues: structuredData.issues
      };

      // Additional validation for specific schema types
      if (structuredData.data) {
        structuredData.data.forEach(item => {
          if (item.type === 'JSON-LD' && item.data) {
            // Check for required properties based on schema type
            const schemaType = item.data['@type'];
            
            if (schemaType === 'Product') {
              const required = ['name', 'image', 'description'];
              const missing = required.filter(prop => !item.data[prop]);
              
              if (missing.length > 0) {
                validation.issues.push({
                  type: 'incomplete_product_schema',
                  severity: 'medium',
                  message: `Product schema missing required properties: ${missing.join(', ')}`
                });
              }
            }
          }
        });
      }

      return validation;

    } catch (error) {
      logger.error('Schema validation error:', error);
      return {
        error: error.message,
        issues: []
      };
    }
  }

  // Check international SEO
  async checkInternationalSEO(websiteUrl) {
    try {
      const analysis = await websiteAnalyzer.analyzeWebsite(websiteUrl);
      const $ = require('cheerio').load((await axios.get(websiteUrl)).data);

      const intlSEO = {
        hreflang: [],
        issues: []
      };

      // Check hreflang tags
      $('link[rel="alternate"][hreflang]').each((i, elem) => {
        const hreflang = $(elem).attr('hreflang');
        const href = $(elem).attr('href');
        
        intlSEO.hreflang.push({
          lang: hreflang,
          url: href
        });
      });

      // Check HTML lang attribute
      const htmlLang = $('html').attr('lang');
      if (!htmlLang) {
        intlSEO.issues.push({
          type: 'missing_html_lang',
          severity: 'medium',
          message: 'HTML lang attribute is missing'
        });
      }

      intlSEO.htmlLang = htmlLang;

      // Check for hreflang issues
      if (intlSEO.hreflang.length > 0) {
        // Check for x-default
        const hasDefault = intlSEO.hreflang.some(h => h.lang === 'x-default');
        if (!hasDefault) {
          intlSEO.issues.push({
            type: 'missing_hreflang_default',
            severity: 'low',
            message: 'No x-default hreflang tag found'
          });
        }

        // Check for self-referencing hreflang
        const selfRef = intlSEO.hreflang.find(h => h.url === websiteUrl);
        if (!selfRef) {
          intlSEO.issues.push({
            type: 'missing_self_hreflang',
            severity: 'medium',
            message: 'No self-referencing hreflang tag found'
          });
        }
      }

      return intlSEO;

    } catch (error) {
      logger.error('International SEO check error:', error);
      return {
        error: error.message,
        issues: []
      };
    }
  }

  // Calculate technical SEO score
  calculateTechnicalScore(results) {
    let score = 100;
    let deductions = 0;

    // Calculate deductions based on issues
    Object.values(results).forEach(result => {
      if (result.issues) {
        result.issues.forEach(issue => {
          switch (issue.severity) {
            case 'critical':
              deductions += 20;
              break;
            case 'high':
              deductions += 10;
              break;
            case 'medium':
              deductions += 5;
              break;
            case 'low':
              deductions += 2;
              break;
          }
        });
      }
    });

    score = Math.max(0, score - deductions);
    return Math.round(score);
  }
}

module.exports = new TechnicalSEOService();