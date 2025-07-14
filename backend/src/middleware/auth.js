const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Authenticate user
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'is_active']
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid authentication token',
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

// Authorize based on roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Check if user owns the resource
exports.checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      let isOwner = false;

      switch (resourceType) {
        case 'website':
          const Website = require('../models/Website');
          const website = await Website.findByPk(req.params.id);
          isOwner = website && website.user_id === req.user.id;
          break;

        case 'keyword':
          const Keyword = require('../models/Keyword');
          const keyword = await Keyword.findByPk(req.params.id, {
            include: [{
              model: require('../models/Website'),
              as: 'website',
              attributes: ['user_id']
            }]
          });
          isOwner = keyword && keyword.website.user_id === req.user.id;
          break;

        case 'settings':
          isOwner = req.params.userId === req.user.id;
          break;

        default:
          return res.status(400).json({
            error: 'Invalid resource type'
          });
      }

      // Admins can access all resources
      if (req.user.role === 'admin') {
        return next();
      }

      if (!isOwner) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        });
      }

      next();

    } catch (error) {
      logger.error('Ownership check error:', error);
      next(error);
    }
  };
};

// Optional authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'is_active']
    });

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
    }

    next();

  } catch (error) {
    // Continue without authentication
    next();
  }
};