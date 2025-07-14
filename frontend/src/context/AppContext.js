import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const initialState = {
  // App settings
  theme: localStorage.getItem('theme') || 'light',
  language: localStorage.getItem('language') || 'en',
  notifications: {
    enabled: true,
    sound: false,
    desktop: false
  },
  
  // UI state
  sidebarCollapsed: false,
  activeView: 'dashboard',
  loading: {
    global: false,
    components: {}
  },
  
  // Alerts and messages
  alerts: [],
  toasts: [],
  
  // Selected website context
  selectedWebsite: null,
  websites: [],
  
  // Feature flags
  features: {
    realTimeAnalytics: true,
    competitorAnalysis: true,
    aiInsights: false,
    bulkOperations: true
  }
};

// Action types
const ActionTypes = {
  SET_THEME: 'SET_THEME',
  SET_LANGUAGE: 'SET_LANGUAGE',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_ACTIVE_VIEW: 'SET_ACTIVE_VIEW',
  SET_LOADING: 'SET_LOADING',
  ADD_ALERT: 'ADD_ALERT',
  REMOVE_ALERT: 'REMOVE_ALERT',
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  SET_SELECTED_WEBSITE: 'SET_SELECTED_WEBSITE',
  SET_WEBSITES: 'SET_WEBSITES',
  UPDATE_NOTIFICATIONS: 'UPDATE_NOTIFICATIONS',
  UPDATE_FEATURES: 'UPDATE_FEATURES',
  RESET_STATE: 'RESET_STATE'
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_THEME:
      localStorage.setItem('theme', action.payload);
      document.documentElement.setAttribute('data-theme', action.payload);
      return { ...state, theme: action.payload };
      
    case ActionTypes.SET_LANGUAGE:
      localStorage.setItem('language', action.payload);
      return { ...state, language: action.payload };
      
    case ActionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
      
    case ActionTypes.SET_ACTIVE_VIEW:
      return { ...state, activeView: action.payload };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };
      
    case ActionTypes.ADD_ALERT:
      return {
        ...state,
        alerts: [...state.alerts, { id: Date.now(), ...action.payload }]
      };
      
    case ActionTypes.REMOVE_ALERT:
      return {
        ...state,
        alerts: state.alerts.filter(alert => alert.id !== action.payload)
      };
      
    case ActionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, { id: Date.now(), ...action.payload }]
      };
      
    case ActionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      };
      
    case ActionTypes.SET_SELECTED_WEBSITE:
      return { ...state, selectedWebsite: action.payload };
      
    case ActionTypes.SET_WEBSITES:
      return { ...state, websites: action.payload };
      
    case ActionTypes.UPDATE_NOTIFICATIONS:
      return {
        ...state,
        notifications: { ...state.notifications, ...action.payload }
      };
      
    case ActionTypes.UPDATE_FEATURES:
      return {
        ...state,
        features: { ...state.features, ...action.payload }
      };
      
    case ActionTypes.RESET_STATE:
      return initialState;
      
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Theme management
  const setTheme = useCallback((theme) => {
    dispatch({ type: ActionTypes.SET_THEME, payload: theme });
  }, []);
  
  // Language management
  const setLanguage = useCallback((language) => {
    dispatch({ type: ActionTypes.SET_LANGUAGE, payload: language });
  }, []);
  
  // UI state management
  const toggleSidebar = useCallback(() => {
    dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
  }, []);
  
  const setActiveView = useCallback((view) => {
    dispatch({ type: ActionTypes.SET_ACTIVE_VIEW, payload: view });
  }, []);
  
  const setLoading = useCallback((key, value) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: { key, value } });
  }, []);
  
  // Alert management
  const showAlert = useCallback((type, message, title = '', options = {}) => {
    const alert = {
      type, // 'success', 'error', 'warning', 'info'
      message,
      title,
      ...options
    };
    dispatch({ type: ActionTypes.ADD_ALERT, payload: alert });
    
    // Auto-remove after duration
    if (options.duration) {
      setTimeout(() => {
        dispatch({ type: ActionTypes.REMOVE_ALERT, payload: alert.id });
      }, options.duration);
    }
  }, []);
  
  const hideAlert = useCallback((alertId) => {
    dispatch({ type: ActionTypes.REMOVE_ALERT, payload: alertId });
  }, []);
  
  // Toast notifications
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const toast = { message, type };
    dispatch({ type: ActionTypes.ADD_TOAST, payload: toast });
    
    // Auto-remove after duration
    setTimeout(() => {
      dispatch({ type: ActionTypes.REMOVE_TOAST, payload: toast.id });
    }, duration);
  }, []);
  
  // Website management
  const setSelectedWebsite = useCallback((website) => {
    dispatch({ type: ActionTypes.SET_SELECTED_WEBSITE, payload: website });
    if (website) {
      localStorage.setItem('selectedWebsiteId', website.id);
    } else {
      localStorage.removeItem('selectedWebsiteId');
    }
  }, []);
  
  const setWebsites = useCallback((websites) => {
    dispatch({ type: ActionTypes.SET_WEBSITES, payload: websites });
  }, []);
  
  // Settings management
  const updateNotifications = useCallback((settings) => {
    dispatch({ type: ActionTypes.UPDATE_NOTIFICATIONS, payload: settings });
  }, []);
  
  const updateFeatures = useCallback((features) => {
    dispatch({ type: ActionTypes.UPDATE_FEATURES, payload: features });
  }, []);
  
  // Reset app state
  const resetState = useCallback(() => {
    dispatch({ type: ActionTypes.RESET_STATE });
  }, []);
  
  // Context value
  const value = {
    ...state,
    // Actions
    setTheme,
    setLanguage,
    toggleSidebar,
    setActiveView,
    setLoading,
    showAlert,
    hideAlert,
    showToast,
    setSelectedWebsite,
    setWebsites,
    updateNotifications,
    updateFeatures,
    resetState
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use app context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export default AppContext;