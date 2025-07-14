# Webhooks

## Overview

SEO Analyzer webhooks allow you to receive real-time HTTP notifications when events occur in your account. Instead of polling our API, you can subscribe to events and we'll push data to your endpoint.

## Webhook Basics

### Creating a Webhook

```http
POST /api/webhooks
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "url": "https://example.com/webhooks/seo-analyzer",
  "events": [
    "keyword.position_changed",
    "technical.issue_found",
    "website.analysis_completed"
  ],
  "description": "Production webhook endpoint",
  "active": true
}
```

**Response:**
```json
{
  "id": "webhook_123456",
  "url": "https://example.com/webhooks/seo-analyzer",
  "events": ["keyword.position_changed", "technical.issue_found", "website.analysis_completed"],
  "secret": "whsec_abcdef123456789",
  "description": "Production webhook endpoint",
  "active": true,
  "createdAt": "2024-01-20T10:00:00Z"
}
```

**Important:** Save the `secret` - it's only shown once and is used to verify webhook signatures.

### Webhook Payload Structure

All webhooks follow this structure:

```json
{
  "id": "evt_123456789",
  "type": "keyword.position_changed",
  "created": 1705750000,
  "data": {
    // Event-specific data
  },
  "object": "event",
  "api_version": "2024-01-01",
  "request": {
    "id": "req_abc123",
    "idempotency_key": "key_xyz789"
  }
}
```

## Event Types

### Keyword Events

#### keyword.position_changed
Triggered when a tracked keyword's position changes.

```json
{
  "id": "evt_123456",
  "type": "keyword.position_changed",
  "created": 1705750000,
  "data": {
    "keyword": {
      "id": "keyword_789",
      "keyword": "seo tools",
      "websiteId": "website_123",
      "previousPosition": 8,
      "currentPosition": 5,
      "change": 3,
      "url": "https://example.com/seo-tools",
      "checkedAt": "2024-01-20T10:00:00Z"
    }
  }
}
```

#### keyword.entered_top10
Triggered when a keyword enters the top 10 results.

```json
{
  "id": "evt_123457",
  "type": "keyword.entered_top10",
  "created": 1705750100,
  "data": {
    "keyword": {
      "id": "keyword_789",
      "keyword": "best seo analyzer",
      "websiteId": "website_123",
      "previousPosition": 15,
      "currentPosition": 8,
      "url": "https://example.com/features"
    }
  }
}
```

#### keyword.dropped_significantly
Triggered when a keyword drops by 10+ positions.

```json
{
  "id": "evt_123458",
  "type": "keyword.dropped_significantly",
  "created": 1705750200,
  "data": {
    "keyword": {
      "id": "keyword_790",
      "keyword": "seo optimization",
      "websiteId": "website_123",
      "previousPosition": 5,
      "currentPosition": 18,
      "change": -13,
      "possibleReasons": ["algorithm_update", "new_competitor", "content_change"]
    }
  }
}
```

### Technical SEO Events

#### technical.issue_found
Triggered when a new technical issue is detected.

```json
{
  "id": "evt_123459",
  "type": "technical.issue_found",
  "created": 1705750300,
  "data": {
    "issue": {
      "id": "issue_456",
      "websiteId": "website_123",
      "type": "missing_meta_description",
      "severity": "medium",
      "pageUrl": "https://example.com/about",
      "title": "Missing Meta Description",
      "description": "This page lacks a meta description tag",
      "recommendation": "Add a unique meta description of 150-160 characters"
    }
  }
}
```

#### technical.issue_resolved
Triggered when a technical issue is resolved.

```json
{
  "id": "evt_123460",
  "type": "technical.issue_resolved",
  "created": 1705750400,
  "data": {
    "issue": {
      "id": "issue_456",
      "websiteId": "website_123",
      "type": "missing_meta_description",
      "pageUrl": "https://example.com/about",
      "resolvedAt": "2024-01-20T10:00:00Z",
      "resolvedAutomatically": true
    }
  }
}
```

### Website Events

#### website.analysis_completed
Triggered when a website analysis is completed.

```json
{
  "id": "evt_123461",
  "type": "website.analysis_completed",
  "created": 1705750500,
  "data": {
    "website": {
      "id": "website_123",
      "domain": "example.com",
      "previousScore": 78,
      "currentScore": 82,
      "improvement": 4,
      "analyzedAt": "2024-01-20T10:00:00Z",
      "summary": {
        "issuesFound": 5,
        "issuesResolved": 3,
        "keywordsTracked": 45,
        "keywordsImproved": 12
      }
    }
  }
}
```

#### website.score_decreased
Triggered when SEO score drops by 5+ points.

```json
{
  "id": "evt_123462",
  "type": "website.score_decreased",
  "created": 1705750600,
  "data": {
    "website": {
      "id": "website_123",
      "domain": "example.com",
      "previousScore": 85,
      "currentScore": 72,
      "decrease": 13,
      "factors": [
        "increased_load_time",
        "broken_links_detected",
        "keyword_rankings_dropped"
      ]
    }
  }
}
```

### Traffic Events

#### traffic.significant_change
Triggered when traffic changes by 20%+ compared to previous period.

```json
{
  "id": "evt_123463",
  "type": "traffic.significant_change",
  "created": 1705750700,
  "data": {
    "traffic": {
      "websiteId": "website_123",
      "period": "day",
      "previousValue": 1000,
      "currentValue": 1350,
      "changePercent": 35,
      "changeType": "increase",
      "source": "organic"
    }
  }
}
```

### Alert Events

#### alert.threshold_exceeded
Triggered when a configured alert threshold is exceeded.

```json
{
  "id": "evt_123464",
  "type": "alert.threshold_exceeded",
  "created": 1705750800,
  "data": {
    "alert": {
      "id": "alert_789",
      "type": "seo_score",
      "websiteId": "website_123",
      "threshold": 70,
      "currentValue": 65,
      "message": "SEO score dropped below threshold"
    }
  }
}
```

### Shopify Events

#### shopify.product_needs_optimization
Triggered when a Shopify product needs SEO optimization.

```json
{
  "id": "evt_123465",
  "type": "shopify.product_needs_optimization",
  "created": 1705750900,
  "data": {
    "product": {
      "id": "product_123",
      "shopifyId": "7654321",
      "title": "Example Product",
      "handle": "example-product",
      "issues": [
        "title_too_short",
        "missing_meta_description",
        "no_alt_text_on_images"
      ],
      "currentScore": 45,
      "potentialScore": 85
    }
  }
}
```

## Webhook Security

### Signature Verification

All webhooks include a signature in the `X-SEO-Analyzer-Signature` header. Verify this signature to ensure the webhook is from us.

**Node.js Example:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhooks/seo-analyzer', (req, res) => {
  const signature = req.headers['x-seo-analyzer-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  const event = req.body;
  console.log('Received event:', event.type);
  
  res.status(200).send('OK');
});
```

**Python Example:**
```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/seo-analyzer', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-SEO-Analyzer-Signature')
    payload = request.get_data(as_text=True)
    
    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401
    
    event = request.json
    print(f'Received event: {event["type"]}')
    
    return 'OK', 200
```

### Additional Headers

Webhooks include additional security headers:

```http
X-SEO-Analyzer-Signature: sha256=abcdef123456...
X-SEO-Analyzer-Event-ID: evt_123456
X-SEO-Analyzer-Timestamp: 1705750000
X-SEO-Analyzer-Retry-Count: 0
```

## Webhook Management

### List Webhooks

```http
GET /api/webhooks
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "webhooks": [
    {
      "id": "webhook_123456",
      "url": "https://example.com/webhooks/seo-analyzer",
      "events": ["keyword.position_changed"],
      "active": true,
      "createdAt": "2024-01-20T10:00:00Z",
      "lastDelivery": {
        "timestamp": "2024-01-20T11:00:00Z",
        "status": "success",
        "statusCode": 200
      }
    }
  ]
}
```

### Update Webhook

```http
PUT /api/webhooks/{webhookId}
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "events": ["keyword.position_changed", "website.analysis_completed"],
  "active": true
}
```

### Delete Webhook

```http
DELETE /api/webhooks/{webhookId}
Authorization: Bearer YOUR_JWT_TOKEN
```

### Test Webhook

Send a test event to verify your endpoint:

```http
POST /api/webhooks/{webhookId}/test
Authorization: Bearer YOUR_JWT_TOKEN
```

This sends a test event:
```json
{
  "id": "evt_test_123",
  "type": "test",
  "created": 1705750000,
  "data": {
    "message": "This is a test webhook from SEO Analyzer"
  }
}
```

## Webhook Delivery

### Retry Policy

Failed webhook deliveries are retried with exponential backoff:

1. Immediately
2. 5 seconds
3. 30 seconds
4. 2 minutes
5. 10 minutes
6. 30 minutes
7. 1 hour
8. 2 hours
9. 4 hours
10. 8 hours

After 10 failed attempts, the webhook is marked as failed.

### Requirements

Your webhook endpoint must:

1. Use HTTPS (TLS 1.2+)
2. Respond within 20 seconds
3. Return 2xx status code for success
4. Handle duplicate events (idempotency)

### Best Practices

1. **Respond quickly**: Acknowledge receipt immediately, process asynchronously
   ```javascript
   app.post('/webhook', (req, res) => {
     // Acknowledge immediately
     res.status(200).send('OK');
     
     // Process asynchronously
     processWebhookAsync(req.body);
   });
   ```

2. **Handle duplicates**: Use the event ID for idempotency
   ```javascript
   const processedEvents = new Set();
   
   function processWebhook(event) {
     if (processedEvents.has(event.id)) {
       console.log('Duplicate event:', event.id);
       return;
     }
     
     processedEvents.add(event.id);
     // Process event
   }
   ```

3. **Verify signatures**: Always verify webhook signatures
4. **Log everything**: Log all webhook activity for debugging
5. **Handle failures gracefully**: Implement proper error handling

## Webhook Logs

View webhook delivery logs:

```http
GET /api/webhooks/{webhookId}/logs
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log_123",
      "eventId": "evt_123456",
      "eventType": "keyword.position_changed",
      "deliveredAt": "2024-01-20T10:00:00Z",
      "statusCode": 200,
      "responseTime": 234,
      "attempt": 1,
      "success": true
    },
    {
      "id": "log_124",
      "eventId": "evt_123457",
      "eventType": "technical.issue_found",
      "attemptedAt": "2024-01-20T10:05:00Z",
      "statusCode": 500,
      "error": "Internal Server Error",
      "attempt": 3,
      "success": false,
      "nextRetry": "2024-01-20T10:35:00Z"
    }
  ]
}
```

## Event Filtering

Configure advanced filtering for webhooks:

```http
PUT /api/webhooks/{webhookId}/filters
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "filters": {
    "websites": ["website_123", "website_456"],
    "severity": ["high", "critical"],
    "keywords": {
      "minSearchVolume": 1000,
      "countries": ["US", "UK"]
    }
  }
}
```

## Webhook FAQ

### Q: How many webhooks can I create?
A: Free: 1, Starter: 3, Professional: 10, Enterprise: Unlimited

### Q: Can I use the same endpoint for multiple events?
A: Yes, use the `type` field to route events in your handler.

### Q: What happens if my endpoint is down?
A: We'll retry with exponential backoff. You can see failed deliveries in the logs.

### Q: Can I replay failed webhooks?
A: Yes, use the replay endpoint: `POST /api/webhooks/logs/{logId}/replay`

### Q: Is there a webhook payload size limit?
A: Yes, maximum payload size is 256KB.

### Q: Can I filter events by specific criteria?
A: Yes, use webhook filters to receive only relevant events.

### Q: How do I debug webhook issues?
A: Check webhook logs, verify signatures, ensure HTTPS, and check response times.

## Support

For webhook issues:
- Check our status page: https://status.seoanalyzer.app
- Contact support: support@seoanalyzer.app
- Documentation: https://docs.seoanalyzer.app/webhooks