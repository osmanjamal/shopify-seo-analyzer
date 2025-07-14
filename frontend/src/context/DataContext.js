import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useApp } from './AppContext';

// Create context
const DataContext = createContext();

// Provider component
export function DataProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { selectedWebsite, setLoading, showToast } = useApp();
  
  // Data state
  const [dashboardData, setDashboardData] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [technicalIssues, setTechnicalIssues] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [settings, setSettings] = useState(null);
  
  // Loading states
  const [dataLoading, setDataLoading] = useState({
    dashboard: false,
    keywords: false,
    analytics: false,
    technical: false,
    competitors: false,
    settings: false
  });
  
  // Error states
  const [dataErrors, setDataErrors] = useState({});
  
  // Real-time data
  const [realtimeData, setRealtimeData] = useState(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (force = false) => {
    if (!selectedWebsite?.id) return;
    
    // Skip if already loading or has recent data
    if (dataLoading.dashboard) return;
    if (!force && dashboardData?.lastUpdated && 
        Date.now() - new Date(dashboardData.lastUpdated) < 60000) {
      return;
    }
    
    try {
      setDataLoading(prev => ({ ...prev, dashboard: true }));
      setLoading('dashboard', true);
      
      const data = await api.get(`/dashboard/${selectedWebsite.id}`);
      
      setDashboardData({
        ...data,
        lastUpdated: new Date()
      });
      
      setDataErrors(prev => ({ ...prev, dashboard: null }));
    } catch (error) {
      console.error('Fetch dashboard data error:', error);
      setDataErrors(prev => ({ 
        ...prev, 
        dashboard: error.response?.data?.message || 'Failed to load dashboard data' 
      }));
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setDataLoading(prev => ({ ...prev, dashboard: false }));
      setLoading('dashboard', false);
    }
  }, [selectedWebsite?.id, dataLoading.dashboard, dashboardData?.lastUpdated, setLoading, showToast]);
  
  // Fetch keywords
  const fetchKeywords = useCallback(async (options = {}) => {
    if (!selectedWebsite?.id) return;
    
    try {
      setDataLoading(prev => ({ ...prev, keywords: true }));
      
      const params = {
        websiteId: selectedWebsite.id,
        ...options
      };
      
      const data = await api.get('/keywords', { params });
      
      setKeywords(data.keywords || []);
      setDataErrors(prev => ({ ...prev, keywords: null }));
      
      return data;
    } catch (error) {
      console.error('Fetch keywords error:', error);
      setDataErrors(prev => ({ 
        ...prev, 
        keywords: error.response?.data?.message || 'Failed to load keywords' 
      }));
      showToast('Failed to load keywords', 'error');
      return { keywords: [], total: 0 };
    } finally {
      setDataLoading(prev => ({ ...prev, keywords: false }));
    }
  }, [selectedWebsite?.id, showToast]);
  
  // Add keyword
  const addKeyword = async (keywordData) => {
    try {
      setLoading('addKeyword', true);
      
      const response = await api.post('/keywords', {
        ...keywordData,
        websiteId: selectedWebsite.id
      });
      
      // Update local state
      setKeywords(prev => [response.keyword, ...prev]);
      
      showToast('Keyword added successfully!', 'success');
      return { success: true, keyword: response.keyword };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add keyword';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('addKeyword', false);
    }
  };
  
  // Update keyword
  const updateKeyword = async (keywordId, updates) => {
    try {
      setLoading('updateKeyword', true);
      
      const response = await api.put(`/keywords/${keywordId}`, updates);
      
      // Update local state
      setKeywords(prev => 
        prev.map(k => k.id === keywordId ? response.keyword : k)
      );
      
      showToast('Keyword updated successfully!', 'success');
      return { success: true, keyword: response.keyword };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update keyword';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('updateKeyword', false);
    }
  };
  
  // Delete keyword
  const deleteKeyword = async (keywordId) => {
    try {
      setLoading('deleteKeyword', true);
      
      await api.delete(`/keywords/${keywordId}`);
      
      // Update local state
      setKeywords(prev => prev.filter(k => k.id !== keywordId));
      
      showToast('Keyword deleted successfully!', 'success');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete keyword';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('deleteKeyword', false);
    }
  };
  
  // Fetch analytics
  const fetchAnalytics = useCallback(async (dateRange = '7days') => {
    if (!selectedWebsite?.id) return;
    
    try {
      setDataLoading(prev => ({ ...prev, analytics: true }));
      
      const data = await api.get(`/analytics/${selectedWebsite.id}`, {
        params: { dateRange }
      });
      
      setAnalytics(data);
      setDataErrors(prev => ({ ...prev, analytics: null }));
      
      return data;
    } catch (error) {
      console.error('Fetch analytics error:', error);
      setDataErrors(prev => ({ 
        ...prev, 
        analytics: error.response?.data?.message || 'Failed to load analytics' 
      }));
      showToast('Failed to load analytics', 'error');
      return null;
    } finally {
      setDataLoading(prev => ({ ...prev, analytics: false }));
    }
  }, [selectedWebsite?.id, showToast]);
  
  // Fetch technical issues
  const fetchTechnicalIssues = useCallback(async (force = false) => {
    if (!selectedWebsite?.id) return;
    
    try {
      setDataLoading(prev => ({ ...prev, technical: true }));
      
      const data = await api.get(`/technical/${selectedWebsite.id}`, {
        params: { force }
      });
      
      setTechnicalIssues(data.issues || []);
      setDataErrors(prev => ({ ...prev, technical: null }));
      
      return data;
    } catch (error) {
      console.error('Fetch technical issues error:', error);
      setDataErrors(prev => ({ 
        ...prev, 
        technical: error.response?.data?.message || 'Failed to load technical issues' 
      }));
      showToast('Failed to load technical issues', 'error');
      return { issues: [] };
    } finally {
      setDataLoading(prev => ({ ...prev, technical: false }));
    }
  }, [selectedWebsite?.id, showToast]);
  
  // Run technical analysis
  const runTechnicalAnalysis = async () => {
    try {
      setLoading('technicalAnalysis', true);
      showToast('Starting technical analysis...', 'info');
      
      const response = await api.post(`/technical/${selectedWebsite.id}/analyze`);
      
      if (response.jobId) {
        // Poll for results
        const pollInterval = setInterval(async () => {
          try {
            const status = await api.get(`/technical/job/${response.jobId}`);
            
            if (status.completed) {
              clearInterval(pollInterval);
              await fetchTechnicalIssues(true);
              showToast('Technical analysis completed!', 'success');
            } else if (status.failed) {
              clearInterval(pollInterval);
              showToast('Technical analysis failed', 'error');
            }
          } catch (error) {
            clearInterval(pollInterval);
            console.error('Poll technical analysis error:', error);
          }
        }, 5000);
        
        return { success: true, jobId: response.jobId };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to start analysis';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('technicalAnalysis', false);
    }
  };
  
  // Fetch competitors
  const fetchCompetitors = useCallback(async () => {
    if (!selectedWebsite?.id) return;
    
    try {
      setDataLoading(prev => ({ ...prev, competitors: true }));
      
      const data = await api.get(`/competitors/${selectedWebsite.id}`);
      
      setCompetitors(data.competitors || []);
      setDataErrors(prev => ({ ...prev, competitors: null }));
      
      return data;
    } catch (error) {
      console.error('Fetch competitors error:', error);
      setDataErrors(prev => ({ 
        ...prev, 
        competitors: error.response?.data?.message || 'Failed to load competitors' 
      }));
      return { competitors: [] };
    } finally {
      setDataLoading(prev => ({ ...prev, competitors: false }));
    }
  }, [selectedWebsite?.id]);
  
  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setDataLoading(prev => ({ ...prev, settings: true }));
      
      const data = await api.get('/settings');
      
      setSettings(data);
      setDataErrors(prev => ({ ...prev, settings: null }));
      
      return data;
    } catch (error) {
      console.error('Fetch settings error:', error);
      setDataErrors(prev => ({ 
        ...prev, 
        settings: error.response?.data?.message || 'Failed to load settings' 
      }));
      return null;
    } finally {
      setDataLoading(prev => ({ ...prev, settings: false }));
    }
  }, [isAuthenticated]);
  
  // Update settings
  const updateSettings = async (updates) => {
    try {
      setLoading('updateSettings', true);
      
      const response = await api.put('/settings', updates);
      
      setSettings(response.settings);
      showToast('Settings updated successfully!', 'success');
      
      return { success: true, settings: response.settings };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update settings';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('updateSettings', false);
    }
  };
  
  // Connect to real-time updates
  const connectRealtime = useCallback(() => {
    if (!selectedWebsite?.id || isRealtimeConnected) return;
    
    try {
      // This would typically use WebSocket or Server-Sent Events
      // For now, simulate with polling
      const pollInterval = setInterval(async () => {
        try {
          const data = await api.get(`/analytics/${selectedWebsite.id}/realtime`);
          setRealtimeData(data);
        } catch (error) {
          console.error('Realtime poll error:', error);
        }
      }, 30000); // Poll every 30 seconds
      
      setIsRealtimeConnected(true);
      
      // Return cleanup function
      return () => {
        clearInterval(pollInterval);
        setIsRealtimeConnected(false);
      };
    } catch (error) {
      console.error('Connect realtime error:', error);
    }
  }, [selectedWebsite?.id, isRealtimeConnected]);
  
  // Refresh all data
  const refreshAllData = async () => {
    if (!selectedWebsite?.id) return;
    
    showToast('Refreshing all data...', 'info');
    
    await Promise.all([
      fetchDashboardData(true),
      fetchKeywords(),
      fetchAnalytics(),
      fetchTechnicalIssues(),
      fetchCompetitors()
    ]);
    
    showToast('Data refreshed successfully!', 'success');
  };
  
  // Load initial data when website changes
  useEffect(() => {
    if (selectedWebsite?.id && isAuthenticated) {
      fetchDashboardData();
      fetchKeywords();
      fetchAnalytics();
      fetchTechnicalIssues();
      fetchSettings();
    }
  }, [selectedWebsite?.id, isAuthenticated]);
  
  // Context value
  const value = {
    // State
    dashboardData,
    keywords,
    analytics,
    technicalIssues,
    competitors,
    settings,
    dataLoading,
    dataErrors,
    realtimeData,
    isRealtimeConnected,
    
    // Actions
    fetchDashboardData,
    fetchKeywords,
    addKeyword,
    updateKeyword,
    deleteKeyword,
    fetchAnalytics,
    fetchTechnicalIssues,
    runTechnicalAnalysis,
    fetchCompetitors,
    fetchSettings,
    updateSettings,
    connectRealtime,
    refreshAllData
  };
  
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// Custom hook to use data context
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}

export default DataContext;