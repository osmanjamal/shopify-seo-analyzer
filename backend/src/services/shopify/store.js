const { createShopifyClient, createGraphQLClient, handleRateLimit } = require('../../config/shopify');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');

class ShopifyStoreService {
  // Get store information
  async getStoreInfo(shop, accessToken) {
    try {
      const cacheKey = `shopify:store:${shop}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const client = createShopifyClient(shop, accessToken);
      
      const response = await handleRateLimit(async () => {
        return client.get({
          path: 'shop'
        });
      });

      const storeInfo = response.body.shop;
      await Cache.set(cacheKey, storeInfo, TTL.long);
      return storeInfo;

    } catch (error) {
      logger.error('Get store info error:', error);
      throw error;
    }
  }

  // Get store policies
  async getStorePolicies(shop, accessToken) {
    try {
      const client = createShopifyClient(shop, accessToken);
      
      const response = await handleRateLimit(async () => {
        return client.get({
          path: 'policies'
        });
      });

      return response.body.policies;

    } catch (error) {
      logger.error('Get store policies error:', error);
      throw error;
    }
  }

  // Get store themes
  async getThemes(shop, accessToken) {
    try {
      const client = createShopifyClient(shop, accessToken);
      
      const response = await handleRateLimit(async () => {
        return client.get({
          path: 'themes'
        });
      });

      const themes = response.body.themes;
      
      // Find active theme
      const activeTheme = themes.find(theme => theme.role === 'main');
      
      return {
        themes,
        activeTheme
      };

    } catch (error) {
      logger.error('Get themes error:', error);
      throw error;
    }
  }

  // Get store locations
  async getLocations(shop, accessToken) {
    try {
      const client = createShopifyClient(shop, accessToken);
      
      const response = await handleRateLimit(async () => {
        return client.get({
          path: 'locations'
        });
      });

      return response.body.locations;

    } catch (error) {
      logger.error('Get locations error:', error);
      throw error;
    }
  }

  // Get store collections
  async getCollections(shop, accessToken, options = {}) {
    try {
      const { limit = 250, collection_type = 'custom' } = options;
      
      const client = createShopifyClient(shop, accessToken);
      
      const collections = [];
      const paths = collection_type === 'smart' 
        ? ['smart_collections'] 
        : collection_type === 'all' 
          ? ['custom_collections', 'smart_collections']
          : ['custom_collections'];

      for (const path of paths) {
        let pageInfo = null;
        
        do {
          const query = { limit };
          if (pageInfo) query.page_info = pageInfo;

          const response = await handleRateLimit(async () => {
            return client.get({
              path,
              query
            });
          });

          const collectionKey = path.replace('_', '');
          collections.push(...(response.body[path] || []));
          pageInfo = response.pageInfo?.nextPage;

        } while (pageInfo);
      }

      return collections;

    } catch (error) {
      logger.error('Get collections error:', error);
      throw error;
    }
  }

  // Analyze store SEO health
  async analyzeStoreSEO(shop, accessToken) {
    try {
      const [storeInfo, themes, policies] = await Promise.all([
        this.getStoreInfo(shop, accessToken),
        this.getThemes(shop, accessToken),
        this.getStorePolicies(shop, accessToken)
      ]);

      const analysis = {
        store: {
          name: storeInfo.name,
          domain: storeInfo.domain,
          email: storeInfo.email
        },
        seoIssues: [],
        score: 100
      };

      // Check store meta description
      if (!storeInfo.meta_description || storeInfo.meta_description.length < 120) {
        analysis.seoIssues.push({
          type: 'store_meta_description',
          severity: 'high',
          message: 'Store meta description is missing or too short'
        });
        analysis.score -= 15;
      }

      // Check if store has custom domain
      if (storeInfo.domain.includes('.myshopify.com')) {
        analysis.seoIssues.push({
          type: 'default_domain',
          severity: 'medium',
          message: 'Store is using default Shopify domain'
        });
        analysis.score -= 10;
      }

      // Check policies
      const requiredPolicies = ['refund_policy', 'privacy_policy', 'terms_of_service'];
      for (const policy of requiredPolicies) {
        if (!policies[policy] || policies[policy].body.length < 500) {
          analysis.seoIssues.push({
            type: `missing_${policy}`,
            severity: 'medium',
            message: `${policy.replace('_', ' ')} is missing or too short`
          });
          analysis.score -= 5;
        }
      }

      // Check theme optimization
      if (themes.activeTheme) {
        analysis.theme = {
          name: themes.activeTheme.name,
          id: themes.activeTheme.id,
          updated_at: themes.activeTheme.updated_at
        };
      }

      analysis.score = Math.max(0, analysis.score);
      return analysis;

    } catch (error) {
      logger.error('Analyze store SEO error:', error);
      throw error;
    }
  }

  // Get store metrics
  async getStoreMetrics(shop, accessToken) {
    try {
      const client = createGraphQLClient(shop, accessToken);
      
      const query = `
        query getStoreMetrics {
          shop {
            name
            productCount
            collectionCount: collections(first: 1) {
              edges {
                node {
                  id
                }
              }
              pageInfo {
                hasNextPage
              }
              totalCount
            }
            customerCount: customers(first: 1) {
              totalCount
            }
            draftOrderCount: draftOrders(first: 1) {
              totalCount
            }
            inventoryItems(first: 1) {
              totalCount
            }
          }
        }
      `;

      const response = await handleRateLimit(async () => {
        return client.query({
          data: { query }
        });
      });

      const shopData = response.body.data.shop;
      
      return {
        products: shopData.productCount || 0,
        collections: shopData.collectionCount?.totalCount || 0,
        customers: shopData.customerCount?.totalCount || 0,
        draftOrders: shopData.draftOrderCount?.totalCount || 0,
        inventoryItems: shopData.inventoryItems?.totalCount || 0
      };

    } catch (error) {
      logger.error('Get store metrics error:', error);
      throw error;
    }
  }

  // Get store navigation
  async getNavigation(shop, accessToken) {
    try {
      const client = createShopifyClient(shop, accessToken);
      
      // Get online store navigation
      const response = await handleRateLimit(async () => {
        return client.get({
          path: 'online_store/menus'
        });
      });

      const menus = response.body.menus || [];
      
      // Get menu items for each menu
      const navigationData = [];
      
      for (const menu of menus) {
        const itemsResponse = await handleRateLimit(async () => {
          return client.get({
            path: `online_store/menus/${menu.id}/menu_items`
          });
        });

        navigationData.push({
          id: menu.id,
          title: menu.title,
          handle: menu.handle,
          items: itemsResponse.body.menu_items || []
        });
      }

      return navigationData;

    } catch (error) {
      logger.error('Get navigation error:', error);
      throw error;
    }
  }

  // Get store pages
  async getPages(shop, accessToken, options = {}) {
    try {
      const { limit = 250 } = options;
      
      const client = createShopifyClient(shop, accessToken);
      let pages = [];
      let pageInfo = null;

      do {
        const query = { limit };
        if (pageInfo) query.page_info = pageInfo;

        const response = await handleRateLimit(async () => {
          return client.get({
            path: 'pages',
            query
          });
        });

        pages = pages.concat(response.body.pages);
        pageInfo = response.pageInfo?.nextPage;

      } while (pageInfo);

      // Analyze pages for SEO
      const pagesWithSEO = pages.map(page => ({
        id: page.id,
        title: page.title,
        handle: page.handle,
        published: page.published_at !== null,
        seoIssues: []
      }));

      // Check for SEO issues
      for (const page of pagesWithSEO) {
        if (page.title.length < 30) {
          page.seoIssues.push('Title too short');
        }
        if (page.title.length > 60) {
          page.seoIssues.push('Title too long');
        }
      }

      return pagesWithSEO;

    } catch (error) {
      logger.error('Get pages error:', error);
      throw error;
    }
  }

  // Get store blog posts
  async getBlogPosts(shop, accessToken, options = {}) {
    try {
      const { limit = 250 } = options;
      
      const client = createShopifyClient(shop, accessToken);
      
      // First get all blogs
      const blogsResponse = await handleRateLimit(async () => {
        return client.get({
          path: 'blogs'
        });
      });

      const blogs = blogsResponse.body.blogs || [];
      const allArticles = [];

      // Get articles for each blog
      for (const blog of blogs) {
        let pageInfo = null;
        
        do {
          const query = { limit };
          if (pageInfo) query.page_info = pageInfo;

          const response = await handleRateLimit(async () => {
            return client.get({
              path: `blogs/${blog.id}/articles`,
              query
            });
          });

          const articles = response.body.articles || [];
          allArticles.push(...articles.map(article => ({
            ...article,
            blog_id: blog.id,
            blog_title: blog.title
          })));
          
          pageInfo = response.pageInfo?.nextPage;

        } while (pageInfo);
      }

      return {
        blogs,
        articles: allArticles
      };

    } catch (error) {
      logger.error('Get blog posts error:', error);
      throw error;
    }
  }
}

module.exports = new ShopifyStoreService();