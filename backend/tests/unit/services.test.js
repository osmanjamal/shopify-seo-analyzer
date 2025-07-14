const { 
  searchConsoleService,
  analyticsService,
  pageSpeedService
} = require('../../src/services/google');
const {
  productsService,
  ordersService,
  storeService
} = require('../../src/services/shopify');
const {
  websiteAnalyzer,
  keywordTracker,
  competitorAnalysis,
  technicalSeo
} = require('../../src/services/analysis');
const {
  emailService,
  slackService,
  alertManager
} = require('../../src/services/notifications');

// Mock external dependencies
jest.mock('googleapis');
jest.mock('@shopify/shopify-api');
jest.mock('nodemailer');
jest.mock('axios');

describe('Google Services', () => {
  describe('Search Console Service', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch search analytics data', async () => {
      const mockData = {
        rows: [
          {
            keys: ['seo optimization'],
            clicks: 100,
            impressions: 1000,
            ctr: 0.1,
            position: 5.2
          }
        ]
      };

      searchConsoleService.searchConsole.searchanalytics.query = jest.fn()
        .mockResolvedValue({ data: mockData });

      const result = await searchConsoleService.getSearchAnalytics({
        siteUrl: 'https://example.com',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].clicks).toBe(100);
    });

    it('should handle API errors gracefully', async () => {
      searchConsoleService.searchConsole.searchanalytics.query = jest.fn()
        .mockRejectedValue(new Error('API Error'));

      await expect(
        searchConsoleService.getSearchAnalytics({
          siteUrl: 'https://example.com'
        })
      ).rejects.toThrow('API Error');
    });

    it('should fetch sitemap data', async () => {
      const mockSitemaps = {
        sitemap: [
          {
            path: 'https://example.com/sitemap.xml',
            lastSubmitted: '2024-01-01T00:00:00Z',
            isPending: false,
            isSitemapsIndex: false,
            lastDownloaded: '2024-01-01T00:00:00Z',
            warnings: 0,
            errors: 0
          }
        ]
      };

      searchConsoleService.searchConsole.sitemaps.list = jest.fn()
        .mockResolvedValue({ data: mockSitemaps });

      const result = await searchConsoleService.getSitemaps('https://example.com');

      expect(result.sitemap).toHaveLength(1);
      expect(result.sitemap[0].errors).toBe(0);
    });

    it('should fetch URL inspection data', async () => {
      const mockInspection = {
        inspectionResult: {
          indexStatusResult: {
            verdict: 'PASS',
            coverageState: 'Indexed',
            robotsTxtState: 'ALLOWED',
            indexingState: 'INDEXED',
            lastCrawlTime: '2024-01-01T00:00:00Z'
          },
          mobileUsabilityResult: {
            verdict: 'PASS',
            issues: []
          }
        }
      };

      searchConsoleService.searchConsole.urlInspection.index.inspect = jest.fn()
        .mockResolvedValue({ data: mockInspection });

      const result = await searchConsoleService.inspectUrl({
        siteUrl: 'https://example.com',
        inspectionUrl: 'https://example.com/page'
      });

      expect(result.inspectionResult.indexStatusResult.verdict).toBe('PASS');
    });
  });

  describe('Analytics Service', () => {
    it('should fetch analytics reports', async () => {
      const mockReport = {
        reports: [{
          data: {
            rows: [
              {
                dimensions: ['20240101'],
                metrics: [{
                  values: ['1000', '500', '0.45', '180']
                }]
              }
            ],
            totals: [{
              values: ['1000', '500', '0.45', '180']
            }]
          }
        }]
      };

      analyticsService.analytics.reports.batchGet = jest.fn()
        .mockResolvedValue({ data: mockReport });

      const result = await analyticsService.getTrafficData({
        viewId: '123456789',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].data.rows).toHaveLength(1);
    });

    it('should fetch real-time data', async () => {
      const mockRealtime = {
        totalsForAllResults: {
          'rt:activeUsers': '45'
        },
        rows: [
          ['/', 'Home Page', '20'],
          ['/products', 'Products', '15']
        ]
      };

      analyticsService.analytics.data.realtime.get = jest.fn()
        .mockResolvedValue({ data: mockRealtime });

      const result = await analyticsService.getRealTimeData('123456789');

      expect(result.totalsForAllResults['rt:activeUsers']).toBe('45');
      expect(result.rows).toHaveLength(2);
    });

    it('should handle pagination for large datasets', async () => {
      const mockFirstPage = {
        reports: [{
          data: {
            rows: Array(10000).fill({
              dimensions: ['test'],
              metrics: [{ values: ['1'] }]
            }),
            rowCount: 15000
          },
          nextPageToken: 'token123'
        }]
      };

      const mockSecondPage = {
        reports: [{
          data: {
            rows: Array(5000).fill({
              dimensions: ['test'],
              metrics: [{ values: ['1'] }]
            })
          }
        }]
      };

      analyticsService.analytics.reports.batchGet = jest.fn()
        .mockResolvedValueOnce({ data: mockFirstPage })
        .mockResolvedValueOnce({ data: mockSecondPage });

      const result = await analyticsService.getTrafficData({
        viewId: '123456789',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeAllPages: true
      });

      expect(analyticsService.analytics.reports.batchGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('PageSpeed Service', () => {
    it('should analyze page speed', async () => {
      const mockPageSpeed = {
        lighthouseResult: {
          categories: {
            performance: { score: 0.92 },
            accessibility: { score: 0.95 },
            'best-practices': { score: 0.88 },
            seo: { score: 0.90 }
          },
          audits: {
            'first-contentful-paint': {
              score: 0.95,
              numericValue: 1200
            },
            'largest-contentful-paint': {
              score: 0.88,
              numericValue: 2500
            }
          }
        }
      };

      pageSpeedService.pagespeed.pagespeedapi.runpagespeed = jest.fn()
        .mockResolvedValue({ data: mockPageSpeed });

      const result = await pageSpeedService.analyzeUrl('https://example.com');

      expect(result.lighthouseResult.categories.performance.score).toBe(0.92);
      expect(result.lighthouseResult.categories.seo.score).toBe(0.90);
    });

    it('should analyze both mobile and desktop', async () => {
      const mockMobile = {
        lighthouseResult: {
          categories: {
            performance: { score: 0.85 }
          }
        }
      };

      const mockDesktop = {
        lighthouseResult: {
          categories: {
            performance: { score: 0.95 }
          }
        }
      };

      pageSpeedService.pagespeed.pagespeedapi.runpagespeed = jest.fn()
        .mockResolvedValueOnce({ data: mockMobile })
        .mockResolvedValueOnce({ data: mockDesktop });

      const result = await pageSpeedService.analyzeUrlBothStrategies('https://example.com');

      expect(result.mobile.lighthouseResult.categories.performance.score).toBe(0.85);
      expect(result.desktop.lighthouseResult.categories.performance.score).toBe(0.95);
    });
  });
});

describe('Shopify Services', () => {
  describe('Products Service', () => {
    it('should fetch all products', async () => {
      const mockProducts = [
        {
          id: 1,
          title: 'Test Product',
          handle: 'test-product',
          vendor: 'Test Vendor',
          product_type: 'Test Type',
          tags: ['tag1', 'tag2']
        }
      ];

      productsService.client.rest.Product.all = jest.fn()
        .mockResolvedValue(mockProducts);

      const result = await productsService.getAllProducts('test-shop');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Product');
    });

    it('should analyze product SEO', async () => {
      const product = {
        id: 1,
        title: 'SEO Optimized Product - Best Quality | Brand Name',
        body_html: '<p>This is a detailed product description with relevant keywords and proper structure.</p>',
        handle: 'seo-optimized-product',
        images: [{ src: 'https://example.com/image.jpg', alt: 'Product image' }],
        metafields_global_title_tag: 'SEO Optimized Product | Buy Online',
        metafields_global_description_tag: 'Buy the best SEO optimized product. High quality, great features, and amazing value.'
      };

      const analysis = await productsService.analyzeProductSEO(product);

      expect(analysis.score).toBeGreaterThan(80);
      expect(analysis.issues).toHaveLength(0);
      expect(analysis.suggestions).toBeDefined();
    });

    it('should identify SEO issues in products', async () => {
      const product = {
        id: 1,
        title: 'Short',
        body_html: '',
        handle: 'p',
        images: [{ src: 'https://example.com/image.jpg', alt: '' }]
      };

      const analysis = await productsService.analyzeProductSEO(product);

      expect(analysis.score).toBeLessThan(50);
      expect(analysis.issues).toContain('Title too short');
      expect(analysis.issues).toContain('Missing product description');
      expect(analysis.issues).toContain('Missing image alt text');
    });
  });

  describe('Orders Service', () => {
    it('should fetch order analytics', async () => {
      const mockOrders = [
        {
          id: 1,
          total_price: '100.00',
          created_at: '2024-01-01T00:00:00Z',
          line_items: [
            { product_id: 1, quantity: 2 }
          ]
        }
      ];

      ordersService.client.rest.Order.all = jest.fn()
        .mockResolvedValue(mockOrders);

      const analytics = await ordersService.getOrderAnalytics('test-shop', {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(analytics.totalOrders).toBe(1);
      expect(analytics.totalRevenue).toBe(100);
      expect(analytics.topProducts).toHaveLength(1);
    });
  });

  describe('Store Service', () => {
    it('should fetch store information', async () => {
      const mockShop = {
        id: 1,
        name: 'Test Store',
        email: 'test@store.com',
        domain: 'test-store.myshopify.com',
        currency: 'USD',
        timezone: 'America/New_York'
      };

      storeService.client.rest.Shop.all = jest.fn()
        .mockResolvedValue([mockShop]);

      const result = await storeService.getStoreInfo('test-shop');

      expect(result.name).toBe('Test Store');
      expect(result.currency).toBe('USD');
    });
  });
});

describe('Analysis Services', () => {
  describe('Website Analyzer', () => {
    it('should perform comprehensive website analysis', async () => {
      const mockWebsiteData = {
        url: 'https://example.com',
        title: 'Example Website - Best Products Online',
        metaDescription: 'Shop the best products online at Example Website. Great prices and fast shipping.',
        h1Tags: ['Welcome to Example Website'],
        images: [
          { src: '/image1.jpg', alt: 'Product image' },
          { src: '/image2.jpg', alt: '' }
        ],
        internalLinks: 50,
        externalLinks: 10,
        wordCount: 500,
        loadTime: 2.5
      };

      websiteAnalyzer.fetchWebsiteData = jest.fn()
        .mockResolvedValue(mockWebsiteData);

      const analysis = await websiteAnalyzer.analyzeWebsite('https://example.com');

      expect(analysis.seoScore).toBeGreaterThan(70);
      expect(analysis.issues).toContain('Missing alt text on 1 image(s)');
      expect(analysis.strengths).toContain('Good title length');
    });
  });

  describe('Keyword Tracker', () => {
    it('should track keyword positions', async () => {
      const mockSearchResults = {
        organic_results: [
          { position: 1, link: 'https://competitor.com' },
          { position: 2, link: 'https://example.com' },
          { position: 3, link: 'https://another.com' }
        ]
      };

      keywordTracker.searchGoogle = jest.fn()
        .mockResolvedValue(mockSearchResults);

      const result = await keywordTracker.trackKeyword({
        keyword: 'test keyword',
        domain: 'example.com',
        country: 'US'
      });

      expect(result.position).toBe(2);
      expect(result.url).toBe('https://example.com');
    });

    it('should handle keywords not in top 100', async () => {
      const mockSearchResults = {
        organic_results: Array(100).fill({
          position: 1,
          link: 'https://other-sites.com'
        })
      };

      keywordTracker.searchGoogle = jest.fn()
        .mockResolvedValue(mockSearchResults);

      const result = await keywordTracker.trackKeyword({
        keyword: 'difficult keyword',
        domain: 'example.com',
        country: 'US'
      });

      expect(result.position).toBeNull();
      expect(result.url).toBeNull();
    });
  });

  describe('Technical SEO', () => {
    it('should identify technical issues', async () => {
      const mockData = {
        statusCode: 200,
        responseTime: 3500,
        https: false,
        robots: 'index, follow',
        sitemap: null,
        canonicalUrl: '',
        structuredData: [],
        mobileViewport: false
      };

      technicalSeo.fetchTechnicalData = jest.fn()
        .mockResolvedValue(mockData);

      const issues = await technicalSeo.analyzeTechnicalSEO('http://example.com');

      expect(issues).toHaveLength(5);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'no_https',
          severity: 'high'
        })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'slow_response_time',
          severity: 'medium'
        })
      );
    });
  });
});

describe('Notification Services', () => {
  describe('Email Service', () => {
    it('should send email notifications', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      emailService.transporter.sendMail = mockSendMail;

      await emailService.sendAlert({
        to: 'user@example.com',
        subject: 'SEO Alert',
        data: {
          website: 'example.com',
          issue: 'Keyword position dropped'
        }
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'SEO Alert'
        })
      );
    });

    it('should use templates for emails', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      emailService.transporter.sendMail = mockSendMail;

      await emailService.sendWeeklyReport({
        to: 'user@example.com',
        data: {
          website: 'example.com',
          metrics: {
            traffic: 1000,
            keywords: 50,
            score: 85
          }
        }
      });

      const sentEmail = mockSendMail.mock.calls[0][0];
      expect(sentEmail.html).toContain('Weekly SEO Report');
      expect(sentEmail.html).toContain('1000');
    });
  });

  describe('Alert Manager', () => {
    it('should trigger alerts based on thresholds', async () => {
      const mockEmailSend = jest.fn().mockResolvedValue(true);
      const mockSlackSend = jest.fn().mockResolvedValue(true);

      alertManager.emailService.sendAlert = mockEmailSend;
      alertManager.slackService.sendAlert = mockSlackSend;

      await alertManager.checkAndTriggerAlerts({
        website: 'example.com',
        metrics: {
          seoScore: 45,
          keywordDrops: 10,
          trafficDrop: 30
        },
        thresholds: {
          seoScore: 70,
          maxKeywordDrops: 5,
          maxTrafficDrop: 20
        }
      });

      expect(mockEmailSend).toHaveBeenCalledTimes(3);
      expect(mockSlackSend).toHaveBeenCalledTimes(3);
    });
  });
});