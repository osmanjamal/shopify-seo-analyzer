import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add website context if available
    const selectedWebsiteId = localStorage.getItem('selectedWebsiteId');
    if (selectedWebsiteId && !config.headers['X-Website-ID']) {
      config.headers['X-Website-ID'] = selectedWebsiteId;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.config.url}`, response.data);
    }
    
    // Return data directly
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await api.post('/auth/refresh-token', { refreshToken });
          
          if (response.tokens) {
            localStorage.setItem('authToken', response.tokens.accessToken);
            localStorage.setItem('refreshToken', response.tokens.refreshToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${response.tokens.accessToken}`;
            originalRequest.headers.Authorization = `Bearer ${response.tokens.accessToken}`;
            
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = `Rate limited. Please try again in ${retryAfter || '60'} seconds.`;
      toast.error(message);
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error.response || error);
    }
    
    return Promise.reject(error);
  }
);

// API methods
const apiMethods = {
  // Authentication
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
  
  clearAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },
  
  // Request methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),
  
  // File upload
  upload: (url, formData, onProgress) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });
  },
  
  // Bulk operations
  bulk: async (requests) => {
    try {
      const responses = await Promise.all(
        requests.map(req => 
          api[req.method](req.url, req.data).catch(err => ({
            error: true,
            message: err.message,
            request: req
          }))
        )
      );
      
      return responses;
    } catch (error) {
      console.error('Bulk operation error:', error);
      throw error;
    }
  },
  
  // Cancel requests
  cancelToken: () => axios.CancelToken.source(),
  isCancel: (error) => axios.isCancel(error),
  
  // Utility methods
  buildUrl: (path, params) => {
    const url = new URL(path, api.defaults.baseURL);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
    }
    return url.toString();
  },
  
  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return response;
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
};

// Export configured instance
export default apiMethods;

// Export raw axios instance for special cases
export { api as axiosInstance };

// API endpoints constants
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile',
  GOOGLE_AUTH: '/auth/google',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  
  // Keywords
  KEYWORDS: '/keywords',
  KEYWORD_SEARCH: '/keywords/search',
  KEYWORD_SUGGESTIONS: '/keywords/suggestions',
  
  // Analytics
  ANALYTICS: '/analytics',
  ANALYTICS_REALTIME: '/analytics/realtime',
  
  // Technical
  TECHNICAL: '/technical',
  TECHNICAL_ANALYZE: '/technical/analyze',
  
  // Competitors
  COMPETITORS: '/competitors',
  COMPETITOR_ANALYSIS: '/competitors/analyze',
  
  // Settings
  SETTINGS: '/settings',
  
  // Websites
  WEBSITES: '/websites',
  WEBSITE_VERIFY: '/websites/verify',
  
  // Reports
  REPORTS: '/reports',
  REPORT_GENERATE: '/reports/generate',
  REPORT_EXPORT: '/reports/export'
};