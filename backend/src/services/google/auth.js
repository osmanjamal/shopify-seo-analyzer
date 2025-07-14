const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const Settings = require('../../models/Settings');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { retry } = require('../../utils/helpers');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });

    this.scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly'
    ];
  }

  // Generate authorization URL
  generateAuthUrl(state = null, additionalParams = {}) {
    const params = {
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent',
      state: state,
      ...additionalParams
    };

    return this.oauth2Client.generateAuthUrl(params);
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      logger.info('Successfully exchanged code for tokens');
      return tokens;
    } catch (error) {
      logger.error('Failed to exchange code for tokens:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  // Verify ID token
  async verifyIdToken(idToken) {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      return ticket.getPayload();
    } catch (error) {
      logger.error('Failed to verify ID token:', error);
      throw new Error('Invalid ID token');
    }
  }

  // Get user OAuth2 client
  getUserOAuth2Client(tokens) {
    const client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    
    client.setCredentials(tokens);
    return client;
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const client = this.getUserOAuth2Client({
        refresh_token: refreshToken
      });

      const { credentials } = await client.refreshAccessToken();
      logger.info('Successfully refreshed access token');
      
      return credentials;
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh Google access token');
    }
  }

  // Get valid tokens for user
  async getValidTokens(userId) {
    try {
      // Check cache first
      const cacheKey = `google:tokens:${userId}`;
      const cachedTokens = await Cache.get(cacheKey);
      
      if (cachedTokens && !this.isTokenExpired(cachedTokens)) {
        return cachedTokens;
      }

      // Get from database
      const settings = await Settings.findOne({
        where: { user_id: userId }
      });

      if (!settings || !settings.google_refresh_token) {
        throw new Error('No Google refresh token found');
      }

      // Refresh the token
      const newTokens = await this.refreshAccessToken(settings.google_refresh_token);
      
      // Cache the new tokens
      await Cache.set(cacheKey, newTokens, TTL.medium);
      
      return newTokens;
    } catch (error) {
      logger.error('Failed to get valid tokens:', error);
      throw error;
    }
  }

  // Check if token is expired
  isTokenExpired(tokens) {
    if (!tokens.expiry_date) return true;
    
    const now = new Date().getTime();
    const expiryTime = new Date(tokens.expiry_date).getTime();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return (expiryTime - bufferTime) <= now;
  }

  // Store user tokens
  async storeUserTokens(userId, tokens) {
    try {
      const settings = await Settings.getOrCreate(userId);
      
      // Only store refresh token
      if (tokens.refresh_token) {
        settings.google_refresh_token = tokens.refresh_token;
        await settings.save();
      }

      // Cache access token
      const cacheKey = `google:tokens:${userId}`;
      await Cache.set(cacheKey, {
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope
      }, TTL.medium);

      logger.info(`Stored Google tokens for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to store user tokens:', error);
      throw error;
    }
  }

  // Revoke user tokens
  async revokeUserTokens(userId) {
    try {
      const tokens = await this.getValidTokens(userId);
      
      if (tokens.access_token) {
        await this.oauth2Client.revokeToken(tokens.access_token);
      }

      // Clear from database
      const settings = await Settings.findOne({
        where: { user_id: userId }
      });
      
      if (settings) {
        settings.google_refresh_token = null;
        await settings.save();
      }

      // Clear from cache
      await Cache.delete(`google:tokens:${userId}`);

      logger.info(`Revoked Google tokens for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to revoke user tokens:', error);
      throw error;
    }
  }

  // Make authenticated API call
  async makeAuthenticatedCall(userId, apiCall) {
    return retry(async () => {
      const tokens = await this.getValidTokens(userId);
      const auth = this.getUserOAuth2Client(tokens);
      
      try {
        return await apiCall(auth);
      } catch (error) {
        // If token error, try refreshing once
        if (error.code === 401 || error.message.includes('invalid_grant')) {
          logger.info('Token expired, refreshing...');
          
          const settings = await Settings.findOne({
            where: { user_id: userId }
          });
          
          const newTokens = await this.refreshAccessToken(settings.google_refresh_token);
          await this.storeUserTokens(userId, newTokens);
          
          const newAuth = this.getUserOAuth2Client(newTokens);
          return await apiCall(newAuth);
        }
        
        throw error;
      }
    }, {
      maxAttempts: 3,
      delay: 1000
    });
  }

  // Check user's Google permissions
  async checkUserPermissions(userId) {
    try {
      const tokens = await this.getValidTokens(userId);
      const tokenInfo = await this.oauth2Client.getTokenInfo(tokens.access_token);
      
      const requiredScopes = [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/analytics.readonly'
      ];
      
      const hasAllScopes = requiredScopes.every(scope => 
        tokenInfo.scopes.includes(scope)
      );

      return {
        valid: true,
        email: tokenInfo.email,
        scopes: tokenInfo.scopes,
        hasAllRequiredScopes: hasAllScopes,
        missingScopes: requiredScopes.filter(scope => 
          !tokenInfo.scopes.includes(scope)
        )
      };
    } catch (error) {
      logger.error('Failed to check user permissions:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Get Google user profile
  async getUserProfile(accessToken) {
    try {
      const oauth2 = google.oauth2({
        version: 'v2',
        auth: this.oauth2Client
      });

      this.oauth2Client.setCredentials({ access_token: accessToken });

      const { data } = await oauth2.userinfo.get();
      
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        verified_email: data.verified_email
      };
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      throw new Error('Failed to get Google user profile');
    }
  }
}

// Export singleton instance
module.exports = new GoogleAuthService();