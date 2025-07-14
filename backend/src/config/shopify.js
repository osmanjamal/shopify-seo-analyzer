const { Shopify } = require('@shopify/shopify-api');

// Configure Shopify API
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_APP_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_APP_SECRET,
  SCOPES: process.env.SHOPIFY_SCOPES?.split(',') || [
    'read_products',
    'read_orders',
    'read_analytics',
    'read_reports',
    'read_themes',
    'read_content',
    'read_marketing_events'
  ],
  HOST_NAME: process.env.HOST_NAME || 'localhost:5000',
  API_VERSION: '2024-01',
  IS_EMBEDDED_APP: false,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage()
});

// Shopify API configuration
const shopifyConfig = {
  apiVersion: '2024-01',
  webhooks: {
    path: '/api/shopify/webhooks',
    webhookHandlers: {
      PRODUCTS_CREATE: {
        path: '/api/shopify/webhooks/products/create',
        webhookHandler: async (topic, shop, body) => {
          console.log(`Product created webhook from ${shop}`);
        }
      },
      PRODUCTS_UPDATE: {
        path: '/api/shopify/webhooks/products/update',
        webhookHandler: async (topic, shop, body) => {
          console.log(`Product updated webhook from ${shop}`);
        }
      },
      APP_UNINSTALLED: {
        path: '/api/shopify/webhooks/app/uninstalled',
        webhookHandler: async (topic, shop, body) => {
          console.log(`App uninstalled from ${shop}`);
        }
      }
    }
  },
  // Rate limiting configuration
  rateLimiting: {
    restRequestsPerMinute: 40,
    graphqlCost: 1000,
    graphqlRestoreRate: 50
  }
};

// Create Shopify client
const createShopifyClient = (shop, accessToken) => {
  return new Shopify.Clients.Rest(shop, accessToken);
};

// Create GraphQL client
const createGraphQLClient = (shop, accessToken) => {
  return new Shopify.Clients.Graphql(shop, accessToken);
};

// Verify webhook
const verifyWebhook = (rawBody, signature) => {
  const hmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return hmac === signature;
};

// Handle rate limiting
const handleRateLimit = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 2;
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};

module.exports = {
  Shopify,
  shopifyConfig,
  createShopifyClient,
  createGraphQLClient,
  verifyWebhook,
  handleRateLimit
};