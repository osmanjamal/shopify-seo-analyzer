import { STORAGE_KEYS, CACHE_TTL } from './constants';

// Storage wrapper with error handling and serialization
class StorageManager {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.prefix = 'seo_analyzer_';
  }
  
  // Get full key with prefix
  getKey(key) {
    return `${this.prefix}${key}`;
  }
  
  // Set item with optional TTL
  set(key, value, ttl = null) {
    try {
      const fullKey = this.getKey(key);
      const data = {
        value,
        timestamp: Date.now(),
        ttl
      };
      
      this.storage.setItem(fullKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        this.cleanup();
        // Try again
        try {
          this.storage.setItem(this.getKey(key), JSON.stringify({ value, timestamp: Date.now(), ttl }));
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    }
  }
  
  // Get item with TTL check
  get(key, defaultValue = null) {
    try {
      const fullKey = this.getKey(key);
      const item = this.storage.getItem(fullKey);
      
      if (!item) return defaultValue;
      
      const data = JSON.parse(item);
      
      // Check TTL
      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        this.remove(key);
        return defaultValue;
      }
      
      return data.value;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }
  
  // Remove item
  remove(key) {
    try {
      this.storage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }
  
  // Check if item exists
  has(key) {
    return this.storage.getItem(this.getKey(key)) !== null;
  }
  
  // Clear all items with prefix
  clear() {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => this.storage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
  
  // Get all keys with prefix
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }
  
  // Get all items
  getAll() {
    const items = {};
    const keys = this.getAllKeys();
    
    keys.forEach(fullKey => {
      const key = fullKey.replace(this.prefix, '');
      const value = this.get(key);
      if (value !== null) {
        items[key] = value;
      }
    });
    
    return items;
  }
  
  // Cleanup expired items
  cleanup() {
    const keys = this.getAllKeys();
    let cleaned = 0;
    
    keys.forEach(fullKey => {
      try {
        const item = this.storage.getItem(fullKey);
        if (item) {
          const data = JSON.parse(item);
          if (data.ttl && Date.now() - data.timestamp > data.ttl) {
            this.storage.removeItem(fullKey);
            cleaned++;
          }
        }
      } catch {
        // Remove corrupted items
        this.storage.removeItem(fullKey);
        cleaned++;
      }
    });
    
    return cleaned;
  }
  
  // Get storage size
  getSize() {
    let size = 0;
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      const item = this.storage.getItem(key);
      if (item) {
        size += key.length + item.length;
      }
    });
    
    return size * 2; // UTF-16
  }
  
  // Export data
  export() {
    return this.getAll();
  }
  
  // Import data
  import(data) {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
}

// Create instances
export const localStorage = new StorageManager(window.localStorage);
export const sessionStorage = new StorageManager(window.sessionStorage);

// Memory storage for when localStorage is not available
class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  
  setItem(key, value) {
    this.data.set(key, value);
  }
  
  getItem(key) {
    return this.data.get(key) || null;
  }
  
  removeItem(key) {
    this.data.delete(key);
  }
  
  clear() {
    this.data.clear();
  }
  
  get length() {
    return this.data.size;
  }
  
  key(index) {
    return Array.from(this.data.keys())[index] || null;
  }
}

// Create memory storage instance
const memoryStorage = new MemoryStorage();

// Safe storage that falls back to memory
export const safeStorage = (() => {
  try {
    // Test localStorage availability
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return localStorage;
  } catch {
    console.warn('localStorage not available, using memory storage');
    return new StorageManager(memoryStorage);
  }
})();

// User preferences storage
export const preferences = {
  get: (key, defaultValue = null) => {
    const prefs = safeStorage.get(STORAGE_KEYS.USER_PREFERENCES, {});
    return key ? (prefs[key] ?? defaultValue) : prefs;
  },
  
  set: (key, value) => {
    const prefs = safeStorage.get(STORAGE_KEYS.USER_PREFERENCES, {});
    prefs[key] = value;
    safeStorage.set(STORAGE_KEYS.USER_PREFERENCES, prefs);
  },
  
  remove: (key) => {
    const prefs = safeStorage.get(STORAGE_KEYS.USER_PREFERENCES, {});
    delete prefs[key];
    safeStorage.set(STORAGE_KEYS.USER_PREFERENCES, prefs);
  },
  
  clear: () => {
    safeStorage.remove(STORAGE_KEYS.USER_PREFERENCES);
  }
};

// Recent searches storage
export const recentSearches = {
  get: (limit = 10) => {
    const searches = safeStorage.get(STORAGE_KEYS.RECENT_SEARCHES, []);
    return searches.slice(0, limit);
  },
  
  add: (search) => {
    const searches = safeStorage.get(STORAGE_KEYS.RECENT_SEARCHES, []);
    
    // Remove duplicate if exists
    const filtered = searches.filter(s => s.query !== search.query);
    
    // Add to beginning
    filtered.unshift({
      query: search.query,
      type: search.type,
      timestamp: Date.now()
    });
    
    // Keep only last 50 searches
    safeStorage.set(STORAGE_KEYS.RECENT_SEARCHES, filtered.slice(0, 50));
  },
  
  remove: (query) => {
    const searches = safeStorage.get(STORAGE_KEYS.RECENT_SEARCHES, []);
    const filtered = searches.filter(s => s.query !== query);
    safeStorage.set(STORAGE_KEYS.RECENT_SEARCHES, filtered);
  },
  
  clear: () => {
    safeStorage.remove(STORAGE_KEYS.RECENT_SEARCHES);
  }
};

// Cache management
export const cache = {
  set: (key, data, ttl = CACHE_TTL.MEDIUM) => {
    return safeStorage.set(`cache_${key}`, data, ttl * 1000);
  },
  
  get: (key) => {
    return safeStorage.get(`cache_${key}`);
  },
  
  remove: (key) => {
    return safeStorage.remove(`cache_${key}`);
  },
  
  clear: () => {
    const keys = safeStorage.getAllKeys();
    keys.forEach(key => {
      if (key.includes('cache_')) {
        safeStorage.storage.removeItem(key);
      }
    });
  },
  
  has: (key) => {
    return safeStorage.has(`cache_${key}`);
  }
};

// Dashboard layout storage
export const dashboardLayout = {
  get: () => {
    return safeStorage.get(STORAGE_KEYS.DASHBOARD_LAYOUT, {
      widgets: [],
      settings: {}
    });
  },
  
  save: (layout) => {
    safeStorage.set(STORAGE_KEYS.DASHBOARD_LAYOUT, layout);
  },
  
  reset: () => {
    safeStorage.remove(STORAGE_KEYS.DASHBOARD_LAYOUT);
  }
};

// Storage utilities
export const storageUtils = {
  // Check if storage is available
  isAvailable: (type = 'localStorage') => {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
  
  // Get total storage size
  getTotalSize: () => {
    const localSize = localStorage.getSize();
    const sessionSize = sessionStorage.getSize();
    return localSize + sessionSize;
  },
  
  // Clean up all expired items
  cleanupAll: () => {
    const localCleaned = localStorage.cleanup();
    const sessionCleaned = sessionStorage.cleanup();
    return localCleaned + sessionCleaned;
  },
  
  // Export all data
  exportAll: () => {
    return {
      localStorage: localStorage.export(),
      sessionStorage: sessionStorage.export(),
      timestamp: Date.now()
    };
  },
  
  // Import all data
  importAll: (data) => {
    if (data.localStorage) {
      localStorage.import(data.localStorage);
    }
    if (data.sessionStorage) {
      sessionStorage.import(data.sessionStorage);
    }
  },
  
  // Clear all storage
  clearAll: () => {
    localStorage.clear();
    sessionStorage.clear();
    cache.clear();
  }
};

// Auto cleanup on load
if (typeof window !== 'undefined') {
  // Cleanup expired items on page load
  window.addEventListener('load', () => {
    storageUtils.cleanupAll();
  });
  
  // Periodic cleanup every hour
  setInterval(() => {
    storageUtils.cleanupAll();
  }, 60 * 60 * 1000);
}

export default {
  localStorage,
  sessionStorage,
  safeStorage,
  preferences,
  recentSearches,
  cache,
  dashboardLayout,
  storageUtils
};