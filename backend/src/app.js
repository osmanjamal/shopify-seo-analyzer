const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import configurations
const corsConfig = require('./config/cors');
const securityConfig = require('./config/security');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimit');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const keywordsRoutes = require('./routes/keywords');
const analyticsRoutes = require('./routes/analytics');
const technicalRoutes = require('./routes/technical');
const settingsRoutes = require('./routes/settings');

// Import utils
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Apply security middleware
securityConfig(app);

// Apply CORS
app.use(corsConfig);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
} else {
  app.use(morgan('dev'));
}

// Static files (if needed)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// API version endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Shopify SEO Analyzer API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      keywords: '/api/keywords',
      analytics: '/api/analytics',
      technical: '/api/technical',
      settings: '/api/settings'
    }
  });
});

// Apply rate limiting to API routes
app.use('/api/', rateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/keywords', keywordsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;