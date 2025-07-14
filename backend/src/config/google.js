const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Create Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

// Default rate limiter for general API endpoints
const defaultLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:default:'
  }),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.'
    });
  }
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many authentication attempts',
    message: 'Please wait before trying again.'
  }
});

// Analysis endpoints limiter (expensive operations)
const analysisLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:analysis:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 analyses per hour
  message: {
    error: 'Analysis rate limit exceeded',
    message: 'You can only perform 10 analyses per hour. Please try again later.'
  }
});

// API key based rate limiter
const apiKeyLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:apikey:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour for API key users
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  },
  skip: (req) => {
    // Skip if no API key provided (use default limiter instead)
    return !req.headers['x-api-key'];
  }
});

// Dynamic rate limiter based on user role
const createDynamicLimiter = (role) => {
  const limits = {
    admin: { windowMs: 15 * 60 * 1000, max: 1000 },
    user: { windowMs: 15 * 60 * 1000, max: 200 },
    viewer: { windowMs: 15 * 60 * 1000, max: 50 }
  };

  const config = limits[role] || limits.viewer;

  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rl:${role}:`
    }),
    windowMs: config.windowMs,
    max: config.max,
    keyGenerator: (req) => {
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      return !req.user; // Skip if not authenticated
    }
  });
};

// Rate limit by endpoint
const endpointLimiter = (endpoint, maxRequests, windowMinutes = 15) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rl:endpoint:${endpoint}:`
    }),
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => {
      return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    }
  });
};

// Check rate limit status
const getRateLimitStatus = async (key, prefix = 'rl:default:') => {
  try {
    const fullKey = `${prefix}${key}`;
    const count = await redisClient.get(fullKey);
    const ttl = await redisClient.ttl(fullKey);
    
    return {
      count: parseInt(count) || 0,
      ttl: ttl > 0 ? ttl : 0,
      remaining: count ? Math.max(0, 100 - parseInt(count)) : 100
    };
  } catch (error) {
    logger.error('Error checking rate limit status:', error);
    return null;
  }
};

// Reset rate limit for a specific key
const resetRateLimit = async (key, prefix = 'rl:default:') => {
  try {
    const fullKey = `${prefix}${key}`;
    await redisClient.del(fullKey);
    return true;
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    return false;
  }
};

module.exports = {
  defaultLimiter,
  authLimiter,
  analysisLimiter,
  apiKeyLimiter,
  createDynamicLimiter,
  endpointLimiter,
  getRateLimitStatus,
  resetRateLimit,
  redisClient
};