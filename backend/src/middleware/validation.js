const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Handle validation errors
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = [];
    
    errors.array().forEach(err => {
      extractedErrors.push({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      });
    });

    logger.warn('Validation failed:', {
      path: req.path,
      errors: extractedErrors
    });

    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input and try again',
      errors: extractedErrors
    });
  }

  next();
};

// Custom validators
exports.isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

exports.isValidDomain = (value) => {
  const domainRegex = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})(?:\/.*)?$/;
  return domainRegex.test(value);
};

exports.isValidKeyword = (value) => {
  // Keywords should be 1-100 characters, no special characters except spaces and hyphens
  const keywordRegex = /^[a-zA-Z0-9\s\-]{1,100}$/;
  return keywordRegex.test(value.trim());
};

exports.isValidTimezone = (value) => {
  const validTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
  return validTimezones.includes(value);
};

// Sanitizers
exports.sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove any HTML tags
  value = value.replace(/<[^>]*>?/gm, '');
  
  // Trim whitespace
  value = value.trim();
  
  // Remove multiple spaces
  value = value.replace(/\s+/g, ' ');
  
  return value;
};

exports.sanitizeDomain = (value) => {
  if (!value) return value;
  
  let domain = value.toLowerCase().trim();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.replace(/^www\./, '');
  domain = domain.replace(/\/$/, '');
  
  return domain;
};

// Pagination validator
exports.validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (page < 1) {
    return res.status(400).json({
      error: 'Invalid pagination',
      message: 'Page number must be greater than 0'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      error: 'Invalid pagination',
      message: 'Limit must be between 1 and 100'
    });
  }
  
  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };
  
  next();
};

// Date range validator
exports.validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({
      error: 'Invalid date',
      message: 'Start date must be a valid date in YYYY-MM-DD format'
    });
  }
  
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({
      error: 'Invalid date',
      message: 'End date must be a valid date in YYYY-MM-DD format'
    });
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'Start date must be before end date'
      });
    }
    
    // Maximum 1 year range
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end - start > maxRange) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'Date range cannot exceed 1 year'
      });
    }
  }
  
  req.dateRange = {
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null
  };
  
  next();
};

// Helper function to validate date format
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}