# Google APIs Setup Guide

## Overview

This guide will walk you through setting up all required Google APIs for the Shopify SEO Analyzer platform.

## Prerequisites

- Google Account with administrative access
- Google Cloud Platform account
- Domain ownership verification
- Credit card for billing (APIs have free tiers)

## Table of Contents

1. [Google Cloud Project Setup](#google-cloud-project-setup)
2. [Google Search Console API](#google-search-console-api)
3. [Google Analytics API](#google-analytics-api)
4. [PageSpeed Insights API](#pagespeed-insights-api)
5. [Google OAuth 2.0 Setup](#google-oauth-20-setup)
6. [Service Account Setup](#service-account-setup)
7. [Testing Your Configuration](#testing-your-configuration)
8. [Common Issues](#common-issues)

---

## 1. Google Cloud Project Setup

### Step 1: Create a New Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project details:
   ```
   Project Name: shopify-seo-analyzer
   Project ID: shopify-seo-analyzer-xxxxx (auto-generated)
   ```
5. Click "Create"

### Step 2: Enable Billing

1. Navigate to "Billing" in the sidebar
2. Link a billing account
3. Set up budget alerts (recommended):
   ```
   Monthly Budget: $50
   Alert at: 50%, 75%, 90%, 100%
   ```

### Step 3: Enable Required APIs

Navigate to "APIs & Services" > "Library" and enable:

1. **Google Search Console API**
2. **Google Analytics Reporting API**
3. **Google Analytics Data API**
4. **PageSpeed Insights API**

For each API:
1. Search for the API name
2. Click on the API
3. Click "Enable"
4. Wait for activation

---

## 2. Google Search Console API

### Step 1: Verify Your Domain

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property:
   - Choose "Domain" for entire domain
   - Or "URL prefix" for specific subdomain
3. Verify ownership using one of these methods:
   - DNS verification (recommended)
   - HTML file upload
   - HTML tag
   - Google Analytics
   - Google Tag Manager

### Step 2: Configure API Access

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Ensure Search Console API is enabled
3. Note your project number for later use

### Step 3: Set Permissions

1. In Search Console, go to Settings > Users and permissions
2. Add your service account email:
   ```
   your-service-account@your-project.iam.gserviceaccount.com
   ```
3. Set permission level to "Full"

---

## 3. Google Analytics API

### Step 1: Link Google Analytics

1. Go to [Google Analytics](https://analytics.google.com)
2. Select your property
3. Go to Admin > Property Settings
4. Note your Property ID (GA4) or View ID (Universal Analytics)

### Step 2: Enable API Access

1. In Google Analytics Admin:
   - Go to "Property Access Management"
   - Add your service account email
   - Grant "Viewer" permissions (minimum)

### Step 3: Configure Data Streams

For GA4:
1. Go to Admin > Data Streams
2. Select your web stream
3. Enable Enhanced Measurement
4. Note your Measurement ID

### Step 4: Set Up Custom Dimensions (Optional)

1. Go to Admin > Custom Definitions
2. Create dimensions for:
   - Product Categories
   - User Types
   - Search Keywords

---

## 4. PageSpeed Insights API

### Step 1: Get API Key

1. Go to Google Cloud Console
2. Navigate to "APIs & Services" > "Credentials"
3. Click "Create Credentials" > "API Key"
4. Name it: `pagespeed-insights-key`

### Step 2: Restrict API Key

1. Click on the created API key
2. Under "Application restrictions":
   - Choose "HTTP referrers"
   - Add your domains:
     ```
     https://yourdomain.com/*
     https://www.yourdomain.com/*
     http://localhost:3000/* (for development)
     ```
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose "PageSpeed Insights API"

### Step 3: Configure Rate Limits

Default limits:
- 25,000 requests per day
- 1 request per second

To increase limits:
1. Go to "APIs & Services" > "PageSpeed Insights API"
2. Click "Quotas"
3. Request quota increase if needed

---

## 5. Google OAuth 2.0 Setup

### Step 1: Create OAuth Client

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure consent screen first:
   - User Type: External
   - App name: Shopify SEO Analyzer
   - Support email: your-email@domain.com
   - App logo: Upload your logo
   - Application home page: https://yourdomain.com
   - Authorized domains: yourdomain.com
   - Privacy policy: https://yourdomain.com/privacy
   - Terms of service: https://yourdomain.com/terms

### Step 2: Create OAuth Client ID

1. Application type: Web application
2. Name: Shopify SEO Analyzer Web Client
3. Authorized JavaScript origins:
   ```
   https://yourdomain.com
   https://www.yourdomain.com
   http://localhost:3000
   ```
4. Authorized redirect URIs:
   ```
   https://yourdomain.com/auth/google/callback
   https://www.yourdomain.com/auth/google/callback
   http://localhost:3000/auth/google/callback
   ```

### Step 3: Download Credentials

1. Click on the created OAuth client
2. Download JSON
3. Save as `google-oauth-credentials.json`
4. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

---

## 6. Service Account Setup

### Step 1: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service account"
3. Service account details:
   ```
   Name: shopify-seo-analyzer-service
   ID: shopify-seo-analyzer-service
   Description: Service account for backend API access
   ```

### Step 2: Grant Permissions

1. Skip the optional permissions step
2. Create key:
   - Key type: JSON
   - Download the key file
   - Save as `service-account-key.json`

### Step 3: Enable Domain-Wide Delegation (If Needed)

1. Go to "IAM & Admin" > "Service Accounts"
2. Click on your service account
3. Click "Show domain-wide delegation"
4. Enable "Enable G Suite Domain-wide Delegation"
5. Note the Client ID

### Step 4: Configure Environment

Add to your `.env`:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./config/service-account-key.json
```

---

## 7. Testing Your Configuration

### Test Search Console API

```javascript
// test-search-console.js
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: './config/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

async function testSearchConsole() {
  const searchconsole = google.searchconsole('v1');
  const authClient = await auth.getClient();
  
  try {
    const response = await searchconsole.sites.list({
      auth: authClient,
    });
    console.log('Sites:', response.data.siteEntry);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearchConsole();
```

### Test Analytics API

```javascript
// test-analytics.js
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: './config/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

async function testAnalytics() {
  const analytics = google.analyticsdata('v1beta');
  const authClient = await auth.getClient();
  
  try {
    const response = await analytics.properties.runReport({
      property: 'properties/YOUR_PROPERTY_ID',
      auth: authClient,
      requestBody: {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
      },
    });
    console.log('Report:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAnalytics();
```

### Test PageSpeed Insights

```javascript
// test-pagespeed.js
const axios = require('axios');

async function testPageSpeed() {
  const API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY;
  const url = 'https://example.com';
  
  try {
    const response = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`,
      {
        params: {
          url: url,
          key: API_KEY,
          category: ['performance', 'seo', 'accessibility'],
        },
      }
    );
    console.log('PageSpeed Score:', response.data.lighthouseResult.categories);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPageSpeed();
```

---

## 8. Common Issues

### Issue: "Permission denied" for Search Console

**Solution:**
1. Ensure domain is verified in Search Console
2. Add service account email to Search Console users
3. Wait 24 hours for permissions to propagate

### Issue: "Insufficient permissions" for Analytics

**Solution:**
1. Check service account has correct permissions
2. Verify property ID is correct
3. Ensure Analytics API is enabled

### Issue: "API key not valid" for PageSpeed

**Solution:**
1. Check API key restrictions
2. Ensure PageSpeed Insights API is enabled
3. Verify referrer headers match restrictions

### Issue: "Quota exceeded"

**Solution:**
1. Check current quota usage in Cloud Console
2. Implement caching to reduce API calls
3. Request quota increase if needed

### Issue: OAuth redirect mismatch

**Solution:**
1. Ensure redirect URI exactly matches configuration
2. Include trailing slashes if present
3. Check for http vs https mismatch

---

## Environment Variables Summary

Add these to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./config/service-account-key.json

# API Keys
GOOGLE_PAGESPEED_API_KEY=your-pagespeed-api-key

# Analytics
GOOGLE_ANALYTICS_PROPERTY_ID=properties/123456789
GOOGLE_ANALYTICS_VIEW_ID=ga:123456789

# Search Console
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://yourdomain.com
```

---

## Next Steps

1. Complete [Shopify Integration Setup](./shopify-integration.md)
2. Set up [Database](./database-setup.md)
3. Configure [Deployment](./deployment.md)
4. Review [Troubleshooting Guide](../troubleshooting.md)

---

## Resources

- [Google Cloud Console](https://console.cloud.google.com)
- [Google APIs Explorer](https://developers.google.com/apis-explorer)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Google API Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [Search Console API Reference](https://developers.google.com/webmaster-tools/search-console-api-original)
- [Analytics API Reference](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [PageSpeed Insights API Reference](https://developers.google.com/speed/docs/insights/v5/get-started)