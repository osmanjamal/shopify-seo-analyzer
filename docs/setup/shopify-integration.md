# Shopify Integration Setup Guide

## Overview

This guide walks you through integrating your Shopify store with the SEO Analyzer platform to unlock powerful e-commerce SEO insights.

## Prerequisites

- Active Shopify store (Basic plan or higher)
- Store owner or admin access
- Custom app development enabled
- SSL certificate on your domain

## Table of Contents

1. [Creating a Custom Shopify App](#creating-a-custom-shopify-app)
2. [API Credentials Setup](#api-credentials-setup)
3. [Webhook Configuration](#webhook-configuration)
4. [Permissions and Scopes](#permissions-and-scopes)
5. [Testing the Integration](#testing-the-integration)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## 1. Creating a Custom Shopify App

### Step 1: Access Partner Dashboard

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Log in or create a partner account
3. Navigate to "Apps" in the dashboard

### Step 2: Create a New App

1. Click "Create app"
2. Choose "Custom app"
3. Enter app details:
   ```
   App name: SEO Analyzer for [Your Store Name]
   App URL: https://yourdomain.com
   Redirect URL: https://yourdomain.com/auth/shopify/callback
   ```

### Step 3: Development Store Setup (Optional)

For testing:
1. Create a development store
2. Choose "Create a store to test and build"
3. Store type: "Development store"

---

## 2. API Credentials Setup

### Step 1: Generate API Credentials

1. In your app settings, go to "API credentials"
2. Note down:
   ```
   API key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   API secret key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 2: Configure Admin API Access

1. Under "Admin API integration", configure:
   - API version: `2024-01` (or latest stable)
   - Access mode: `Private app`

### Step 3: Set Up Storefront API (Optional)

If you need public data access:
1. Enable "Storefront API"
2. Generate Storefront access token
3. Configure allowed domains

### Step 4: Environment Configuration

Add to your `.env`:
```env
# Shopify API Credentials
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret-key
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_API_VERSION=2024-01
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# OAuth (for public apps)
SHOPIFY_APP_URL=https://yourdomain.com
SHOPIFY_REDIRECT_URI=https://yourdomain.com/auth/shopify/callback
```

---

## 3. Webhook Configuration

### Step 1: Register Required Webhooks

Required webhooks for SEO monitoring:

```javascript
const webhooks = [
  {
    topic: 'products/create',
    address: 'https://yourdomain.com/webhooks/shopify/products/create',
  },
  {
    topic: 'products/update',
    address: 'https://yourdomain.com/webhooks/shopify/products/update',
  },
  {
    topic: 'products/delete',
    address: 'https://yourdomain.com/webhooks/shopify/products/delete',
  },
  {
    topic: 'collections/create',
    address: 'https://yourdomain.com/webhooks/shopify/collections/create',
  },
  {
    topic: 'collections/update',
    address: 'https://yourdomain.com/webhooks/shopify/collections/update',
  },
  {
    topic: 'themes/publish',
    address: 'https://yourdomain.com/webhooks/shopify/themes/publish',
  },
];
```

### Step 2: Webhook Registration Script

```javascript
// register-webhooks.js
const axios = require('axios');

async function registerWebhooks() {
  const shopifyApiUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
  
  for (const webhook of webhooks) {
    try {
      const response = await axios.post(
        `${shopifyApiUrl}/webhooks.json`,
        {
          webhook: {
            topic: webhook.topic,
            address: webhook.address,
            format: 'json',
          },
        },
        {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Registered webhook: ${webhook.topic}`);
    } catch (error) {
      console.error(`❌ Failed to register ${webhook.topic}:`, error.message);
    }
  }
}
```

### Step 3: Webhook Verification

Implement webhook verification middleware:

```javascript
// middleware/verifyWebhook.js
const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signature) {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return hash === signature;
}

module.exports = (req, res, next) => {
  const signature = req.get('X-Shopify-Hmac-Sha256');
  
  if (!signature || !verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(401).send('Unauthorized');
  }
  
  next();
};
```

---

## 4. Permissions and Scopes

### Required API Scopes

Configure these scopes for your app:

```javascript
const requiredScopes = [
  // Products & Collections
  'read_products',
  'read_product_listings',
  'read_collection_listings',
  'read_price_rules',
  
  // Content & Themes
  'read_content',
  'read_themes',
  'read_script_tags',
  
  // Analytics & Reports
  'read_analytics',
  'read_reports',
  'read_marketing_events',
  
  // Store Information
  'read_locales',
  'read_locations',
  'read_shipping',
  
  // Customer Data (if needed)
  'read_customers',
  'read_customer_saved_searches',
  
  // Orders (for conversion tracking)
  'read_orders',
  'read_all_orders',
  
  // Metafields
  'read_metafields',
  'write_metafields', // For SEO metadata
];
```

### OAuth Flow Implementation

For public apps, implement OAuth:

```javascript
// routes/shopify-auth.js
app.get('/auth/shopify', (req, res) => {
  const shop = req.query.shop;
  const state = nonce();
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
  const scopes = requiredScopes.join(',');
  
  const installUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${process.env.SHOPIFY_API_KEY}&` +
    `scope=${scopes}&` +
    `redirect_uri=${redirectUri}&` +
    `state=${state}`;
  
  res.cookie('state', state);
  res.redirect(installUrl);
});

app.get('/auth/shopify/callback', async (req, res) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = req.cookies.state;
  
  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }
  
  // Exchange code for access token
  const accessTokenResponse = await axios.post(
    `https://${shop}/admin/oauth/access_token`,
    {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }
  );
  
  const accessToken = accessTokenResponse.data.access_token;
  // Store access token securely
});
```

---

## 5. Testing the Integration

### Step 1: Test API Connection

```javascript
// test-shopify-connection.js
const axios = require('axios');

async function testConnection() {
  try {
    const response = await axios.get(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ Connected to Shopify store:', response.data.shop.name);
    console.log('Store details:', {
      domain: response.data.shop.domain,
      email: response.data.shop.email,
      plan: response.data.shop.plan_name,
    });
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
```

### Step 2: Test Product Fetching

```javascript
// test-products.js
async function testProducts() {
  try {
    const response = await axios.get(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        },
        params: {
          limit: 10,
          fields: 'id,title,handle,seo',
        },
      }
    );
    
    console.log(`✅ Found ${response.data.products.length} products`);
    response.data.products.forEach(product => {
      console.log(`- ${product.title} (${product.handle})`);
    });
  } catch (error) {
    console.error('❌ Failed to fetch products:', error.message);
  }
}
```

### Step 3: Test Webhook Reception

```javascript
// test-webhook-endpoint.js
app.post('/test/webhook', verifyWebhook, (req, res) => {
  console.log('Webhook received:', {
    topic: req.get('X-Shopify-Topic'),
    shop: req.get('X-Shopify-Shop-Domain'),
    body: req.body,
  });
  
  res.status(200).send('OK');
});
```

---

## 6. Production Deployment

### Pre-deployment Checklist

- [ ] All API credentials are in environment variables
- [ ] Webhook URLs use HTTPS
- [ ] Rate limiting is implemented
- [ ] Error handling is comprehensive
- [ ] Logging is configured
- [ ] Access tokens are encrypted
- [ ] API version is fixed (not "unstable")

### Rate Limiting Implementation

```javascript
// utils/shopifyRateLimit.js
const Bottleneck = require('bottleneck');

// Shopify allows 2 requests per second
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 500, // 500ms between requests
});

// Wrap all Shopify API calls
async function shopifyApiCall(fn) {
  return limiter.schedule(fn);
}

module.exports = { shopifyApiCall };
```

### Error Handling

```javascript
// utils/shopifyErrors.js
class ShopifyError extends Error {
  constructor(message, code, response) {
    super(message);
    this.name = 'ShopifyError';
    this.code = code;
    this.response = response;
  }
}

function handleShopifyError(error) {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 429:
        throw new ShopifyError('Rate limit exceeded', 'RATE_LIMIT', data);
      case 401:
        throw new ShopifyError('Invalid access token', 'UNAUTHORIZED', data);
      case 404:
        throw new ShopifyError('Resource not found', 'NOT_FOUND', data);
      default:
        throw new ShopifyError(data.errors || 'Unknown error', 'API_ERROR', data);
    }
  }
  throw error;
}
```

### Monitoring Setup

```javascript
// monitoring/shopifyMonitor.js
const events = new EventEmitter();

// Track API calls
events.on('shopify:api:call', (data) => {
  logger.info('Shopify API call', {
    endpoint: data.endpoint,
    method: data.method,
    duration: data.duration,
  });
});

// Track errors
events.on('shopify:error', (error) => {
  logger.error('Shopify error', {
    error: error.message,
    code: error.code,
    endpoint: error.endpoint,
  });
  
  // Send alert if critical
  if (error.code === 'UNAUTHORIZED') {
    alertManager.send('Shopify authentication failed', error);
  }
});
```

---

## 7. Troubleshooting

### Common Issues and Solutions

#### Issue: "Invalid API key or access token"

**Solutions:**
1. Verify credentials in `.env`
2. Check if app is installed on store
3. Regenerate access token
4. Ensure correct API version

#### Issue: "Webhook verification failed"

**Solutions:**
1. Check webhook secret matches
2. Ensure raw body is used for verification
3. Verify HTTPS is working
4. Check server time synchronization

#### Issue: "Rate limit exceeded"

**Solutions:**
1. Implement request queuing
2. Use bulk operations when possible
3. Cache frequently accessed data
4. Monitor API credit usage

#### Issue: "Missing required scopes"

**Solutions:**
1. Review and update app scopes
2. Reinstall app with new permissions
3. Use OAuth flow for scope updates

### Debug Mode

Enable detailed logging:

```javascript
// config/shopify.js
module.exports = {
  debug: process.env.NODE_ENV === 'development',
  logLevel: process.env.SHOPIFY_LOG_LEVEL || 'info',
  
  // Log all API calls in debug mode
  middleware: process.env.NODE_ENV === 'development' ? [
    (config) => {
      console.log('Shopify API Request:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
      });
      return config;
    },
  ] : [],
};
```

---

## Environment Variables Summary

```env
# Shopify Configuration
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_API_VERSION=2024-01
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# OAuth (for public apps)
SHOPIFY_APP_URL=https://yourdomain.com
SHOPIFY_REDIRECT_URI=https://yourdomain.com/auth/shopify/callback
SHOPIFY_SCOPES=read_products,read_analytics,read_content

# Optional
SHOPIFY_STOREFRONT_ACCESS_TOKEN=storefront-token
SHOPIFY_PRIVATE_APP=true
SHOPIFY_LOG_LEVEL=info
```

---

## Next Steps

1. Set up [Database](./database-setup.md)
2. Configure [Google APIs](./google-apis.md)
3. Deploy to [Production](./deployment.md)
4. Monitor using dashboard

---

## Resources

- [Shopify Admin API Reference](https://shopify.dev/api/admin)
- [Shopify App Development](https://shopify.dev/apps)
- [Webhook Notifications](https://shopify.dev/api/admin/rest/reference/events/webhook)
- [API Rate Limits](https://shopify.dev/api/usage/rate-limits)
- [GraphQL Admin API](https://shopify.dev/api/admin-graphql)
- [Partner Dashboard](https://partners.shopify.com)