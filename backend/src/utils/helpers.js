const crypto = require('crypto');
const axios = require('axios');
const logger = require('./logger');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

// Generate UUID v4
const generateUUID = () => {
  return crypto.randomUUID();
};

// Hash string with SHA256
const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

// Sleep/delay function
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function with exponential backoff
const retry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    delay = 1000,
    multiplier = 2,
    maxDelay = 30000,
    shouldRetry = (error) => true
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      const waitTime = Math.min(delay * Math.pow(multiplier, attempt - 1), maxDelay);
      logger.debug(`Retry attempt ${attempt}/${maxAttempts} after ${waitTime}ms`);
      await sleep(waitTime);
    }
  }
  
  throw lastError;
};

// Batch array into chunks
const batchArray = (array, batchSize) => {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};

// Parallel processing with concurrency limit
const processInParallel = async (items, processor, concurrency = 5) => {
  const results = [];
  const executing = [];
  
  for (const item of items) {
    const promise = processor(item).then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
};

// Format bytes to human readable
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Parse and validate URL
const parseUrl = (url) => {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      origin: parsed.origin,
      host: parsed.host,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
    };
  } catch (error) {
    return null;
  }
};

// Extract domain from URL
const extractDomain = (url) => {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  
  return parsed.hostname.replace(/^www\./, '');
};

// Calculate percentage change
const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / oldValue) * 100;
};

// Round to decimal places
const roundTo = (number, decimals = 2) => {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Merge objects deeply
const deepMerge = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

// Check if value is object
const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

// Remove undefined/null values from object
const cleanObject = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

// Paginate array
const paginate = (array, page = 1, perPage = 20) => {
  const offset = (page - 1) * perPage;
  const items = array.slice(offset, offset + perPage);
  
  return {
    items,
    pagination: {
      page,
      perPage,
      total: array.length,
      totalPages: Math.ceil(array.length / perPage),
      hasNext: page < Math.ceil(array.length / perPage),
      hasPrev: page > 1
    }
  };
};

// Date helpers
const dateHelpers = {
  // Get date X days ago
  daysAgo: (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },
  
  // Format date to YYYY-MM-DD
  formatDate: (date) => {
    return date.toISOString().split('T')[0];
  },
  
  // Get date range
  getDateRange: (startDate, endDate) => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  },
  
  // Get start of day
  startOfDay: (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  
  // Get end of day
  endOfDay: (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9_\-\.]/gi, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

// Get client IP from request
const getClientIp = (req) => {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress;
};

// Check if running in production
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

// Environment variable helpers
const env = {
  get: (key, defaultValue = null) => {
    return process.env[key] || defaultValue;
  },
  
  getInt: (key, defaultValue = 0) => {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  },
  
  getBool: (key, defaultValue = false) => {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  },
  
  require: (key) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is required`);
    }
    return value;
  }
};

// HTTP request with retry
const httpRequest = async (url, options = {}) => {
  const defaultOptions = {
    timeout: 30000,
    headers: {
      'User-Agent': 'Shopify-SEO-Analyzer/1.0'
    }
  };
  
  const config = { ...defaultOptions, ...options, url };
  
  return retry(async () => {
    const response = await axios(config);
    return response.data;
  }, {
    maxAttempts: 3,
    shouldRetry: (error) => {
      return error.code === 'ECONNRESET' || 
             error.code === 'ETIMEDOUT' ||
             (error.response && error.response.status >= 500);
    }
  });
};

module.exports = {
  generateRandomString,
  generateUUID,
  hashString,
  sleep,
  retry,
  batchArray,
  processInParallel,
  formatBytes,
  parseUrl,
  extractDomain,
  calculatePercentageChange,
  roundTo,
  deepClone,
  deepMerge,
  isObject,
  cleanObject,
  paginate,
  dateHelpers,
  isValidEmail,
  sanitizeFilename,
  getClientIp,
  isProduction,
  env,
  httpRequest
};