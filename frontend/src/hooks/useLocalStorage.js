import { useState, useEffect, useCallback, useRef } from 'react';

// Custom hook for localStorage with React state synchronization
export function useLocalStorage(key, initialValue, options = {}) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = true,
    ttl = null // Time to live in milliseconds
  } = options;
  
  // Refs to track the key and prevent unnecessary updates
  const keyRef = useRef(key);
  const initialValueRef = useRef(initialValue);
  
  // Initialize state with value from localStorage
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      
      if (item === null) {
        return initialValue;
      }
      
      // Check if value has TTL
      if (ttl) {
        const parsed = deserialize(item);
        if (parsed && parsed._timestamp) {
          const age = Date.now() - parsed._timestamp;
          if (age > ttl) {
            // Value has expired
            window.localStorage.removeItem(key);
            return initialValue;
          }
          // Return the actual value without metadata
          return parsed.value;
        }
      }
      
      return deserialize(item);
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  // Update localStorage when state changes
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        if (valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          let dataToStore = valueToStore;
          
          // Add TTL metadata if enabled
          if (ttl) {
            dataToStore = {
              value: valueToStore,
              _timestamp: Date.now()
            };
          }
          
          window.localStorage.setItem(key, serialize(dataToStore));
        }
        
        // Dispatch custom event for cross-tab synchronization
        if (syncAcrossTabs) {
          window.dispatchEvent(new CustomEvent('local-storage', {
            detail: { key, value: valueToStore }
          }));
        }
      }
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue, syncAcrossTabs, ttl]);
  
  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        
        // Dispatch custom event for cross-tab synchronization
        if (syncAcrossTabs) {
          window.dispatchEvent(new CustomEvent('local-storage', {
            detail: { key, value: undefined }
          }));
        }
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, syncAcrossTabs]);
  
  // Check if value exists and is not expired
  const hasValue = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return false;
      
      // Check TTL if enabled
      if (ttl) {
        const parsed = deserialize(item);
        if (parsed && parsed._timestamp) {
          const age = Date.now() - parsed._timestamp;
          if (age > ttl) {
            return false;
          }
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }, [key, ttl, deserialize]);
  
  // Get the raw value from localStorage
  const getRawValue = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  
  // Listen to storage changes from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined' || !syncAcrossTabs) return;
    
    const handleStorageChange = (e) => {
      // Handle native storage events (from other tabs)
      if (e.type === 'storage' && e.key === key) {
        try {
          const newValue = e.newValue === null 
            ? initialValue 
            : deserialize(e.newValue);
          
          // Check TTL if enabled
          if (ttl && newValue && newValue._timestamp) {
            const age = Date.now() - newValue._timestamp;
            if (age > ttl) {
              setStoredValue(initialValue);
              return;
            }
            setStoredValue(newValue.value);
          } else {
            setStoredValue(newValue);
          }
        } catch (error) {
          console.error(`Error syncing localStorage key "${key}":`, error);
        }
      }
      
      // Handle custom events (from same tab)
      if (e.type === 'local-storage' && e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };
    
    // Listen to both native storage events and custom events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [key, initialValue, syncAcrossTabs, deserialize, ttl]);
  
  // Update ref if key changes
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      // Re-initialize value from new key
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(deserialize(item));
        } else {
          setStoredValue(initialValue);
        }
      } catch (error) {
        console.error(`Error loading new localStorage key "${key}":`, error);
        setStoredValue(initialValue);
      }
    }
  }, [key, initialValue, deserialize]);
  
  return [storedValue, setValue, removeValue, { hasValue, getRawValue }];
}

// Hook for managing multiple localStorage values
export function useLocalStorageSet(prefix = '') {
  const [keys, setKeys] = useState(() => {
    if (typeof window === 'undefined') return new Set();
    
    const allKeys = new Set();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        allKeys.add(key);
      }
    }
    return allKeys;
  });
  
  // Get all values with the prefix
  const getAll = useCallback(() => {
    if (typeof window === 'undefined') return {};
    
    const values = {};
    keys.forEach(key => {
      try {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          values[key] = JSON.parse(value);
        }
      } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
      }
    });
    return values;
  }, [keys]);
  
  // Set a value
  const set = useCallback((key, value) => {
    const fullKey = prefix + key;
    try {
      window.localStorage.setItem(fullKey, JSON.stringify(value));
      setKeys(prev => new Set([...prev, fullKey]));
    } catch (error) {
      console.error(`Error setting localStorage key "${fullKey}":`, error);
    }
  }, [prefix]);
  
  // Remove a value
  const remove = useCallback((key) => {
    const fullKey = prefix + key;
    try {
      window.localStorage.removeItem(fullKey);
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(fullKey);
        return newKeys;
      });
    } catch (error) {
      console.error(`Error removing localStorage key "${fullKey}":`, error);
    }
  }, [prefix]);
  
  // Clear all values with the prefix
  const clear = useCallback(() => {
    keys.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error);
      }
    });
    setKeys(new Set());
  }, [keys]);
  
  // Get the count of stored items
  const size = keys.size;
  
  return { getAll, set, remove, clear, size, keys };
}

// Utility functions for common localStorage operations
export const localStorageUtils = {
  // Check if localStorage is available
  isAvailable: () => {
    try {
      const test = '__localStorage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
  
  // Get storage size in bytes
  getSize: () => {
    if (typeof window === 'undefined') return 0;
    
    let size = 0;
    for (let key in window.localStorage) {
      if (window.localStorage.hasOwnProperty(key)) {
        size += window.localStorage[key].length + key.length;
      }
    }
    return size * 2; // UTF-16 uses 2 bytes per character
  },
  
  // Get remaining storage space (approximate)
  getRemainingSpace: () => {
    if (typeof window === 'undefined') return 0;
    
    try {
      // Try to fill localStorage to find the limit
      const testKey = '__storage_test__';
      let data = '0';
      let previousData = '';
      
      // Double the data size until we hit the limit
      while (data.length < 10485760) { // Stop at 10MB to prevent hanging
        previousData = data;
        data += data;
        try {
          window.localStorage.setItem(testKey, data);
        } catch {
          // We've hit the limit
          window.localStorage.removeItem(testKey);
          
          // Binary search to find exact limit
          let low = previousData.length;
          let high = data.length;
          let mid;
          
          while (low < high - 1) {
            mid = Math.floor((low + high) / 2);
            try {
              window.localStorage.setItem(testKey, '0'.repeat(mid));
              low = mid;
            } catch {
              high = mid;
            }
          }
          
          window.localStorage.removeItem(testKey);
          return low * 2 - localStorageUtils.getSize();
        }
      }
      
      window.localStorage.removeItem(testKey);
      return 10485760; // Default to 10MB if we couldn't determine
    } catch {
      return 0;
    }
  },
  
  // Clear all localStorage data
  clearAll: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  },
  
  // Export all localStorage data
  exportData: () => {
    if (typeof window === 'undefined') return {};
    
    const data = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        try {
          data[key] = JSON.parse(window.localStorage.getItem(key));
        } catch {
          data[key] = window.localStorage.getItem(key);
        }
      }
    }
    return data;
  },
  
  // Import localStorage data
  importData: (data) => {
    if (typeof window === 'undefined') return;
    
    Object.entries(data).forEach(([key, value]) => {
      try {
        window.localStorage.setItem(
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      } catch (error) {
        console.error(`Failed to import localStorage key "${key}":`, error);
      }
    });
  }
};

export default useLocalStorage;