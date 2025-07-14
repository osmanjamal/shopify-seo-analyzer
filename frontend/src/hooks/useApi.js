import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useApp } from '../context/AppContext';

// Custom hook for API calls with loading, error handling, and caching
export function useApi(url, options = {}) {
  const { showToast } = useApp();
  const [data, setData] = useState(options.initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelTokenRef = useRef(null);
  const cacheRef = useRef({});
  
  // Default options
  const {
    method = 'GET',
    params = null,
    body = null,
    headers = {},
    cache = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    onSuccess = null,
    onError = null,
    showErrorToast = true,
    autoFetch = true,
    retryCount = 0,
    retryDelay = 1000
  } = options;
  
  // Generate cache key
  const getCacheKey = useCallback(() => {
    return JSON.stringify({ url, method, params, body });
  }, [url, method, params, body]);
  
  // Check cache validity
  const isCacheValid = useCallback((cacheEntry) => {
    if (!cacheEntry) return false;
    const now = Date.now();
    return now - cacheEntry.timestamp < cacheTime;
  }, [cacheTime]);
  
  // Execute API call
  const execute = useCallback(async (overrideOptions = {}) => {
    const finalOptions = { ...options, ...overrideOptions };
    const cacheKey = getCacheKey();
    
    // Check cache first
    if (cache && method === 'GET' && cacheRef.current[cacheKey] && 
        isCacheValid(cacheRef.current[cacheKey])) {
      setData(cacheRef.current[cacheKey].data);
      setError(null);
      return cacheRef.current[cacheKey].data;
    }
    
    // Cancel previous request if exists
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Operation cancelled due to new request');
    }
    
    // Create new cancel token
    cancelTokenRef.current = api.cancelToken();
    
    setLoading(true);
    setError(null);
    
    let retryAttempt = 0;
    
    const makeRequest = async () => {
      try {
        let response;
        
        const config = {
          headers: { ...headers, ...finalOptions.headers },
          cancelToken: cancelTokenRef.current.token,
          params: finalOptions.params || params
        };
        
        switch (method.toUpperCase()) {
          case 'GET':
            response = await api.get(url, config);
            break;
          case 'POST':
            response = await api.post(url, finalOptions.body || body, config);
            break;
          case 'PUT':
            response = await api.put(url, finalOptions.body || body, config);
            break;
          case 'PATCH':
            response = await api.patch(url, finalOptions.body || body, config);
            break;
          case 'DELETE':
            response = await api.delete(url, config);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
        
        // Cache successful GET requests
        if (cache && method === 'GET') {
          cacheRef.current[cacheKey] = {
            data: response,
            timestamp: Date.now()
          };
        }
        
        setData(response);
        setError(null);
        
        // Call success callback
        if (onSuccess) {
          onSuccess(response);
        }
        
        return response;
      } catch (err) {
        // Check if request was cancelled
        if (api.isCancel(err)) {
          console.log('Request cancelled:', err.message);
          return;
        }
        
        // Retry logic
        if (retryAttempt < retryCount) {
          retryAttempt++;
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryAttempt));
          return makeRequest();
        }
        
        // Handle error
        const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
        setError(errorMessage);
        setData(null);
        
        // Show error toast if enabled
        if (showErrorToast && !err.response?.status?.toString().startsWith('4')) {
          showToast(errorMessage, 'error');
        }
        
        // Call error callback
        if (onError) {
          onError(err);
        }
        
        throw err;
      } finally {
        setLoading(false);
      }
    };
    
    return makeRequest();
  }, [url, method, params, body, headers, cache, cacheTime, onSuccess, onError, 
      showErrorToast, retryCount, retryDelay, options, getCacheKey, isCacheValid, showToast]);
  
  // Refetch data
  const refetch = useCallback((overrideOptions = {}) => {
    // Clear cache for this request
    const cacheKey = getCacheKey();
    delete cacheRef.current[cacheKey];
    
    return execute(overrideOptions);
  }, [execute, getCacheKey]);
  
  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);
  
  // Auto fetch on mount or dependencies change
  useEffect(() => {
    if (autoFetch) {
      execute();
    }
    
    // Cleanup function
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [url, autoFetch]); // Only re-run if URL or autoFetch changes
  
  return {
    data,
    loading,
    error,
    execute,
    refetch,
    clearCache,
    setData
  };
}

// Hook for mutation operations (POST, PUT, DELETE)
export function useMutation(url, options = {}) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const {
    method = 'POST',
    onSuccess = null,
    onError = null,
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed'
  } = options;
  
  const mutate = useCallback(async (payload, overrideOptions = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      const finalOptions = { ...options, ...overrideOptions };
      
      switch (method.toUpperCase()) {
        case 'POST':
          response = await api.post(url, payload, finalOptions);
          break;
        case 'PUT':
          response = await api.put(url, payload, finalOptions);
          break;
        case 'PATCH':
          response = await api.patch(url, payload, finalOptions);
          break;
        case 'DELETE':
          response = await api.delete(url, finalOptions);
          break;
        default:
          throw new Error(`Unsupported mutation method: ${method}`);
      }
      
      setData(response);
      
      // Show success toast
      if (showSuccessToast) {
        const message = response.message || successMessage;
        showToast(message, 'success');
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess(response);
      }
      
      return response;
    } catch (err) {
      const error = err.response?.data?.message || err.message || errorMessage;
      setError(error);
      
      // Show error toast
      if (showErrorToast) {
        showToast(error, 'error');
      }
      
      // Call error callback
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, method, options, onSuccess, onError, showSuccessToast, 
      showErrorToast, successMessage, errorMessage, showToast]);
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);
  
  return {
    mutate,
    loading,
    error,
    data,
    reset
  };
}

// Hook for paginated data
export function usePaginatedApi(url, options = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.pageSize || 10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  const { data, loading, error, refetch } = useApi(url, {
    ...options,
    params: {
      ...options.params,
      page,
      limit: pageSize
    },
    onSuccess: (response) => {
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 0);
        setTotalItems(response.pagination.totalItems || 0);
      }
      if (options.onSuccess) {
        options.onSuccess(response);
      }
    }
  });
  
  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);
  
  const previousPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);
  
  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
  }, []);
  
  return {
    data: data?.items || data || [],
    loading,
    error,
    refetch,
    // Pagination state
    page,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    // Pagination actions
    goToPage,
    nextPage,
    previousPage,
    changePageSize
  };
}

export default useApi;