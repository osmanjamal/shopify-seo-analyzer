# API Endpoints

## Base URL

```
Production: https://api.seoanalyzer.app/v1
Staging: https://staging-api.seoanalyzer.app/v1
Development: http://localhost:3001/api
```

## Common Headers

```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
Accept: application/json
X-Request-ID: unique-request-id (optional)
```

## Response Format

All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-20T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-20T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

## Endpoints

### Dashboard

#### Get Dashboard Overview
```http
GET /api/dashboard?websiteId={websiteId}&period={period}
```

**Query Parameters:**
- `websiteId` (optional): Filter by specific website
- `period` (optional): Time period (7d, 30d, 90d, 1y)

**Response:**
```json
{
  "metrics": {
    "totalWebsites": 3,
    "avgSeoScore": 78,
    "totalKeywords": 145,
    "trackingKeywords": 89,
    "totalTraffic": 45678,
    "organicTraffic": 23456
  },
  "scoreHistory": [
    { "date": "2024-01-01", "score": 75 },
    { "date": "2024-01-08", "score": 77 },
    { "date": "2024-01-15", "score": 78 }
  ],
  "recentActivity": [
    {
      "type": "keyword_improvement",
      "message": "Keyword 'seo tools' improved from position 8 to 5",
      "timestamp": "2024-01-20T09:00:00Z"
    }
  ],
  "alerts": [
    {
      "id": "alert_123",
      "type": "technical_issue",
      "severity": "high",
      "message": "5 pages have slow load times"
    }
  ]
}
```

### Websites

#### List Websites
```http
GET /api/websites?page={page}&limit={limit}&sort={sort}
```

**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page
- `sort` (default: -createdAt): Sort field and order

**Response:**
```json
{
  "websites": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "domain": "example.com",
      "seoScore": 85,
      "isActive": true,
      "lastAnalyzedAt": "2024-01-20T08:00:00Z",
      "metrics": {
        "keywords": 45,
        "traffic": 12345,
        "issues": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

#### Get Website Details
```http
GET /api/websites/{websiteId}
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "domain": "example.com",
  "seoScore": 85,
  "isActive": true,
  "shopifyStoreId": "example.myshopify.com",
  "googleSiteId": "sc-domain:example.com",
  "lastAnalyzedAt": "2024-01-20T08:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "settings": {
    "autoAnalysis": true,
    "analysisFrequency": "daily",
    "notifications": true
  },
  "integration": {
    "shopify": {
      "connected": true,
      "lastSync": "2024-01-20T07:00:00Z"
    },
    "google": {
      "searchConsole": true,
      "analytics": true,
      "lastSync": "2024-01-20T07:30:00Z"
    }
  }
}
```

#### Create Website
```http
POST /api/websites
Content-Type: application/json

{
  "domain": "newsite.com",
  "shopifyStoreId": "newsite.myshopify.com"
}
```

#### Update Website
```http
PUT /api/websites/{websiteId}
Content-Type: application/json

{
  "settings": {
    "autoAnalysis": false,
    "notifications": true
  }
}
```

#### Delete Website
```http
DELETE /api/websites/{websiteId}
```

### Keywords

#### List Keywords
```http
GET /api/keywords?websiteId={websiteId}&status={status}&positionMin={min}&positionMax={max}
```

**Query Parameters:**
- `websiteId` (required): Website ID
- `status`: tracking, not-tracking, all
- `positionMin`: Minimum position filter
- `positionMax`: Maximum position filter
- `search`: Search query
- `sort`: position, -position, keyword, -keyword, volume, -volume
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "keywords": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "keyword": "seo tools",
      "websiteId": "660e8400-e29b-41d4-a716-446655440001",
      "targetUrl": "https://example.com/seo-tools",
      "currentPosition": 5,
      "previousPosition": 8,
      "positionChange": 3,
      "searchVolume": 5400,
      "difficulty": 65,
      "isTracking": true,
      "lastChecked": "2024-01-20T06:00:00Z"
    }
  ],
  "summary": {
    "total": 145,
    "tracking": 89,
    "improved": 23,
    "declined": 12,
    "unchanged": 54,
    "new": 10
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

#### Add Keywords
```http
POST /api/keywords
Content-Type: application/json

{
  "websiteId": "660e8400-e29b-41d4-a716-446655440001",
  "keywords": [
    {
      "keyword": "new seo tool",
      "targetUrl": "https://example.com/products/new-tool",
      "country": "US",
      "language": "en"
    }
  ]
}
```

#### Update Keyword
```http
PUT /api/keywords/{keywordId}
Content-Type: application/json

{
  "targetUrl": "https://example.com/updated-url",
  "isTracking": false
}
```

#### Delete Keywords
```http
DELETE /api/keywords
Content-Type: application/json

{
  "keywordIds": ["id1", "id2", "id3"]
}
```

#### Get Keyword History
```http
GET /api/keywords/{keywordId}/history?period={period}
```

**Response:**
```json
{
  "keyword": "seo tools",
  "history": [
    {
      "date": "2024-01-01",
      "position": 12,
      "url": "https://example.com/seo-tools"
    },
    {
      "date": "2024-01-08",
      "position": 8,
      "url": "https://example.com/seo-tools"
    }
  ],
  "competitors": [
    {
      "position": 1,
      "domain": "competitor.com",
      "url": "https://competitor.com/best-seo-tools"
    }
  ]
}
```

### Analytics

#### Get Traffic Overview
```http
GET /api/analytics/traffic?websiteId={websiteId}&startDate={start}&endDate={end}
```

**Response:**
```json
{
  "summary": {
    "totalPageViews": 45678,
    "uniqueVisitors": 12345,
    "avgSessionDuration": 245,
    "bounceRate": 42.5,
    "conversionRate": 2.3
  },
  "timeline": [
    {
      "date": "2024-01-01",
      "pageViews": 1234,
      "visitors": 456,
      "sessions": 567
    }
  ],
  "sources": {
    "organic": 12345,
    "direct": 5678,
    "referral": 3456,
    "social": 2345,
    "paid": 1234
  },
  "devices": {
    "desktop": 60,
    "mobile": 35,
    "tablet": 5
  },
  "topPages": [
    {
      "url": "/",
      "pageViews": 5678,
      "avgTimeOnPage": 45
    }
  ]
}
```

#### Get Real-time Analytics
```http
GET /api/analytics/realtime/{websiteId}
```

**Response:**
```json
{
  "activeUsers": 45,
  "pageViews": 123,
  "sessions": 67,
  "avgSessionDuration": 180,
  "topPages": [
    {
      "path": "/products",
      "title": "Products",
      "activeUsers": 12
    }
  ],
  "usersByCountry": [
    {
      "country": "United States",
      "users": 23
    }
  ],
  "lastUpdated": "2024-01-20T10:00:00Z"
}
```

#### Get Conversion Funnel
```http
GET /api/analytics/funnel?websiteId={websiteId}&funnelId={funnelId}
```

### Technical SEO

#### Get Technical Issues
```http
GET /api/technical/issues?websiteId={websiteId}&severity={severity}&status={status}
```

**Query Parameters:**
- `severity`: critical, high, medium, low
- `status`: open, resolved, ignored
- `type`: specific issue type

**Response:**
```json
{
  "issues": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "type": "missing_meta_description",
      "severity": "medium",
      "status": "open",
      "pageUrl": "https://example.com/page",
      "title": "Missing Meta Description",
      "description": "This page is missing a meta description",
      "recommendation": "Add a unique meta description",
      "impact": "Medium impact on CTR",
      "firstDetected": "2024-01-15T00:00:00Z"
    }
  ],
  "summary": {
    "total": 23,
    "critical": 2,
    "high": 5,
    "medium": 10,
    "low": 6,
    "open": 18,
    "resolved": 5
  }
}
```

#### Trigger Technical Scan
```http
POST /api/technical/scan
Content-Type: application/json

{
  "websiteId": "660e8400-e29b-41d4-a716-446655440001",
  "scanType": "full",
  "options": {
    "checkImages": true,
    "checkLinks": true,
    "checkSchema": true,
    "checkPerformance": true
  }
}
```

**Response:**
```json
{
  "scanId": "scan_123456",
  "status": "queued",
  "estimatedTime": 300,
  "message": "Scan queued successfully"
}
```

#### Get Scan Status
```http
GET /api/technical/scan/{scanId}
```

### Competitors

#### List Competitors
```http
GET /api/competitors?websiteId={websiteId}
```

#### Add Competitor
```http
POST /api/competitors
Content-Type: application/json

{
  "websiteId": "660e8400-e29b-41d4-a716-446655440001",
  "domain": "competitor.com"
}
```

#### Get Competitor Analysis
```http
GET /api/competitors/{competitorId}/analysis
```

### Reports & Exports

#### Generate Report
```http
POST /api/exports/generate
Content-Type: application/json

{
  "websiteId": "660e8400-e29b-41d4-a716-446655440001",
  "format": "pdf",
  "sections": ["overview", "keywords", "technical", "analytics"],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "options": {
    "includeCharts": true,
    "includeRecommendations": true,
    "branding": true
  }
}
```

**Response:**
```json
{
  "exportId": "export_123456",
  "status": "processing",
  "format": "pdf",
  "estimatedTime": 60
}
```

#### Get Export Status
```http
GET /api/exports/{exportId}
```

**Response:**
```json
{
  "exportId": "export_123456",
  "status": "completed",
  "downloadUrl": "https://downloads.seoanalyzer.app/exports/export_123456.pdf",
  "expiresAt": "2024-01-27T10:00:00Z",
  "size": "2.5MB"
}
```

#### Download Export
```http
GET /api/exports/{exportId}/download
```

Returns the file directly with appropriate headers.

### Settings

#### Get User Settings
```http
GET /api/settings
```

#### Update Settings
```http
PUT /api/settings
Content-Type: application/json

{
  "emailNotifications": true,
  "timezone": "America/New_York",
  "language": "en",
  "alertThreshold": 70,
  "dashboardLayout": {
    "widgets": ["metrics", "keywords", "traffic"]
  }
}
```

#### Get API Settings
```http
GET /api/settings/api
```

#### Update API Settings
```http
PUT /api/settings/api
Content-Type: application/json

{
  "google": {
    "searchConsoleApiKey": "...",
    "analyticsViewId": "..."
  },
  "shopify": {
    "apiKey": "...",
    "apiSecret": "..."
  }
}
```

### Notifications

#### List Notifications
```http
GET /api/notifications?status={status}&type={type}
```

#### Mark as Read
```http
PUT /api/notifications/{notificationId}/read
```

#### Update Notification Preferences
```http
PUT /api/notifications/preferences
Content-Type: application/json

{
  "email": {
    "enabled": true,
    "frequency": "immediate",
    "types": ["technical_issues", "keyword_changes"]
  },
  "slack": {
    "enabled": false
  }
}
```

### Webhooks

#### List Webhooks
```http
GET /api/webhooks
```

#### Create Webhook
```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["keyword.position_changed", "technical.issue_found"],
  "secret": "webhook_secret_123"
}
```

#### Test Webhook
```http
POST /api/webhooks/{webhookId}/test
```

### Health & Status

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3456789,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "queue": "healthy"
  }
}
```

#### API Status
```http
GET /api/status
```

**Response:**
```json
{
  "operational": true,
  "incidents": [],
  "maintenance": {
    "scheduled": false,
    "message": null
  }
}
```

## Pagination

All list endpoints support pagination:

```http
GET /api/keywords?page=2&limit=50
```

**Pagination Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 245,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Filtering & Sorting

Most list endpoints support filtering and sorting:

```http
GET /api/keywords?
  websiteId=123&
  positionMin=1&
  positionMax=10&
  sort=-searchVolume&
  search=seo
```

## Batch Operations

Some endpoints support batch operations:

```http
POST /api/keywords/batch
Content-Type: application/json

{
  "operation": "update",
  "filters": {
    "websiteId": "123",
    "positionMin": 50
  },
  "data": {
    "isTracking": false
  }
}
```

## WebSocket Events

For real-time updates, connect to:
```
wss://api.seoanalyzer.app/ws
```

**Authentication:**
```json
{
  "type": "auth",
  "token": "YOUR_JWT_TOKEN"
}
```

**Subscribe to events:**
```json
{
  "type": "subscribe",
  "channels": ["website:123", "keywords:123"]
}
```

**Event examples:**
```json
{
  "type": "keyword.position_changed",
  "data": {
    "keywordId": "456",
    "oldPosition": 8,
    "newPosition": 5
  }
}
```