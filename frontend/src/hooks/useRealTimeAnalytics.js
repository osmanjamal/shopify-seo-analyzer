import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import googleApi from '../services/googleApi';

// Custom hook for real-time analytics data
export function useRealTimeAnalytics(websiteId, options = {}) {
  const { showToast } = useApp();
  const { isAuthenticated } = useAuth();
  
  // Configuration
  const {
    pollInterval = 30000, // 30 seconds
    autoStart = true,
    metrics = ['activeUsers', 'pageviews', 'events', 'conversions'],
    dimensions = ['pagePath', 'deviceCategory', 'country', 'source']
  } = options;
  
  // State
  const [data, setData] = useState({
    activeUsers: 0,
    pageviews: [],
    events: [],
    conversions: [],
    topPages: [],
    devices: {},
    countries: [],
    sources: [],
    lastUpdated: null
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Refs
  const intervalRef = useRef(null);
  const websocketRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    if (!websiteId || !isAuthenticated || isPaused) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get real-time data from Google Analytics
      const response = await api.get(`/analytics/${websiteId}/realtime`, {
        params: { metrics, dimensions }
      });
      
      if (response.data) {
        setData({
          activeUsers: response.data.activeUsers || 0,
          pageviews: response.data.pageviews || [],
          events: response.data.events || [],
          conversions: response.data.conversions || [],
          topPages: response.data.topPages || [],
          devices: response.data.devices || {},
          countries: response.data.countries || [],
          sources: response.data.sources || [],
          lastUpdated: new Date()
        });
        
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      console.error('Fetch real-time data error:', err);
      setError(err.response?.data?.message || 'Failed to fetch real-time data');
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => fetchRealTimeData(), 5000 * retryCountRef.current);
      }
    } finally {
      setIsLoading(false);
    }
  }, [websiteId, isAuthenticated, isPaused, metrics, dimensions]);
  
  // WebSocket connection for true real-time updates
  const connectWebSocket = useCallback(() => {
    if (!websiteId || websocketRef.current) return;
    
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
      const ws = new WebSocket(`${wsUrl}/analytics/realtime/${websiteId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected for real-time analytics');
        setIsConnected(true);
        
        // Send authentication
        ws.send(JSON.stringify({
          type: 'auth',
          token: localStorage.getItem('authToken')
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'update':
              setData(prevData => ({
                ...prevData,
                ...message.data,
                lastUpdated: new Date()
              }));
              break;
              
            case 'activeUsers':
              setData(prevData => ({
                ...prevData,
                activeUsers: message.count,
                lastUpdated: new Date()
              }));
              break;
              
            case 'pageview':
              setData(prevData => ({
                ...prevData,
                pageviews: [message.data, ...prevData.pageviews].slice(0, 100),
                lastUpdated: new Date()
              }));
              break;
              
            case 'event':
              setData(prevData => ({
                ...prevData,
                events: [message.data, ...prevData.events].slice(0, 50),
                lastUpdated: new Date()
              }));
              break;
              
            case 'error':
              console.error('WebSocket error:', message.error);
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        websocketRef.current = null;
        
        // Attempt to reconnect after delay
        if (!isPaused) {
          setTimeout(() => connectWebSocket(), 5000);
        }
      };
      
      websocketRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    }
  }, [websiteId, isPaused]);
  
  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
      setIsConnected(false);
    }
  }, []);
  
  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    
    // Initial fetch
    fetchRealTimeData();
    
    // Set up interval
    intervalRef.current = setInterval(fetchRealTimeData, pollInterval);
  }, [fetchRealTimeData, pollInterval]);
  
  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Pause/Resume
  const pause = useCallback(() => {
    setIsPaused(true);
    stopPolling();
    disconnectWebSocket();
  }, [stopPolling, disconnectWebSocket]);
  
  const resume = useCallback(() => {
    setIsPaused(false);
    
    if (process.env.REACT_APP_ENABLE_REALTIME === 'true') {
      connectWebSocket();
    } else {
      startPolling();
    }
  }, [connectWebSocket, startPolling]);
  
  // Get specific metrics
  const getActivePages = useCallback(() => {
    return data.topPages.filter(page => page.activeUsers > 0);
  }, [data.topPages]);
  
  const getTrafficSources = useCallback(() => {
    const sources = {};
    data.sources.forEach(source => {
      const category = source.medium || 'direct';
      sources[category] = (sources[category] || 0) + source.users;
    });
    return sources;
  }, [data.sources]);
  
  const getDeviceBreakdown = useCallback(() => {
    const total = Object.values(data.devices).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(data.devices).map(([device, count]) => ({
      device,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }, [data.devices]);
  
  const getGeographicData = useCallback(() => {
    return data.countries
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
  }, [data.countries]);
  
  // Calculate trends
  const calculateTrends = useCallback(() => {
    // This would compare with historical data
    // For now, return mock trends
    return {
      activeUsers: {
        current: data.activeUsers,
        change: Math.round(Math.random() * 20 - 10), // -10 to +10
        trend: Math.random() > 0.5 ? 'up' : 'down'
      },
      pageviews: {
        current: data.pageviews.length,
        change: Math.round(Math.random() * 30 - 15),
        trend: Math.random() > 0.5 ? 'up' : 'down'
      },
      avgSessionDuration: {
        current: Math.round(Math.random() * 300 + 60), // 60-360 seconds
        change: Math.round(Math.random() * 40 - 20),
        trend: Math.random() > 0.5 ? 'up' : 'down'
      }
    };
  }, [data]);
  
  // Export real-time data
  const exportData = useCallback((format = 'json') => {
    const exportData = {
      ...data,
      exported: new Date().toISOString(),
      websiteId
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], 
        { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `realtime-analytics-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `realtime-analytics-${new Date().toISOString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    showToast('Real-time data exported', 'success');
  }, [data, websiteId, showToast]);
  
  // Helper function to convert data to CSV
  const convertToCSV = (data) => {
    // Simple CSV conversion for active users and top pages
    let csv = 'Metric,Value\n';
    csv += `Active Users,${data.activeUsers}\n`;
    csv += `Last Updated,"${data.lastUpdated}"\n\n`;
    
    csv += 'Top Pages\n';
    csv += 'Page,Active Users,Pageviews\n';
    data.topPages.forEach(page => {
      csv += `"${page.path}",${page.activeUsers},${page.pageviews}\n`;
    });
    
    return csv;
  };
  
  // Initialize connection
  useEffect(() => {
    if (!websiteId || !isAuthenticated || !autoStart) return;
    
    // Use WebSocket if real-time is enabled, otherwise poll
    if (process.env.REACT_APP_ENABLE_REALTIME === 'true') {
      connectWebSocket();
    } else {
      startPolling();
    }
    
    // Cleanup
    return () => {
      stopPolling();
      disconnectWebSocket();
    };
  }, [websiteId, isAuthenticated, autoStart, connectWebSocket, startPolling, 
      stopPolling, disconnectWebSocket]);
  
  // Monitor connection health
  useEffect(() => {
    if (!isConnected && !isPaused && websiteId && isAuthenticated) {
      const reconnectTimer = setTimeout(() => {
        if (process.env.REACT_APP_ENABLE_REALTIME === 'true') {
          connectWebSocket();
        }
      }, 10000); // Try to reconnect after 10 seconds
      
      return () => clearTimeout(reconnectTimer);
    }
  }, [isConnected, isPaused, websiteId, isAuthenticated, connectWebSocket]);
  
  return {
    // Data
    data,
    isConnected,
    isLoading,
    error,
    isPaused,
    
    // Computed data
    activePages: getActivePages(),
    trafficSources: getTrafficSources(),
    deviceBreakdown: getDeviceBreakdown(),
    geographicData: getGeographicData(),
    trends: calculateTrends(),
    
    // Actions
    refresh: fetchRealTimeData,
    pause,
    resume,
    exportData,
    
    // Connection management
    connect: connectWebSocket,
    disconnect: disconnectWebSocket
  };
}

export default useRealTimeAnalytics;