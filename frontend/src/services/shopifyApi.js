import api from './api';

// Shopify API service wrapper
class ShopifyApiService {
  constructor() {
    this.storeUrl = null;
    this.accessToken = null;
    this.storeName = null;
    
    // Load store info from storage
    this.loadStoreInfo();
  }
  
  // Store info management
  loadStoreInfo() {
    try {
      const stored = localStorage.getItem('shopifyStore');
      if (stored) {
        const info = JSON.parse(stored);
        this.storeUrl = info.storeUrl;
        this.accessToken = info.accessToken;
        this.storeName = info.storeName;
      }
    } catch (error) {
      console.error('Failed to load Shopify store info:', error);
    }
  }
  
  saveStoreInfo(info) {
    this.storeUrl = info.storeUrl;
    this.accessToken = info.accessToken;
    this.storeName = info.storeName;
    
    localStorage.setItem('shopifyStore', JSON.stringify({
      storeUrl: this.storeUrl,
      accessToken: this.accessToken,
      storeName: this.storeName
    }));
  }
  
  clearStoreInfo() {
    this.storeUrl = null;
    this.accessToken = null;
    this.storeName = null;
    localStorage.removeItem('shopifyStore');
  }
  
  isConnected() {
    return !!this.storeUrl && !!this.accessToken;
  }
  
  // Store management
  async connectStore(storeUrl, accessToken) {
    try {
      // Validate store connection
      const response = await api.post('/shopify/connect', {
        storeUrl,
        accessToken
      });
      
      if (response.success) {
        this.saveStoreInfo({
          storeUrl,
          accessToken,
          storeName: response.storeName
        });
        
        return response;
      }
      
      throw new Error(response.message || 'Failed to connect store');
    } catch (error) {
      console.error('Connect store error:', error);
      throw error;
    }
  }
  
  async disconnectStore() {
    try {
      await api.post('/shopify/disconnect');
      this.clearStoreInfo();
      return { success: true };
    } catch (error) {
      console.error('Disconnect store error:', error);
      throw error;
    }
  }
  
  async getStoreInfo() {
    return api.get('/shopify/store');
  }
  
  // Products
  async getProducts(params = {}) {
    return api.get('/shopify/products', { params });
  }
  
  async getProduct(productId) {
    return api.get(`/shopify/products/${productId}`);
  }
  
  async getProductsSEO() {
    return api.get('/shopify/products/seo-analysis');
  }
  
  async updateProductSEO(productId, seoData) {
    return api.put(`/shopify/products/${productId}/seo`, seoData);
  }
  
  async getProductMetafields(productId) {
    return api.get(`/shopify/products/${productId}/metafields`);
  }
  
  // Collections
  async getCollections(params = {}) {
    return api.get('/shopify/collections', { params });
  }
  
  async getCollection(collectionId) {
    return api.get(`/shopify/collections/${collectionId}`);
  }
  
  async getCollectionsSEO() {
    return api.get('/shopify/collections/seo-analysis');
  }
  
  // Orders and Sales
  async getOrders(params = {}) {
    return api.get('/shopify/orders', { params });
  }
  
  async getOrderAnalytics(dateRange = '30days') {
    return api.get('/shopify/analytics/orders', {
      params: { dateRange }
    });
  }
  
  async getSalesAnalytics(dateRange = '30days') {
    return api.get('/shopify/analytics/sales', {
      params: { dateRange }
    });
  }
  
  async getConversionRate(dateRange = '30days') {
    return api.get('/shopify/analytics/conversion', {
      params: { dateRange }
    });
  }
  
  // Customers
  async getCustomers(params = {}) {
    return api.get('/shopify/customers', { params });
  }
  
  async getCustomerAnalytics() {
    return api.get('/shopify/analytics/customers');
  }
  
  async getCustomerSegments() {
    return api.get('/shopify/customers/segments');
  }
  
  // Pages and Blog Posts
  async getPages() {
    return api.get('/shopify/pages');
  }
  
  async getPageSEO(pageId) {
    return api.get(`/shopify/pages/${pageId}/seo`);
  }
  
  async getBlogPosts() {
    return api.get('/shopify/blogs/posts');
  }
  
  async getBlogPostSEO(postId) {
    return api.get(`/shopify/blogs/posts/${postId}/seo`);
  }
  
  // SEO Analysis
  async runFullSEOAnalysis() {
    return api.post('/shopify/seo/analyze-all');
  }
  
  async getSEOScore() {
    return api.get('/shopify/seo/score');
  }
  
  async getSEORecommendations() {
    return api.get('/shopify/seo/recommendations');
  }
  
  async getStructuredDataAnalysis() {
    return api.get('/shopify/seo/structured-data');
  }
  
  // Site Performance
  async getSiteSpeed() {
    return api.get('/shopify/performance/speed');
  }
  
  async getMobileUsability() {
    return api.get('/shopify/performance/mobile');
  }
  
  async getThemeAnalysis() {
    return api.get('/shopify/theme/analysis');
  }
  
  // Competitors
  async getCompetitorProducts(competitorDomain) {
    return api.get('/shopify/competitors/products', {
      params: { domain: competitorDomain }
    });
  }
  
  async compareWithCompetitor(competitorDomain) {
    return api.post('/shopify/competitors/compare', {
      competitorDomain
    });
  }
  
  // Bulk Operations
  async bulkUpdateProductSEO(updates) {
    return api.post('/shopify/products/bulk-seo-update', {
      updates
    });
  }
  
  async exportSEOReport(format = 'pdf') {
    return api.get('/shopify/export/seo-report', {
      params: { format },
      responseType: 'blob'
    });
  }
  
  // Webhooks
  async getWebhooks() {
    return api.get('/shopify/webhooks');
  }
  
  async createWebhook(topic, address) {
    return api.post('/shopify/webhooks', {
      topic,
      address
    });
  }
  
  async deleteWebhook(webhookId) {
    return api.delete(`/shopify/webhooks/${webhookId}`);
  }
  
  // Utility methods
  formatShopifyError(error) {
    if (error.response?.data?.errors) {
      const shopifyErrors = error.response.data.errors;
      
      // Handle Shopify's error format
      if (typeof shopifyErrors === 'object') {
        const messages = [];
        for (const [field, errors] of Object.entries(shopifyErrors)) {
          messages.push(`${field}: ${errors.join(', ')}`);
        }
        return messages.join('; ');
      }
      
      return shopifyErrors;
    }
    
    return error.message || 'An error occurred with Shopify';
  }
  
  // Helper to build Shopify admin URLs
  buildAdminUrl(path) {
    if (!this.storeUrl) return null;
    return `https://${this.storeUrl}/admin/${path}`;
  }
  
  // Get store status
  getStatus() {
    return {
      connected: this.isConnected(),
      storeUrl: this.storeUrl,
      storeName: this.storeName
    };
  }
}

// Create singleton instance
const shopifyApi = new ShopifyApiService();

// Export instance
export default shopifyApi;

// Export class for testing
export { ShopifyApiService };