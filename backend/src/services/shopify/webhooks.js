const crypto = require('crypto');
const { createShopifyClient, handleRateLimit, verifyWebhook } = require('../../config/shopify');
const Website = require('../../models/Website');
const logger = require('../../utils/logger');
const { Cache } = require('../../utils/cache');
const { addJob } = require('../../utils/scheduler');

class ShopifyWebhooksService {
  constructor() {
    this.webhookTopics = [
      'PRODUCTS_CREATE',
      'PRODUCTS_UPDATE',
      'PRODUCTS_DELETE',
      'COLLECTIONS_CREATE',
      'COLLECTIONS_UPDATE',
      'COLLECTIONS_DELETE',
      'ORDERS_CREATE',
      'ORDERS_UPDATED',
      'ORDERS_CANCELLED',
      'APP_UNINSTALLED',
      'SHOP_UPDATE',
      'THEMES_PUBLISH'
    ];
  }

  // Register webhooks for a shop
  async registerWebhooks(shop, accessToken) {
    try {
      const client = createShopifyClient(shop, accessToken);
      const registeredWebhooks = [];

      for (const topic of this.webhookTopics) {
        try {
          const webhookData = {
            webhook: {
              topic: topic.toLowerCase().replace('_', '/'),
              address: `${process.env.APP_URL}/api/shopify/webhooks/${topic.toLowerCase()}`,
              format: 'json'
            }
          };

          const response = await handleRateLimit(async () => {
            return client.post({
              path: 'webhooks',
              data: webhookData
            });
          });

          registeredWebhooks.push(response.body.webhook);
          logger.info(`Registered webhook ${topic} for ${shop}`);

        } catch (error) {
          logger.error(`Failed to register webhook ${topic} for ${shop}:`, error);
        }
      }

      return registeredWebhooks;

    } catch (error) {
      logger.error('Register webhooks error:', error);
      throw error;
    }
  }

  // List registered webhooks
  async listWebhooks(shop, accessToken) {
    try {
      const client = createShopifyClient(shop, accessToken);
      
      const response = await handleRateLimit(async () => {
        return client.get({
          path: 'webhooks'
        });
      });

      return response.body.webhooks;

    } catch (error) {
      logger.error('List webhooks error:', error);
      throw error;
    }
  }

  // Delete webhook
  async deleteWebhook(shop, accessToken, webhookId) {
    try {
      const client = createShopifyClient(shop, accessToken);
      
      await handleRateLimit(async () => {
        return client.delete({
          path: `webhooks/${webhookId}`
        });
      });

      logger.info(`Deleted webhook ${webhookId} for ${shop}`);
      return true;

    } catch (error) {
      logger.error('Delete webhook error:', error);
      throw error;
    }
  }

  // Verify webhook request
  verifyWebhookRequest(rawBody, signature) {
    return verifyWebhook(rawBody, signature);
  }

  // Handle products create webhook
  async handleProductsCreate(shop, data) {
    try {
      logger.info(`Handling products create webhook for ${shop}`);
      
      // Find website by shop domain
      const website = await Website.findOne({
        where: { domain: shop }
      });

      if (!website) {
        logger.warn(`Website not found for shop ${shop}`);
        return;
      }

      // Clear product cache
      await Cache.deletePattern(`shopify:products:${shop}:*`);

      // Queue product analysis job
      await addJob('analysis', {
        websiteId: website.id,
        type: 'product',
        productId: data.id,
        action: 'create'
      });

      logger.info(`Product created: ${data.id} - ${data.title}`);

    } catch (error) {
      logger.error('Handle products create error:', error);
      throw error;
    }
  }

  // Handle products update webhook
  async handleProductsUpdate(shop, data) {
    try {
      logger.info(`Handling products update webhook for ${shop}`);
      
      const website = await Website.findOne({
        where: { domain: shop }
      });

      if (!website) {
        logger.warn(`Website not found for shop ${shop}`);
        return;
      }

      // Clear specific product cache
      await Cache.delete(`shopify:product:${shop}:${data.id}`);
      await Cache.deletePattern(`shopify:products:${shop}:*`);

      // Queue product analysis job
      await addJob('analysis', {
        websiteId: website.id,
        type: 'product',
        productId: data.id,
        action: 'update'
      });

      logger.info(`Product updated: ${data.id} - ${data.title}`);

    } catch (error) {
      logger.error('Handle products update error:', error);
      throw error;
    }
  }

  // Handle products delete webhook
  async handleProductsDelete(shop, data) {
    try {
      logger.info(`Handling products delete webhook for ${shop}`);
      
      // Clear product cache
      await Cache.delete(`shopify:product:${shop}:${data.id}`);
      await Cache.deletePattern(`shopify:products:${shop}:*`);

      logger.info(`Product deleted: ${data.id}`);

    } catch (error) {
      logger.error('Handle products delete error:', error);
      throw error;
    }
  }

  // Handle orders create webhook
  async handleOrdersCreate(shop, data) {
    try {
      logger.info(`Handling orders create webhook for ${shop}`);
      
      const website = await Website.findOne({
        where: { domain: shop }
      });

      if (!website) return;

      // Clear order analytics cache
      await Cache.deletePattern(`shopify:order-analytics:${shop}:*`);

      // Track conversion
      if (data.referring_site) {
        await addJob('analysis', {
          websiteId: website.id,
          type: 'conversion',
          orderId: data.id,
          source: data.referring_site,
          value: data.total_price
        });
      }

      logger.info(`Order created: ${data.id} - ${data.total_price} ${data.currency}`);

    } catch (error) {
      logger.error('Handle orders create error:', error);
      throw error;
    }
  }

  // Handle app uninstalled webhook
  async handleAppUninstalled(shop, data) {
    try {
      logger.info(`Handling app uninstalled webhook for ${shop}`);
      
      // Find and deactivate website
      const website = await Website.findOne({
        where: { domain: shop }
      });

      if (website) {
        website.is_active = false;
        website.shopify_access_token = null;
        await website.save();

        // Clear all shop cache
        await Cache.deletePattern(`shopify:*:${shop}:*`);

        // Notify user
        await addJob('email', {
          to: website.user.email,
          subject: 'Shopify App Uninstalled',
          template: 'app-uninstalled',
          data: {
            shopName: shop,
            websiteName: website.name
          }
        });
      }

      logger.info(`App uninstalled from ${shop}`);

    } catch (error) {
      logger.error('Handle app uninstalled error:', error);
      throw error;
    }
  }

  // Handle shop update webhook
  async handleShopUpdate(shop, data) {
    try {
      logger.info(`Handling shop update webhook for ${shop}`);
      
      // Clear shop info cache
      await Cache.delete(`shopify:store:${shop}`);

      const website = await Website.findOne({
        where: { domain: shop }
      });

      if (website && data.domain !== shop) {
        // Update domain if changed
        website.domain = data.domain;
        await website.save();
      }

      logger.info(`Shop updated: ${shop}`);

    } catch (error) {
      logger.error('Handle shop update error:', error);
      throw error;
    }
  }

  // Handle theme publish webhook
  async handleThemePublish(shop, data) {
    try {
      logger.info(`Handling theme publish webhook for ${shop}`);
      
      const website = await Website.findOne({
        where: { domain: shop }
      });

      if (!website) return;

      // Queue full site analysis
      await addJob('analysis', {
        websiteId: website.id,
        type: 'full',
        trigger: 'theme_change',
        themeId: data.id,
        themeName: data.name
      });

      logger.info(`Theme published: ${data.id} - ${data.name}`);

    } catch (error) {
      logger.error('Handle theme publish error:', error);
      throw error;
    }
  }

  // Generic webhook handler
  async handleWebhook(topic, shop, data) {
    try {
      const handlerMap = {
        'products/create': this.handleProductsCreate,
        'products/update': this.handleProductsUpdate,
        'products/delete': this.handleProductsDelete,
        'orders/create': this.handleOrdersCreate,
        'app/uninstalled': this.handleAppUninstalled,
        'shop/update': this.handleShopUpdate,
        'themes/publish': this.handleThemePublish
      };

      const handler = handlerMap[topic];
      if (handler) {
        await handler.call(this, shop, data);
      } else {
        logger.warn(`No handler found for webhook topic: ${topic}`);
      }

    } catch (error) {
      logger.error(`Webhook handler error for ${topic}:`, error);
      throw error;
    }
  }

  // Setup webhook endpoints
  setupWebhookEndpoints(app) {
    // Generic webhook endpoint
    app.post('/api/shopify/webhooks/:topic', async (req, res) => {
      try {
        const { topic } = req.params;
        const shop = req.get('x-shopify-shop-domain');
        const hmac = req.get('x-shopify-hmac-sha256');
        
        // Verify webhook
        if (!this.verifyWebhookRequest(req.rawBody, hmac)) {
          logger.warn(`Invalid webhook signature for ${topic} from ${shop}`);
          return res.status(401).send('Unauthorized');
        }

        // Process webhook asynchronously
        setImmediate(async () => {
          try {
            await this.handleWebhook(topic, shop, req.body);
          } catch (error) {
            logger.error(`Error processing webhook ${topic}:`, error);
          }
        });

        // Respond immediately
        res.status(200).send('OK');

      } catch (error) {
        logger.error('Webhook endpoint error:', error);
        res.status(500).send('Internal Server Error');
      }
    });
  }
}

module.exports = new ShopifyWebhooksService();