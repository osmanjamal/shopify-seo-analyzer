// Application constants
export const APP_NAME = process.env.REACT_APP_APP_NAME || 'Shopify SEO Analyzer';
export const APP_VERSION = process.env.REACT_APP_APP_VERSION || '1.0.0';

// API endpoints
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

// Authentication
export const AUTH_TOKEN_KEY = 'authToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'language',
  SELECTED_WEBSITE: 'selectedWebsiteId',
  GOOGLE_TOKENS: 'googleTokens',
  SHOPIFY_STORE: 'shopifyStore',
  USER_PREFERENCES: 'userPreferences',
  RECENT_SEARCHES: 'recentSearches',
  DASHBOARD_LAYOUT: 'dashboardLayout'
};

// Time constants
export const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
};

// Cache TTL values
export const CACHE_TTL = {
  SHORT: parseInt(process.env.REACT_APP_CACHE_TTL_SHORT) || 300, // 5 minutes
  MEDIUM: parseInt(process.env.REACT_APP_CACHE_TTL_MEDIUM) || 3600, // 1 hour
  LONG: parseInt(process.env.REACT_APP_CACHE_TTL_LONG) || 86400 // 24 hours
};

// Limits
export const LIMITS = {
  MAX_FILE_SIZE: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760, // 10MB
  MAX_KEYWORDS: parseInt(process.env.REACT_APP_MAX_KEYWORDS) || 1000,
  MAX_WEBSITES: parseInt(process.env.REACT_APP_MAX_WEBSITES) || 10,
  MAX_BULK_OPERATIONS: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000
};

// SEO metrics thresholds
export const SEO_THRESHOLDS = {
  TITLE_LENGTH: {
    MIN: 30,
    MAX: 60,
    OPTIMAL: 55
  },
  DESCRIPTION_LENGTH: {
    MIN: 120,
    MAX: 160,
    OPTIMAL: 155
  },
  URL_LENGTH: {
    MAX: 100,
    OPTIMAL: 75
  },
  PAGE_LOAD_TIME: {
    FAST: 2000, // 2 seconds
    AVERAGE: 4000, // 4 seconds
    SLOW: 6000 // 6 seconds
  },
  PAGE_SIZE: {
    OPTIMAL: 3145728, // 3MB
    MAX: 5242880 // 5MB
  }
};

// Keyword position ranges
export const POSITION_RANGES = {
  TOP_3: { min: 1, max: 3, label: 'Top 3', color: '#10b981' },
  TOP_10: { min: 4, max: 10, label: 'Top 10', color: '#3b82f6' },
  TOP_20: { min: 11, max: 20, label: 'Top 20', color: '#f59e0b' },
  TOP_50: { min: 21, max: 50, label: 'Top 50', color: '#8b5cf6' },
  TOP_100: { min: 51, max: 100, label: 'Top 100', color: '#6b7280' },
  NOT_RANKING: { min: 101, max: null, label: 'Not Ranking', color: '#ef4444' }
};

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#8b5cf6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4',
  NEUTRAL: '#6b7280'
};

// Chart color palette
export const CHART_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1'  // indigo
];

// Date range options
export const DATE_RANGES = {
  TODAY: { value: 'today', label: 'Today', days: 1 },
  YESTERDAY: { value: 'yesterday', label: 'Yesterday', days: 1 },
  LAST_7_DAYS: { value: '7days', label: 'Last 7 Days', days: 7 },
  LAST_14_DAYS: { value: '14days', label: 'Last 14 Days', days: 14 },
  LAST_30_DAYS: { value: '30days', label: 'Last 30 Days', days: 30 },
  LAST_90_DAYS: { value: '90days', label: 'Last 90 Days', days: 90 },
  LAST_6_MONTHS: { value: '6months', label: 'Last 6 Months', days: 180 },
  LAST_YEAR: { value: '1year', label: 'Last Year', days: 365 },
  CUSTOM: { value: 'custom', label: 'Custom Range', days: null }
};

// Technical SEO issue types
export const ISSUE_TYPES = {
  CRITICAL: { level: 'critical', weight: 10, color: '#ef4444' },
  HIGH: { level: 'high', weight: 5, color: '#f59e0b' },
  MEDIUM: { level: 'medium', weight: 3, color: '#3b82f6' },
  LOW: { level: 'low', weight: 1, color: '#6b7280' },
  INFO: { level: 'info', weight: 0, color: '#06b6d4' }
};

// Page types for Shopify
export const SHOPIFY_PAGE_TYPES = {
  HOME: 'home',
  PRODUCT: 'product',
  COLLECTION: 'collection',
  PAGE: 'page',
  BLOG_POST: 'blog_post',
  CART: 'cart',
  CHECKOUT: 'checkout',
  SEARCH: 'search',
  ACCOUNT: 'account'
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// File types
export const ACCEPTED_FILE_TYPES = {
  CSV: '.csv',
  EXCEL: '.xlsx,.xls',
  JSON: '.json',
  XML: '.xml',
  TEXT: '.txt'
};

// Export formats
export const EXPORT_FORMATS = {
  CSV: { value: 'csv', label: 'CSV', mime: 'text/csv' },
  EXCEL: { value: 'xlsx', label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  PDF: { value: 'pdf', label: 'PDF', mime: 'application/pdf' },
  JSON: { value: 'json', label: 'JSON', mime: 'application/json' }
};

// Regex patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  DOMAIN: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
  SHOPIFY_DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  XS: 480,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
};

// Default pagination
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
};

// Google Analytics metrics
export const GA_METRICS = {
  USERS: 'ga:users',
  NEW_USERS: 'ga:newUsers',
  SESSIONS: 'ga:sessions',
  BOUNCE_RATE: 'ga:bounceRate',
  PAGE_VIEWS: 'ga:pageviews',
  AVG_SESSION_DURATION: 'ga:avgSessionDuration',
  GOAL_COMPLETIONS: 'ga:goalCompletionsAll',
  ECOMMERCE_REVENUE: 'ga:transactionRevenue'
};

// Google Analytics dimensions
export const GA_DIMENSIONS = {
  SOURCE: 'ga:source',
  MEDIUM: 'ga:medium',
  CAMPAIGN: 'ga:campaign',
  KEYWORD: 'ga:keyword',
  LANDING_PAGE: 'ga:landingPagePath',
  DEVICE_CATEGORY: 'ga:deviceCategory',
  COUNTRY: 'ga:country',
  CITY: 'ga:city'
};

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  VALIDATION: 'Please check your input and try again.',
  FILE_TOO_LARGE: `File size must be less than ${LIMITS.MAX_FILE_SIZE / 1048576}MB`,
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully!',
  DELETED: 'Deleted successfully!',
  UPDATED: 'Updated successfully!',
  CREATED: 'Created successfully!',
  COPIED: 'Copied to clipboard!',
  EXPORTED: 'Exported successfully!',
  IMPORTED: 'Imported successfully!'
};

export default {
  APP_NAME,
  APP_VERSION,
  API_BASE_URL,
  WS_BASE_URL,
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  GOOGLE_CLIENT_ID,
  STORAGE_KEYS,
  TIME_CONSTANTS,
  CACHE_TTL,
  LIMITS,
  SEO_THRESHOLDS,
  POSITION_RANGES,
  CHART_COLORS,
  CHART_PALETTE,
  DATE_RANGES,
  ISSUE_TYPES,
  SHOPIFY_PAGE_TYPES,
  HTTP_STATUS,
  NOTIFICATION_TYPES,
  ACCEPTED_FILE_TYPES,
  EXPORT_FORMATS,
  REGEX_PATTERNS,
  ANIMATION_DURATION,
  BREAKPOINTS,
  DEFAULT_PAGINATION,
  GA_METRICS,
  GA_DIMENSIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};