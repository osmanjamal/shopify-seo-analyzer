import api from './api';

// Google API service wrapper
class GoogleApiService {
  constructor() {
    this.tokens = {
      access_token: null,
      refresh_token: null,
      expires_at: null
    };
    
    // Load tokens from storage
    this.loadTokens();
  }
  
  // Token management
  loadTokens() {
    try {
      const stored = localStorage.getItem('googleTokens');
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load Google tokens:', error);
    }
  }
  
  saveTokens(tokens) {
    this.tokens = {
      ...tokens,
      expires_at: tokens.expires_at || Date.now() + (tokens.expires_in * 1000)
    };
    localStorage.setItem('googleTokens', JSON.stringify(this.tokens));
  }
  
  async setTokens(tokens) {
    this.saveTokens(tokens);
  }
  
  async clearTokens() {
    this.tokens = {
      access_token: null,
      refresh_token: null,
      expires_at: null
    };
    localStorage.removeItem('googleTokens');
  }
  
  // Check if tokens are valid
  async checkTokenValidity() {
    if (!this.tokens.access_token) return false;
    
    // Check expiration
    if (this.tokens.expires_at && this.tokens.expires_at < Date.now()) {
      // Try to refresh
      return await this.refreshTokens();
    }
    
    return true;
  }
  
  // Refresh access token
  async refreshTokens() {
    try {
      if (!this.tokens.refresh_token) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post('/auth/google/refresh', {
        refresh_token: this.tokens.refresh_token
      });
      
      if (response.access_token) {
        this.saveTokens({
          ...this.tokens,
          access_token: response.access_token,
          expires_in: response.expires_in
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh Google tokens:', error);
      await this.clearTokens();
      return false;
    }
  }
  
  // Make authenticated request to Google API via backend
  async request(endpoint, options = {}) {
    try {
      // Ensure tokens are valid
      const isValid = await this.checkTokenValidity();
      if (!isValid) {
        throw new Error('Invalid or expired Google tokens');
      }
      
      // Make request through backend proxy
      return await api.post('/google/proxy', {
        endpoint,
        method: options.method || 'GET',
        params: options.params,
        body: options.body
      });
    } catch (error) {
      console.error('Google API request failed:', error);
      throw error;
    }
  }
  
  // Google Analytics methods
  async getAnalyticsAccounts() {
    return this.request('/analytics/management/accounts');
  }
  
  async getAnalyticsProperties(accountId) {
    return this.request(`/analytics/management/accounts/${accountId}/webproperties`);
  }
  
  async getAnalyticsViews(accountId, propertyId) {
    return this.request(
      `/analytics/management/accounts/${accountId}/webproperties/${propertyId}/profiles`
    );
  }
  
  async getAnalyticsData(viewId, metrics, dimensions, startDate, endDate) {
    return api.post('/analytics/query', {
      viewId,
      metrics,
      dimensions,
      startDate,
      endDate
    });
  }
  
  async getRealtimeData(viewId) {
    return api.get(`/analytics/realtime/${viewId}`);
  }
  
  // Google Search Console methods
  async getSearchConsoleProperties() {
    return api.get('/search-console/sites');
  }
  
  async getSearchPerformance(siteUrl, options = {}) {
    return api.post('/search-console/performance', {
      siteUrl,
      ...options
    });
  }
  
  async getSearchAnalytics(siteUrl, startDate, endDate, dimensions = ['query']) {
    return api.post('/search-console/analytics', {
      siteUrl,
      startDate,
      endDate,
      dimensions
    });
  }
  
  async getSitemaps(siteUrl) {
    return api.get(`/search-console/sitemaps/${encodeURIComponent(siteUrl)}`);
  }
  
  async submitSitemap(siteUrl, sitemapUrl) {
    return api.post('/search-console/sitemaps', {
      siteUrl,
      sitemapUrl
    });
  }
  
  async getUrlInspection(siteUrl, inspectionUrl) {
    return api.post('/search-console/url-inspection', {
      siteUrl,
      inspectionUrl
    });
  }
  
  // PageSpeed Insights
  async getPageSpeedData(url, strategy = 'mobile') {
    return api.get('/pagespeed/analyze', {
      params: { url, strategy }
    });
  }
  
  // Google My Business (if needed)
  async getBusinessInfo(accountId) {
    return api.get(`/my-business/accounts/${accountId}`);
  }
  
  async getBusinessReviews(accountId, locationId) {
    return api.get(`/my-business/accounts/${accountId}/locations/${locationId}/reviews`);
  }
  
  // OAuth flow helpers
  async initOAuthFlow(scopes = []) {
    try {
      const response = await api.post('/auth/google/init', { scopes });
      return response.authUrl;
    } catch (error) {
      console.error('Failed to init OAuth flow:', error);
      throw error;
    }
  }
  
  async handleOAuthCallback(code) {
    try {
      const response = await api.post('/auth/google/callback', { code });
      
      if (response.tokens) {
        this.saveTokens(response.tokens);
      }
      
      return response;
    } catch (error) {
      console.error('Failed to handle OAuth callback:', error);
      throw error;
    }
  }
  
  // Utility methods
  isConnected() {
    return !!this.tokens.access_token;
  }
  
  getAuthStatus() {
    return {
      connected: this.isConnected(),
      expiresAt: this.tokens.expires_at,
      hasRefreshToken: !!this.tokens.refresh_token
    };
  }
  
  // Format Google API errors
  formatError(error) {
    if (error.response?.data?.error) {
      const googleError = error.response.data.error;
      return {
        code: googleError.code,
        message: googleError.message,
        status: googleError.status,
        details: googleError.details
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      status: error.response?.status
    };
  }
}

// Create singleton instance
const googleApi = new GoogleApiService();

// Export instance
export default googleApi;

// Export class for testing
export { GoogleApiService };