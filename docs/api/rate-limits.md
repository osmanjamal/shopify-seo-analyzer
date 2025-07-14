# API Rate Limits

## Overview

The SEO Analyzer API implements rate limiting to ensure fair usage and maintain service quality for all users. Rate limits vary based on your subscription tier and the specific endpoint being accessed.

## Rate Limit Headers

Every API response includes headers indicating your current rate limit status:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705836400
X-RateLimit-Reset-After: 3600
X-RateLimit-Bucket: user_123456
```

### Header Definitions

- **X-RateLimit-Limit**: Maximum requests allowed in the current window
- **X-RateLimit-Remaining**: Number of requests remaining in the current window
- **X-RateLimit-Reset**: Unix timestamp when the rate limit resets
- **X-RateLimit-Reset-After**: Seconds until the rate limit resets
- **X-RateLimit-Bucket**: The rate limit bucket identifier

## Rate Limit Tiers

### Free Tier
```
Global Limit: 1,000 requests/day
Burst Limit: 10 requests/second

Specific Limits:
- Keywords API: 50 requests/day
- Analytics API: 100 requests/day
- Technical Scan: 10 requests/day
- Exports: 5 requests/day
```

### Starter Tier
```
Global Limit: 5,000 requests/day
Burst Limit: 20 requests/second

Specific Limits:
- Keywords API: 200 requests/day
- Analytics API: 500 requests/day
- Technical Scan: 50 requests/day
- Exports: 20 requests/day
```

### Professional Tier
```
Global Limit: 20,000 requests/day
Burst Limit: 50 requests/second

Specific Limits:
- Keywords API: 1,000 requests/day
- Analytics API: 2,000 requests/day
- Technical Scan: 200 requests/day
- Exports: 100 requests/day
```

### Enterprise Tier
```
Global Limit: 100,000 requests/day
Burst Limit: 100 requests/second

Specific Limits:
- Keywords API: 5,000 requests/day
- Analytics API: 10,000 requests/day
- Technical Scan: 1,000 requests/day
- Exports: 500 requests/day
- Custom limits available
```

## Endpoint-Specific Limits

### Authentication Endpoints

```
POST /api/auth/login
- Rate Limit: 5 requests per 15 minutes per IP
- Lockout: After 5 failed attempts

POST /api/auth/register
- Rate Limit: 3 requests per hour per IP

POST /api/auth/forgot-password
- Rate Limit: 3 requests per hour per email
```

### Data Endpoints

```
GET /api/keywords/*
- Rate Limit: 60 requests per minute per user

GET /api/analytics/*
- Rate Limit: 60 requests per minute per user

POST /api/technical/scan
- Rate Limit: 1 request per 5 minutes per website
- Concurrent Limit: 3 scans per account
```

### Resource-Intensive Endpoints

```
POST /api/exports/generate
- Rate Limit: 10 requests per hour per user
- Concurrent Limit: 2 exports per user

POST /api/competitors/analysis
- Rate Limit: 5 requests per hour per website

GET /api/analytics/realtime/*
- Rate Limit: 120 requests per minute per user
```

### Webhook Endpoints

```
POST /api/webhooks/*
- Rate Limit: 200 requests per minute per source IP
- Payload Size Limit: 10MB
```

## Rate Limit Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 3600
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705836400

{
  "error": "TOO_MANY_REQUESTS",
  "message": "API rate limit exceeded",
  "retryAfter": 3600,
  "limit": 1000,
  "reset": "2024-01-20T11:00:00Z",
  "upgradeUrl": "https://seoanalyzer.app/pricing"
}
```

## Best Practices

### 1. Implement Exponential Backoff

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        const delay = retryAfter * 1000 * Math.pow(2, i);
        
        console.log(`Rate limited. Retrying after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 2. Cache Responses

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key, fetchFn) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  
  return data;
}
```

### 3. Batch Requests

Instead of:
```javascript
// Bad - Multiple requests
for (const keyword of keywords) {
  await api.updateKeyword(keyword.id, data);
}
```

Use:
```javascript
// Good - Batch request
await api.updateKeywordsBatch(keywords.map(k => ({
  id: k.id,
  ...data
})));
```

### 4. Monitor Rate Limit Headers

```javascript
class APIClient {
  constructor() {
    this.rateLimitInfo = {};
  }
  
  async request(url, options) {
    const response = await fetch(url, options);
    
    // Store rate limit info
    this.rateLimitInfo = {
      limit: parseInt(response.headers.get('X-RateLimit-Limit')),
      remaining: parseInt(response.headers.get('X-RateLimit-Remaining')),
      reset: parseInt(response.headers.get('X-RateLimit-Reset'))
    };
    
    // Warn if approaching limit
    if (this.rateLimitInfo.remaining < this.rateLimitInfo.limit * 0.1) {
      console.warn('Approaching rate limit:', this.rateLimitInfo);
    }
    
    return response;
  }
}
```

## Rate Limit Strategies

### 1. Request Spreading

Distribute requests evenly over time:

```javascript
class RateLimiter {
  constructor(limit, window) {
    this.limit = limit;
    this.window = window;
    this.queue = [];
    this.processing = false;
  }
  
  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.processing) this.process();
    });
  }
  
  async process() {
    this.processing = true;
    const delay = this.window / this.limit;
    
    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      if (this.queue.length > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
    
    this.processing = false;
  }
}
```

### 2. Priority Queuing

Prioritize important requests:

```javascript
class PriorityQueue {
  constructor() {
    this.high = [];
    this.normal = [];
    this.low = [];
  }
  
  add(request, priority = 'normal') {
    this[priority].push(request);
  }
  
  next() {
    if (this.high.length > 0) return this.high.shift();
    if (this.normal.length > 0) return this.normal.shift();
    if (this.low.length > 0) return this.low.shift();
    return null;
  }
}
```

## API Key Rate Limits

API keys have separate rate limits:

### Basic API Key
```
Rate Limit: 100 requests/hour
Daily Limit: 1,000 requests
Concurrent Requests: 2
```

### Premium API Key
```
Rate Limit: 500 requests/hour
Daily Limit: 5,000 requests
Concurrent Requests: 10
```

### Enterprise API Key
```
Rate Limit: 2,000 requests/hour
Daily Limit: 20,000 requests
Concurrent Requests: 50
Custom limits available
```

## Rate Limit Bypass

Certain scenarios bypass rate limits:

1. **Internal Services**: Requests from internal IPs
2. **Health Checks**: `/api/health` endpoint
3. **Admin Access**: Admin role with special headers
4. **Enterprise Agreements**: Custom enterprise contracts

## Webhooks and Rate Limits

Incoming webhooks have separate limits:

```
Shopify Webhooks: 2,000 requests/minute
Google Webhooks: 1,000 requests/minute
Custom Webhooks: 100 requests/minute per endpoint
```

Failed webhook deliveries are retried with exponential backoff.

## Monitoring Your Usage

### Get Current Usage

```http
GET /api/account/usage
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "current": {
    "requests": 4532,
    "keywords": 234,
    "exports": 12,
    "scans": 45
  },
  "limits": {
    "requests": 20000,
    "keywords": 1000,
    "exports": 100,
    "scans": 200
  },
  "reset": "2024-01-21T00:00:00Z",
  "subscription": "professional"
}
```

### Usage Alerts

Configure alerts when approaching limits:

```http
PUT /api/account/alerts
Content-Type: application/json

{
  "rateLimitAlerts": {
    "enabled": true,
    "threshold": 80,
    "email": "admin@example.com"
  }
}
```

## Rate Limit FAQ

### Q: What happens when I exceed the rate limit?
A: You'll receive a 429 response with a Retry-After header. Your request won't be processed.

### Q: Are rate limits per user or per API key?
A: Rate limits apply per authenticated user account. API keys have separate limits.

### Q: Can I increase my rate limits?
A: Yes, by upgrading your subscription or contacting sales for custom limits.

### Q: Do failed requests count against my limit?
A: Yes, all requests count except those returning 401 (authentication) errors.

### Q: How can I check my current usage?
A: Use the `/api/account/usage` endpoint or check the dashboard.

### Q: Are there burst limits?
A: Yes, each tier has burst limits to prevent request flooding.

### Q: What about batch operations?
A: Batch operations count as a single request but may have payload size limits.

## Contact

For custom rate limits or enterprise needs:
- Email: enterprise@seoanalyzer.app
- Sales: https://seoanalyzer.app/contact