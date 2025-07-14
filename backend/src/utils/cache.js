const Redis = require('ioredis');
const logger = require('./logger');

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  logger.error('Redis cache error:', err);
});

redis.on('connect', () => {
  logger.info('Redis cache connected');
});

// Cache key prefixes
const PREFIXES = {
  user: 'user:',
  website: 'website:',
  keyword: 'keyword:',
  analytics: 'analytics:',
  searchConsole: 'gsc:',
  pageSpeed: 'ps:',
  session: 'session:',
  temp: 'temp:'
};

// Default TTL values (in seconds)
const TTL = {
  short: 300,        // 5 minutes
  medium: 3600,      // 1 hour
  long: 86400,       // 24 hours
  week: 604800,      // 7 days
  month: 2592000     // 30 days
};

// Cache class
class Cache {
  // Get value from cache
  static async get(key) {
    try {
      const value = await redis.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Set value in cache
  static async set(key, value, ttl = TTL.medium) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  static async delete(key) {
    try {
      const result = await redis.del(key);
      logger.debug(`Cache delete: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  static async deletePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cache delete pattern: ${pattern} (${keys.length} keys)`);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  // Check if key exists
  static async exists(key) {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Get remaining TTL
  static async ttl(key) {
    try {
      const ttl = await redis.ttl(key);
      return ttl;
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  }

  // Increment counter
  static async increment(key, amount = 1) {
    try {
      const result = await redis.incrby(key, amount);
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  // Hash operations
  static async hset(key, field, value) {
    try {
      const serialized = JSON.stringify(value);
      await redis.hset(key, field, serialized);
      return true;
    } catch (error) {
      logger.error('Cache hset error:', error);
      return false;
    }
  }

  static async hget(key, field) {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  }

  static async hgetall(key) {
    try {
      const hash = await redis.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error('Cache hgetall error:', error);
      return {};
    }
  }

  // List operations
  static async lpush(key, ...values) {
    try {
      const serialized = values.map(v => JSON.stringify(v));
      await redis.lpush(key, ...serialized);
      return true;
    } catch (error) {
      logger.error('Cache lpush error:', error);
      return false;
    }
  }

  static async lrange(key, start = 0, stop = -1) {
    try {
      const values = await redis.lrange(key, start, stop);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      logger.error('Cache lrange error:', error);
      return [];
    }
  }
}

// Cache decorator for functions
const cached = (keyFn, ttl = TTL.medium) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const key = typeof keyFn === 'function' ? keyFn(...args) : keyFn;
      
      // Try to get from cache
      const cachedValue = await Cache.get(key);
      if (cachedValue !== null) {
        return cachedValue;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await Cache.set(key, result, ttl);
      
      return result;
    };

    return descriptor;
  };
};

// Cache middleware for Express routes
const cacheMiddleware = (keyFn, ttl = TTL.medium) => {
  return async (req, res, next) => {
    const key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
    
    // Try to get from cache
    const cachedValue = await Cache.get(key);
    if (cachedValue !== null) {
      logger.debug(`Cache hit for route: ${req.path}`);
      return res.json(cachedValue);
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to cache response
    res.json = (data) => {
      if (res.statusCode === 200) {
        Cache.set(key, data, ttl).catch(err => {
          logger.error('Failed to cache response:', err);
        });
      }
      return originalJson(data);
    };

    next();
  };
};

// Invalidate cache for specific entities
const invalidateCache = {
  user: async (userId) => {
    await Cache.deletePattern(`${PREFIXES.user}${userId}:*`);
  },
  
  website: async (websiteId) => {
    await Cache.deletePattern(`${PREFIXES.website}${websiteId}:*`);
  },
  
  keyword: async (keywordId) => {
    await Cache.deletePattern(`${PREFIXES.keyword}${keywordId}:*`);
  },
  
  analytics: async (websiteId) => {
    await Cache.deletePattern(`${PREFIXES.analytics}${websiteId}:*`);
  }
};

// Cache warmup
const warmupCache = async () => {
  try {
    logger.info('Starting cache warmup...');
    
    // Add warmup logic here
    // Example: Pre-cache frequently accessed data
    
    logger.info('Cache warmup completed');
  } catch (error) {
    logger.error('Cache warmup error:', error);
  }
};

// Get cache statistics
const getCacheStats = async () => {
  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    
    return {
      info: info.split('\r\n').reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value) acc[key] = value;
        return acc;
      }, {}),
      keyspace
    };
  } catch (error) {
    logger.error('Get cache stats error:', error);
    return null;
  }
};

module.exports = {
  redis,
  Cache,
  PREFIXES,
  TTL,
  cached,
  cacheMiddleware,
  invalidateCache,
  warmupCache,
  getCacheStats
};