import { ERROR_MESSAGES, HTTP_STATUS } from './constants';
import { safeStorage } from './storage';

// Error types
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Custom error class
export class AppError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.severity = details.severity || ErrorSeverity.MEDIUM;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      details: this.details,
      timestamp: this.timestamp,
      severity: this.severity,
      stack: this.stack
    };
  }
}

// HTTP error handler
export const handleHttpError = (error) => {
  const status = error.response?.status;
  const data = error.response?.data;
  const message = data?.message || error.message;
  
  let type = ErrorTypes.UNKNOWN;
  let userMessage = ERROR_MESSAGES.GENERIC;
  let severity = ErrorSeverity.MEDIUM;
  
  if (!error.response) {
    // Network error
    type = ErrorTypes.NETWORK;
    userMessage = ERROR_MESSAGES.NETWORK;
    severity = ErrorSeverity.HIGH;
  } else {
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        type = ErrorTypes.AUTHENTICATION;
        userMessage = ERROR_MESSAGES.SESSION_EXPIRED;
        severity = ErrorSeverity.HIGH;
        break;
        
      case HTTP_STATUS.FORBIDDEN:
        type = ErrorTypes.AUTHORIZATION;
        userMessage = ERROR_MESSAGES.UNAUTHORIZED;
        severity = ErrorSeverity.HIGH;
        break;
        
      case HTTP_STATUS.NOT_FOUND:
        type = ErrorTypes.NOT_FOUND;
        userMessage = 'The requested resource was not found';
        severity = ErrorSeverity.LOW;
        break;
        
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      case HTTP_STATUS.BAD_REQUEST:
        type = ErrorTypes.VALIDATION;
        userMessage = data?.errors ? formatValidationErrors(data.errors) : ERROR_MESSAGES.VALIDATION;
        severity = ErrorSeverity.LOW;
        break;
        
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        type = ErrorTypes.CLIENT;
        userMessage = 'Too many requests. Please try again later.';
        severity = ErrorSeverity.MEDIUM;
        break;
        
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        type = ErrorTypes.SERVER;
        userMessage = 'Server error. Please try again later.';
        severity = ErrorSeverity.CRITICAL;
        break;
        
      default:
        if (status >= 400 && status < 500) {
          type = ErrorTypes.CLIENT;
        } else if (status >= 500) {
          type = ErrorTypes.SERVER;
          severity = ErrorSeverity.HIGH;
        }
    }
  }
  
  return new AppError(userMessage, type, {
    status,
    originalMessage: message,
    data,
    severity,
    url: error.config?.url,
    method: error.config?.method
  });
};

// Format validation errors
const formatValidationErrors = (errors) => {
  if (typeof errors === 'string') return errors;
  
  if (Array.isArray(errors)) {
    return errors.join('. ');
  }
  
  if (typeof errors === 'object') {
    const messages = [];
    Object.entries(errors).forEach(([field, fieldErrors]) => {
      if (Array.isArray(fieldErrors)) {
        messages.push(`${field}: ${fieldErrors.join(', ')}`);
      } else {
        messages.push(`${field}: ${fieldErrors}`);
      }
    });
    return messages.join('. ');
  }
  
  return ERROR_MESSAGES.VALIDATION;
};

// Global error handler
export const handleGlobalError = (error, errorInfo = {}) => {
  // Create app error
  const appError = error instanceof AppError ? error : new AppError(
    error.message || ERROR_MESSAGES.GENERIC,
    ErrorTypes.UNKNOWN,
    {
      severity: ErrorSeverity.HIGH,
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary
    }
  );
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Global Error:', appError);
  }
  
  // Log to error tracking service
  logError(appError);
  
  // Store error for debugging
  storeError(appError);
  
  return appError;
};

// Error logger
const errorLog = [];
const MAX_ERROR_LOG_SIZE = 100;

export const logError = (error) => {
  const errorEntry = {
    ...error.toJSON(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  // Add to in-memory log
  errorLog.unshift(errorEntry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.pop();
  }
  
  // Send to error tracking service (Sentry, etc.)
  if (process.env.REACT_APP_SENTRY_DSN) {
    // Sentry integration would go here
    // window.Sentry?.captureException(error);
  }
  
  // Send to backend
  if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
    sendErrorToBackend(errorEntry);
  }
};

// Store error in localStorage for debugging
const storeError = (error) => {
  try {
    const errors = safeStorage.get('error_log', []);
    errors.unshift(error.toJSON());
    
    // Keep only last 50 errors
    safeStorage.set('error_log', errors.slice(0, 50));
  } catch {
    // Ignore storage errors
  }
};

// Send error to backend
const sendErrorToBackend = async (errorEntry) => {
  try {
    // This would send to your error logging endpoint
    // await api.post('/errors/log', errorEntry);
  } catch {
    // Ignore logging errors
  }
};

// Get error log
export const getErrorLog = () => {
  return [...errorLog];
};

// Clear error log
export const clearErrorLog = () => {
  errorLog.length = 0;
  safeStorage.remove('error_log');
};

// Error recovery strategies
export const errorRecovery = {
  // Retry failed operation
  retry: async (operation, options = {}) => {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 2,
      shouldRetry = () => true
    } = options;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(backoff, attempt - 1))
        );
      }
    }
    
    throw lastError;
  },
  
  // Fallback to cached data
  fallbackToCache: (key, operation) => {
    return operation().catch(error => {
      const cached = safeStorage.get(`cache_${key}`);
      if (cached) {
        console.warn('Using cached data due to error:', error);
        return cached;
      }
      throw error;
    });
  },
  
  // Graceful degradation
  degradeGracefully: (primaryOperation, fallbackOperation) => {
    return primaryOperation().catch(error => {
      console.warn('Primary operation failed, using fallback:', error);
      return fallbackOperation();
    });
  }
};

// Error boundary helpers
export const errorBoundaryHandler = {
  // Log error from error boundary
  logErrorBoundary: (error, errorInfo) => {
    handleGlobalError(error, {
      ...errorInfo,
      errorBoundary: true
    });
  },
  
  // Get fallback UI based on error
  getFallbackUI: (error) => {
    if (error.type === ErrorTypes.NETWORK) {
      return {
        title: 'Connection Error',
        message: 'Please check your internet connection and try again.',
        showRetry: true
      };
    }
    
    if (error.type === ErrorTypes.AUTHENTICATION) {
      return {
        title: 'Authentication Required',
        message: 'Please log in to continue.',
        showLogin: true
      };
    }
    
    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please refresh the page.',
      showRefresh: true
    };
  }
};

// User-friendly error messages
export const getUserFriendlyMessage = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error.response) {
    return handleHttpError(error).message;
  }
  
  if (error.message) {
    // Map technical errors to user-friendly messages
    const errorMap = {
      'Network Error': ERROR_MESSAGES.NETWORK,
      'timeout': 'The request took too long. Please try again.',
      'canceled': 'The request was cancelled.',
    };
    
    for (const [key, value] of Object.entries(errorMap)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
  }
  
  return ERROR_MESSAGES.GENERIC;
};

// Error reporting
export const reportError = {
  // Report to user
  toUser: (error, options = {}) => {
    const message = getUserFriendlyMessage(error);
    const { showToast, showAlert } = options;
    
    if (showToast) {
      showToast(message, 'error');
    }
    
    if (showAlert) {
      showAlert('error', message);
    }
    
    return message;
  },
  
  // Report to developers
  toDevelopers: (error, context = {}) => {
    const report = {
      error: error instanceof AppError ? error.toJSON() : {
        message: error.message,
        stack: error.stack
      },
      context,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Report:', report);
      console.groupEnd();
    }
    
    logError(error);
  }
};

export default {
  ErrorTypes,
  ErrorSeverity,
  AppError,
  handleHttpError,
  handleGlobalError,
  logError,
  getErrorLog,
  clearErrorLog,
  errorRecovery,
  errorBoundaryHandler,
  getUserFriendlyMessage,
  reportError
};