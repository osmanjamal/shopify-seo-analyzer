const { createShopifyClient, createGraphQLClient, handleRateLimit } = require('../../config/shopify');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { batchArray } = require('../../utils/helpers');

class ShopifyProductsService {
  constructor() {
    this.productsPerPage = 250;
  }

  // Get all products
  async getAllProducts(shop, accessToken, options = {}) {
    try {
      const {
        limit = 250,
        fields = 'id,title,handle,vendor,product_type,created_at,updated_at,published_at,tags,status,variants',
        status = 'active'
      } = options;

      const cacheKey = `shopify:products:${shop}:all`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const client = createShopifyClient(shop, accessToken);
      let products = [];
      let pageInfo = null;

      do {
        const response = await handleRateLimit(async () => {
          return client.get({
            path: 'products',
            query: {
              limit,
              fields,
              status,
              page_info: pageInfo
            }
          });
        });

        products = products.concat(response.body.products);
        pageInfo = response.pageInfo?.nextPage;

      } while (pageInfo);

      await Cache.set(cacheKey, products, TTL.medium);
      return products;

    } catch (error) {
      logger.error('Get all products error:', error);
      throw error;
    }
  }

  // Get product by ID
  async getProduct(shop, accessToken, productId) {
    try {
      const cacheKey = `shopify:product:${shop}:${productId}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const client = createShopifyClient(shop, accessToken);
      
      const response = await handleRateLimit(async () => {
        return client.get({
          path: `products/${productId}`
        });
      });

      const product = response.body.product;
      await Cache.set(cacheKey, product, TTL.short);
      return product;

    } catch (error) {
      logger.error('Get product error:', error);
      throw error;
    }
  }

  // Analyze products for SEO
  async analyzeProductsSEO(shop, accessToken) {
    try {
      const products = await this.getAllProducts(shop, accessToken);
      const analysis = {
        total: products.length,
        issues: [],
        stats: {
          missingDescriptions: 0,
          shortTitles: 0,
          longTitles: 0,
          missingImages: 0,
          duplicateTitles: new Set(),
          missingMetaDescription: 0,
          missingAltText: 0
        }
      };

      const titleMap = new Map();

      for (const product of products) {
        const productIssues = [];

        // Check title
        if (!product.title) {
          productIssues.push({
            type: 'missing_title',
            severity: 'critical'
          });
        } else {
          // Check title length
          if (product.title.length < 20) {
            analysis.stats.shortTitles++;
            productIssues.push({
              type: 'short_title',
              severity: 'medium',
              message: `Title too short: ${product.title.length} characters`
            });
          } else if (product.title.length > 70) {
            analysis.stats.longTitles++;
            productIssues.push({
              type: 'long_title',
              severity: 'low',
              message: `Title too long: ${product.title.length} characters`
            });
          }

          // Check for duplicate titles
          if (titleMap.has(product.title)) {
            analysis.stats.duplicateTitles.add(product.title);
            productIssues.push({
              type: 'duplicate_title',
              severity: 'high',
              message: 'Duplicate product title'
            });
          }
          titleMap.set(product.title, product.id);
        }

        // Check description
        if (!product.body_html || product.body_html.length < 100) {
          analysis.stats.missingDescriptions++;
          productIssues.push({
            type: 'missing_description',
            severity: 'high',
            message: 'Missing or short product description'
          });
        }

        // Check images
        if (!product.images || product.images.length === 0) {
          analysis.stats.missingImages++;
          productIssues.push({
            type: 'missing_images',
            severity: 'high',
            message: 'No product images'
          });
        }

        // Check for SEO meta fields
        if (!product.metafields_global_title_tag) {
          analysis.stats.missingMetaDescription++;
          productIssues.push({
            type: 'missing_meta_title',
            severity: 'medium',
            message: 'Missing SEO meta title'
          });
        }

        if (productIssues.length > 0) {
          analysis.issues.push({
            productId: product.id,
            title: product.title,
            handle: product.handle,
            issues: productIssues
          });
        }
      }

      analysis.stats.duplicateTitles = analysis.stats.duplicateTitles.size;
      analysis.score = this.calculateSEOScore(analysis);

      return analysis;

    } catch (error) {
      logger.error('Analyze products SEO error:', error);
      throw error;
    }
  }

  // Get product metafields
  async getProductMetafields(shop, accessToken, productId) {
    try {
      const client = createShopifyClient(shop, accessToken);
      
      const response = await handleRateLimit(async () => {
        return client.get({
          path: `products/${productId}/metafields`
        });
      });

      return response.body.metafields;

    } catch (error) {
      logger.error('Get product metafields error:', error);
      throw error;
    }
  }

  // Get products with GraphQL for more detailed data
  async getProductsGraphQL(shop, accessToken, first = 50) {
    try {
      const client = createGraphQLClient(shop, accessToken);
      
      const query = `
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                handle
                descriptionHtml
                seo {
                  title
                  description
                }
                featuredImage {
                  altText
                  url
                }
                images(first: 10) {
                  edges {
                    node {
                      altText
                      url
                    }
                  }
                }
                totalInventory
                status
                publishedAt
                tags
                productType
                vendor
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      let products = [];
      let hasNextPage = true;
      let cursor = null;

      while (hasNextPage) {
        const response = await handleRateLimit(async () => {
          return client.query({
            data: {
              query,
              variables: {
                first,
                after: cursor
              }
            }
          });
        });

        const data = response.body.data.products;
        products = products.concat(data.edges.map(edge => edge.node));
        
        hasNextPage = data.pageInfo.hasNextPage;
        cursor = data.pageInfo.endCursor;
      }

      return products;

    } catch (error) {
      logger.error('Get products GraphQL error:', error);
      throw error;
    }
  }

  // Get best selling products
  async getBestSellingProducts(shop, accessToken, limit = 10) {
    try {
      const cacheKey = `shopify:bestsellers:${shop}:${limit}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const client = createGraphQLClient(shop, accessToken);
      
      const query = `
        query getBestSellers($first: Int!) {
          products(first: $first, sortKey: BEST_SELLING) {
            edges {
              node {
                id
                title
                handle
                totalInventory
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await handleRateLimit(async () => {
        return client.query({
          data: {
            query,
            variables: { first: limit }
          }
        });
      });

      const products = response.body.data.products.edges.map(edge => edge.node);
      await Cache.set(cacheKey, products, TTL.medium);
      return products;

    } catch (error) {
      logger.error('Get best selling products error:', error);
      throw error;
    }
  }

  // Get products missing SEO data
  async getProductsMissingSEO(shop, accessToken) {
    try {
      const products = await this.getProductsGraphQL(shop, accessToken);
      
      const missingSEO = products.filter(product => {
        return !product.seo?.title || 
               !product.seo?.description ||
               !product.featuredImage?.altText ||
               product.images.edges.some(img => !img.node.altText);
      });

      return {
        total: products.length,
        missingSEO: missingSEO.length,
        products: missingSEO.map(p => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          missingSeoTitle: !p.seo?.title,
          missingSeoDescription: !p.seo?.description,
          missingImageAlt: !p.featuredImage?.altText || 
                          p.images.edges.some(img => !img.node.altText)
        }))
      };

    } catch (error) {
      logger.error('Get products missing SEO error:', error);
      throw error;
    }
  }

  // Calculate SEO score for products
  calculateSEOScore(analysis) {
    let score = 100;
    const totalProducts = analysis.total;

    if (totalProducts === 0) return 100;

    // Deduct points for issues
    score -= (analysis.stats.missingDescriptions / totalProducts) * 20;
    score -= (analysis.stats.shortTitles / totalProducts) * 10;
    score -= (analysis.stats.longTitles / totalProducts) * 5;
    score -= (analysis.stats.missingImages / totalProducts) * 15;
    score -= (analysis.stats.duplicateTitles / totalProducts) * 15;
    score -= (analysis.stats.missingMetaDescription / totalProducts) * 10;

    return Math.max(0, Math.round(score));
  }
}

module.exports = new ShopifyProductsService();