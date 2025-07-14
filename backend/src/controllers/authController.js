const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

// Initialize Google OAuth client
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
});

// Generate JWT tokens
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });

  return { accessToken, refreshToken };
};

// Register new user
exports.register = async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create user with hashed password
    const user = await User.createWithPassword({
      email,
      password,
      full_name,
      role: 'user'
    });

    // Create default settings
    await Settings.getOrCreate(user.id);

    // Generate tokens
    const tokens = generateTokens(user);

    // Log registration
    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON(),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

// Login with email/password
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

// Google OAuth redirect
exports.googleAuthRedirect = async (req, res, next) => {
  try {
    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });
    
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Google auth redirect error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
  }
};

// Google OAuth callback
exports.googleAuthCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code`);
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({
      where: { google_id: googleId }
    });

    if (!user) {
      // Check if user exists with email
      user = await User.findByEmail(email);
      
      if (user) {
        // Link Google account
        user.google_id = googleId;
        user.avatar_url = picture;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          email,
          google_id: googleId,
          full_name: name,
          avatar_url: picture,
          role: 'user',
          is_active: true
        });

        // Create default settings
        await Settings.getOrCreate(user.id);
      }
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Store Google refresh token in settings
    const settings = await Settings.getOrCreate(user.id);
    if (tokens.refresh_token) {
      settings.google_refresh_token = tokens.refresh_token;
      await settings.save();
    }

    // Generate JWT tokens
    const jwtTokens = generateTokens(user);

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/login/callback?token=${jwtTokens.accessToken}&refresh=${jwtTokens.refreshToken}`;
    res.redirect(redirectUrl);

  } catch (error) {
    logger.error('Google auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
  }
};

// Google OAuth login
exports.googleAuth = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code'
      });
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({
      where: { google_id: googleId }
    });

    if (!user) {
      // Check if user exists with email
      user = await User.findByEmail(email);
      
      if (user) {
        // Link Google account
        user.google_id = googleId;
        user.avatar_url = picture;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          email,
          google_id: googleId,
          full_name: name,
          avatar_url: picture,
          role: 'user',
          is_active: true
        });

        // Create default settings
        await Settings.getOrCreate(user.id);
      }
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Store Google refresh token in settings
    const settings = await Settings.getOrCreate(user.id);
    if (tokens.refresh_token) {
      settings.google_refresh_token = tokens.refresh_token;
      await settings.save();
    }

    // Generate JWT tokens
    const jwtTokens = generateTokens(user);

    res.json({
      message: 'Google authentication successful',
      user: user.toJSON(),
      token: jwtTokens.accessToken,
      refreshToken: jwtTokens.refreshToken,
      googleTokens: tokens
    });

  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(401).json({
      error: 'Google authentication failed',
      message: error.message
    });
  }
};

// Refresh access token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      message: 'Token refreshed successfully',
      tokens
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }
    next(error);
  }
};

// Logout
exports.logout = async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // Here we can blacklist the token if needed
  res.json({
    message: 'Logout successful'
  });
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Settings,
        as: 'settings'
      }]
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: user.toJSON()
    });

  } catch (error) {
    logger.error('Get current user error:', error);
    next(error);
  }
};

// Update password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findByPk(userId);
    
    // Users with Google auth only cannot change password
    if (!user.password_hash) {
      return res.status(400).json({
        error: 'Cannot change password',
        message: 'You are using Google authentication. Password change is not available.'
      });
    }

    // Verify current password
    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password updated successfully'
    });

  } catch (error) {
    logger.error('Update password error:', error);
    next(error);
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // For now, log the token
    logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);

    res.json({
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Password reset request error:', error);
    next(error);
  }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid reset token'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password reset successful'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }
    logger.error('Password reset error:', error);
    next(error);
  }
};