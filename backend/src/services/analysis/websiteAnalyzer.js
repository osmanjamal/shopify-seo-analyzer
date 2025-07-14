const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { retry } = require('../../utils/helpers');

class WebsiteAnalyzer {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; ShopifySEOAnalyzer/1.0; +https://shopifyseo.com/bot)';
    this.timeout = 30000;
  }

  // Analyze website
  async analyzeWebsite(url) {
    try {
      const cacheKey = `website:analysis:${url}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      // Fetch page content
      const response = await this.fetchPage(url);
      const $ = cheerio.load(response.data);

      // Run all analyses
      const [
        meta,
        headings,
        images,
        links,
        structuredData,
        social,
        technical
      ] = await Promise.all([
        this.analyzeMeta($, url),
        this.analyzeHeadings($),
        this.analyzeImages($, url),
        this.analyzeLinks($, url),
        this.analyzeStructuredData($),
        this.analyzeSocialMeta($),
        this.analyzeTechnical($, response)
      ]);

      const analysis = {
        url,
        timestamp: new Date().toISOString(),
        meta,
        headings,
        images,
        links,
        structuredData,
        social,
        technical
      };

      await Cache.set(cacheKey, analysis, TTL.medium);
      return analysis;

    } catch (error) {
      logger.error('Website analysis error:', error);
      throw error;
    }
  }

  // Fetch page content
  async fetchPage(url) {
    return retry(async () => {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      return response;
    }, {
      maxAttempts: 3,
      delay: 1000
    });
  }

  // Analyze meta tags
  analyzeMeta($, url) {
    const meta = {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      robots: $('meta[name="robots"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || '',
      lang: $('html').attr('lang') || '',
      charset: $('meta[charset]').attr('charset') || '',
      viewport: $('meta[name="viewport"]').attr('content') || ''
    };

    // Analyze meta issues
    const issues = [];

    // Title checks
    if (!meta.title) {
      issues.push({
        type: 'missing_title',
        severity: 'critical',
        message: 'Page title is missing'
      });
    } else if (meta.title.length < 30) {
      issues.push({
        type: 'title_too_short',
        severity: 'medium',
        message: `Title is too short (${meta.title.length} characters, recommended: 30-60)`
      });
    } else if (meta.title.length > 60) {
      issues.push({
        type: 'title_too_long',
        severity: 'medium',
        message: `Title is too long (${meta.title.length} characters, recommended: 30-60)`
      });
    }

    // Description checks
    if (!meta.description) {
      issues.push({
        type: 'missing_description',
        severity: 'high',
        message: 'Meta description is missing'
      });
    } else if (meta.description.length < 120) {
      issues.push({
        type: 'description_too_short',
        severity: 'low',
        message: `Description is too short (${meta.description.length} characters, recommended: 120-160)`
      });
    } else if (meta.description.length > 160) {
      issues.push({
        type: 'description_too_long',
        severity: 'low',
        message: `Description is too long (${meta.description.length} characters, recommended: 120-160)`
      });
    }

    // Canonical check
    if (!meta.canonical) {
      issues.push({
        type: 'missing_canonical',
        severity: 'medium',
        message: 'Canonical URL is missing'
      });
    } else if (meta.canonical !== url && !url.includes(meta.canonical)) {
      issues.push({
        type: 'canonical_mismatch',
        severity: 'high',
        message: 'Canonical URL does not match current URL'
      });
    }

    // Viewport check
    if (!meta.viewport) {
      issues.push({
        type: 'missing_viewport',
        severity: 'high',
        message: 'Viewport meta tag is missing (mobile responsiveness issue)'
      });
    }

    return { ...meta, issues };
  }

  // Analyze headings
  analyzeHeadings($) {
    const headings = {
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      structure: []
    };

    // Collect all headings
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const tag = elem.tagName.toLowerCase();
      const text = $(elem).text().trim();
      
      if (text) {
        headings[tag].push(text);
        headings.structure.push({ tag, text, index: i });
      }
    });

    // Analyze heading issues
    const issues = [];

    // H1 checks
    if (headings.h1.length === 0) {
      issues.push({
        type: 'missing_h1',
        severity: 'high',
        message: 'Page is missing an H1 tag'
      });
    } else if (headings.h1.length > 1) {
      issues.push({
        type: 'multiple_h1',
        severity: 'medium',
        message: `Page has ${headings.h1.length} H1 tags (should have only 1)`
      });
    }

    // Check heading hierarchy
    let previousLevel = 0;
    headings.structure.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tag.charAt(1));
      
      if (currentLevel > previousLevel + 1 && previousLevel > 0) {
        issues.push({
          type: 'heading_hierarchy',
          severity: 'low',
          message: `Heading hierarchy issue at position ${index + 1}: ${heading.tag} follows h${previousLevel}`
        });
      }
      
      previousLevel = currentLevel;
    });

    return { ...headings, issues };
  }

  // Analyze images
  analyzeImages($, baseUrl) {
    const images = [];
    const issues = [];
    let missingAltCount = 0;

    
    $('img').each((i, elem) => {
      const $img = $(elem);
      const src = $img.attr('src');
      const alt = $img.attr('alt');
      const title = $img.attr('title');
      const width = $img.attr('width');
      const height = $img.attr('height');
      const loading = $img.attr('loading');

      if (src) {
        const absoluteSrc = this.resolveUrl(src, baseUrl);
        
        const imageData = {
          src: absoluteSrc,
          alt: alt || '',
          title: title || '',
          width,
          height,
          loading,
          hasAlt: alt !== undefined
        };

        images.push(imageData);

        // Check for missing alt text
        if (!alt) {
          missingAltCount++;
        }

        // Check for lazy loading
        if (!loading && i > 3) { // Images after the first 3 should lazy load
          issues.push({
            type: 'missing_lazy_loading',
            severity: 'low',
            message: `Image ${src} is missing lazy loading attribute`,
            element: src
          });
        }
      }
    });

    if (missingAltCount > 0) {
      issues.push({
        type: 'missing_alt_text',
        severity: 'high',
        message: `${missingAltCount} images are missing alt text`,
        count: missingAltCount
      });
    }

    return {
      total: images.length,
      images: images.slice(0, 50), // Return first 50 images
      missingAlt: missingAltCount,
      issues
    };
  }

  // Analyze links
  analyzeLinks($, baseUrl) {
    const links = {
      internal: [],
      external: [],
      broken: [],
      nofollow: []
    };

    const baseHost = new URL(baseUrl).hostname;

    $('a[href]').each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const text = $link.text().trim();
      const rel = $link.attr('rel') || '';
      const target = $link.attr('target');

      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        try {
          const absoluteUrl = this.resolveUrl(href, baseUrl);
          const linkHost = new URL(absoluteUrl).hostname;
          
          const linkData = {
            url: absoluteUrl,
            text: text || '[No text]',
            rel,
            target,
            nofollow: rel.includes('nofollow')
          };

          if (linkHost === baseHost) {
            links.internal.push(linkData);
          } else {
            links.external.push(linkData);
          }

          if (rel.includes('nofollow')) {
            links.nofollow.push(linkData);
          }

        } catch (error) {
          links.broken.push({
            url: href,
            text: text || '[No text]',
            error: error.message
          });
        }
      }
    });

    const issues = [];

    // Check for broken links
    if (links.broken.length > 0) {
      issues.push({
        type: 'broken_links',
        severity: 'high',
        message: `Found ${links.broken.length} broken links`,
        count: links.broken.length
      });
    }

    // Check external links without nofollow
    const externalWithoutNofollow = links.external.filter(link => !link.nofollow).length;
    if (externalWithoutNofollow > 10) {
      issues.push({
        type: 'external_links_without_nofollow',
        severity: 'low',
        message: `${externalWithoutNofollow} external links without nofollow attribute`,
        count: externalWithoutNofollow
      });
    }

    return {
      internal: {
        count: links.internal.length,
        links: links.internal.slice(0, 20)
      },
      external: {
        count: links.external.length,
        links: links.external.slice(0, 20)
      },
      broken: links.broken,
      nofollow: {
        count: links.nofollow.length,
        links: links.nofollow.slice(0, 10)
      },
      issues
    };
  }

  // Analyze structured data
  analyzeStructuredData($) {
    const structuredData = [];
    const issues = [];

    // Find JSON-LD scripts
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        structuredData.push({
          type: 'JSON-LD',
          data,
          valid: true
        });
      } catch (error) {
        issues.push({
          type: 'invalid_json_ld',
          severity: 'high',
          message: 'Invalid JSON-LD structured data',
          error: error.message
        });
      }
    });

    // Check microdata
    const hasItemscope = $('[itemscope]').length > 0;
    if (hasItemscope) {
      structuredData.push({
        type: 'Microdata',
        count: $('[itemscope]').length
      });
    }

    // Check RDFa
    const hasRDFa = $('[typeof], [property], [vocab]').length > 0;
    if (hasRDFa) {
      structuredData.push({
        type: 'RDFa',
        count: $('[typeof], [property], [vocab]').length
      });
    }

    if (structuredData.length === 0) {
      issues.push({
        type: 'missing_structured_data',
        severity: 'medium',
        message: 'No structured data found on the page'
      });
    }

    return {
      found: structuredData.length > 0,
      types: structuredData.map(sd => sd.type),
      data: structuredData,
      issues
    };
  }

  // Analyze social meta tags
  analyzeSocialMeta($) {
    const social = {
      openGraph: {},
      twitter: {},
      schema: {}
    };

    // Open Graph tags
    $('meta[property^="og:"]').each((i, elem) => {
      const property = $(elem).attr('property').replace('og:', '');
      social.openGraph[property] = $(elem).attr('content');
    });

    // Twitter Card tags
    $('meta[name^="twitter:"]').each((i, elem) => {
      const name = $(elem).attr('name').replace('twitter:', '');
      social.twitter[name] = $(elem).attr('content');
    });

    const issues = [];

    // Check essential OG tags
    const essentialOG = ['title', 'description', 'image', 'url'];
    const missingOG = essentialOG.filter(tag => !social.openGraph[tag]);
    
    if (missingOG.length > 0) {
      issues.push({
        type: 'missing_og_tags',
        severity: 'medium',
        message: `Missing Open Graph tags: ${missingOG.join(', ')}`,
        missing: missingOG
      });
    }

    // Check Twitter Card
    if (!social.twitter.card) {
      issues.push({
        type: 'missing_twitter_card',
        severity: 'low',
        message: 'Twitter Card meta tags are missing'
      });
    }

    return { ...social, issues };
  }

  // Analyze technical aspects
  async analyzeTechnical($, response) {
    const technical = {
      responseTime: response.headers['x-response-time'] || null,
      server: response.headers['server'] || null,
      contentType: response.headers['content-type'] || null,
      contentLength: response.headers['content-length'] || null,
      compression: response.headers['content-encoding'] || null,
      caching: {
        cacheControl: response.headers['cache-control'] || null,
        expires: response.headers['expires'] || null,
        etag: response.headers['etag'] || null
      },
      security: {
        https: response.request.protocol === 'https:',
        hsts: response.headers['strict-transport-security'] || null,
        xFrameOptions: response.headers['x-frame-options'] || null,
        xContentTypeOptions: response.headers['x-content-type-options'] || null,
        xXssProtection: response.headers['x-xss-protection'] || null
      }
    };

    const issues = [];

    // HTTPS check
    if (!technical.security.https) {
      issues.push({
        type: 'no_https',
        severity: 'critical',
        message: 'Website is not using HTTPS'
      });
    }

    // Compression check
    if (!technical.compression) {
      issues.push({
        type: 'no_compression',
        severity: 'high',
        message: 'Response is not compressed (gzip/deflate)'
      });
    }

    // Cache headers check
    if (!technical.caching.cacheControl && !technical.caching.expires) {
      issues.push({
        type: 'no_cache_headers',
        severity: 'medium',
        message: 'No cache headers found'
      });
    }

    // Security headers
    if (!technical.security.hsts && technical.security.https) {
      issues.push({
        type: 'missing_hsts',
        severity: 'medium',
        message: 'HSTS header is missing'
      });
    }

    return { ...technical, issues };
  }

  // Resolve relative URLs
  resolveUrl(url, baseUrl) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }
}

module.exports = new WebsiteAnalyzer();