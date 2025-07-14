const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Request ID middleware
const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    res.send(data);
    
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    });
    
    // Log slow requests
    if (duration > 3000) {
      logger.warn('Slow request detected', {
        requestId: req.id,
        url: req.originalUrl,
        duration: `${duration}ms`
      });
    }
  };
  
  next();
};

// API usage tracking
const apiUsageTracker = async (req, res, next) => {
  if (!req.user) return next();
  
  try {
    const { redisClient } = require('./rateLimit');
    const key = `api:usage:${req.user.id}:${new Date().toISOString().split('T')[0]}`;
    
    await redisClient.hincrby(key, req.method, 1);
    await redisClient.hincrby(key, 'total', 1);
    await redisClient.expire(key, 90 * 24 * 60 * 60); // Keep for 90 days
    
  } catch (error) {
    logger.error('Error tracking API usage:', error);
  }
  
  next();
};

// Performance monitoring
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    const endMemory = process.memoryUsage();
    
    // Log performance metrics for slow requests
    if (duration > 1000) {
      logger.warn('Performance warning', {
        requestId: req.id,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        memoryUsed: `${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`
      });
    }
  });
  
  next();
};

// Security event logging
const securityLogger = (eventType) => {
  return (req, res, next) => {
    logger.warn('Security event', {
      type: eventType,
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    next();
  };
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    userId: req.user?.id
  });
  next(err);
};

// Audit logging for sensitive operations
const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      res.json = originalJson;
      
      // Log after successful response
      if (res.statusCode < 400) {
        logger.info('Audit log', {
          action,
          resourceType,
          resourceId: req.params.id || data.id,
          userId: req.user?.id,
          userEmail: req.user?.email,
          ip: req.ip,
          timestamp: new Date().toISOString(),
          changes: req.body
        });
      }
      
      return res.json(data);
    };
    
    next();
  };
};

// Database query logging (for debugging)
const queryLogger = (sequelize) => {
  if (process.env.NODE_ENV === 'development') {
    sequelize.beforeFind((options) => {
      logger.debug('Database query', {
        model: options.model?.name,
        where: options.where,
        include: options.include?.map(i => i.model?.name)
      });
    });
  }
};

module.exports = {
  requestId,
  requestLogger,
  apiUsageTracker,
  performanceMonitor,
  securityLogger,
  errorLogger,
  auditLog,
  queryLogger
};