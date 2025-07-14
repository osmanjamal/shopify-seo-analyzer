import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import api from '../services/api';
import { useApi } from './useApi';

// Custom hook for keyword tracking and analysis
export function useKeywordTracking(websiteId) {
  const { showToast, setLoading } = useApp();
  const { keywords: contextKeywords, fetchKeywords, addKeyword, updateKeyword, deleteKeyword } = useData();
  
  // Local state for advanced features
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [keywordGroups, setKeywordGroups] = useState([]);
  const [trackingHistory, setTrackingHistory] = useState({});
  const [isTracking, setIsTracking] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  // Fetch keyword groups
  const { 
    data: groupsData, 
    loading: loadingGroups,
    refetch: refetchGroups 
  } = useApi(`/keywords/groups/${websiteId}`, {
    autoFetch: !!websiteId,
    onSuccess: (data) => {
      setKeywordGroups(data.groups || []);
    }
  });
  
  // Get keywords with filtering and sorting
  const getKeywords = useCallback((options = {}) => {
    const {
      sortBy = 'position',
      sortOrder = 'asc',
      filterBy = {},
      groupId = null,
      searchTerm = ''
    } = options;
    
    let filtered = [...contextKeywords];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(k => 
        k.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.url?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply group filter
    if (groupId) {
      filtered = filtered.filter(k => k.group_id === groupId);
    }
    
    // Apply custom filters
    Object.entries(filterBy).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        filtered = filtered.filter(k => k[key] === value);
      }
    });
    
    // Sort keywords
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity;
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return filtered;
  }, [contextKeywords]);
  
  // Track keyword positions
  const trackKeywordPositions = useCallback(async (keywordIds = null) => {
    setIsTracking(true);
    
    try {
      const idsToTrack = keywordIds || selectedKeywords.map(k => k.id);
      
      if (idsToTrack.length === 0) {
        showToast('Please select keywords to track', 'warning');
        return { success: false };
      }
      
      showToast(`Tracking ${idsToTrack.length} keywords...`, 'info');
      
      const response = await api.post('/keywords/track', {
        websiteId,
        keywordIds: idsToTrack
      });
      
      if (response.jobId) {
        // Poll for results
        const pollInterval = setInterval(async () => {
          try {
            const status = await api.get(`/keywords/track-status/${response.jobId}`);
            
            if (status.completed) {
              clearInterval(pollInterval);
              showToast('Keyword tracking completed!', 'success');
              
              // Refresh keywords data
              await fetchKeywords({ websiteId });
              
              // Fetch updated history
              await fetchTrackingHistory(idsToTrack);
            } else if (status.failed) {
              clearInterval(pollInterval);
              showToast('Keyword tracking failed', 'error');
            } else if (status.progress) {
              // Update progress if needed
              console.log(`Tracking progress: ${status.progress}%`);
            }
          } catch (error) {
            clearInterval(pollInterval);
            console.error('Poll tracking status error:', error);
          }
        }, 3000);
        
        return { success: true, jobId: response.jobId };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to track keywords';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setIsTracking(false);
    }
  }, [websiteId, selectedKeywords, showToast, fetchKeywords]);
  
  // Fetch tracking history for keywords
  const fetchTrackingHistory = useCallback(async (keywordIds, days = 30) => {
    try {
      const response = await api.post('/keywords/history', {
        keywordIds,
        days
      });
      
      const historyMap = {};
      response.history.forEach(item => {
        if (!historyMap[item.keyword_id]) {
          historyMap[item.keyword_id] = [];
        }
        historyMap[item.keyword_id].push({
          date: item.tracked_at,
          position: item.position,
          change: item.position_change
        });
      });
      
      setTrackingHistory(historyMap);
      return historyMap;
    } catch (error) {
      console.error('Fetch tracking history error:', error);
      return {};
    }
  }, []);
  
  // Get keyword suggestions
  const getKeywordSuggestions = useCallback(async (seed, options = {}) => {
    setLoading('suggestions', true);
    
    try {
      const response = await api.post('/keywords/suggestions', {
        seed,
        websiteId,
        ...options
      });
      
      setSuggestions(response.suggestions || []);
      return response.suggestions;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get suggestions';
      showToast(message, 'error');
      return [];
    } finally {
      setLoading('suggestions', false);
    }
  }, [websiteId, showToast, setLoading]);
  
  // Research competitors' keywords
  const researchCompetitorKeywords = useCallback(async (competitorDomain) => {
    setLoading('competitorKeywords', true);
    
    try {
      const response = await api.post('/keywords/competitor-research', {
        websiteId,
        competitorDomain
      });
      
      return response.keywords || [];
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to research competitor keywords';
      showToast(message, 'error');
      return [];
    } finally {
      setLoading('competitorKeywords', false);
    }
  }, [websiteId, showToast, setLoading]);
  
  // Create keyword group
  const createKeywordGroup = useCallback(async (groupData) => {
    try {
      const response = await api.post('/keywords/groups', {
        ...groupData,
        websiteId
      });
      
      setKeywordGroups(prev => [...prev, response.group]);
      showToast('Keyword group created!', 'success');
      
      return { success: true, group: response.group };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create group';
      showToast(message, 'error');
      return { success: false, error: message };
    }
  }, [websiteId, showToast]);
  
  // Bulk operations
  const bulkAddKeywords = useCallback(async (keywordsList) => {
    setLoading('bulkAdd', true);
    
    try {
      const response = await api.post('/keywords/bulk-add', {
        websiteId,
        keywords: keywordsList
      });
      
      showToast(`Added ${response.added} keywords successfully!`, 'success');
      
      // Refresh keywords
      await fetchKeywords({ websiteId });
      
      return { success: true, added: response.added };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add keywords';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('bulkAdd', false);
    }
  }, [websiteId, showToast, setLoading, fetchKeywords]);
  
  const bulkDeleteKeywords = useCallback(async (keywordIds) => {
    if (!window.confirm(`Are you sure you want to delete ${keywordIds.length} keywords?`)) {
      return { success: false };
    }
    
    setLoading('bulkDelete', true);
    
    try {
      await api.post('/keywords/bulk-delete', {
        keywordIds
      });
      
      showToast(`Deleted ${keywordIds.length} keywords`, 'success');
      
      // Clear selection
      setSelectedKeywords([]);
      
      // Refresh keywords
      await fetchKeywords({ websiteId });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete keywords';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('bulkDelete', false);
    }
  }, [websiteId, showToast, setLoading, fetchKeywords]);
  
  // Export keywords
  const exportKeywords = useCallback(async (format = 'csv', keywordIds = null) => {
    try {
      const response = await api.post('/keywords/export', {
        websiteId,
        format,
        keywordIds: keywordIds || selectedKeywords.map(k => k.id)
      }, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `keywords-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast('Keywords exported successfully!', 'success');
      return { success: true };
    } catch (error) {
      showToast('Failed to export keywords', 'error');
      return { success: false };
    }
  }, [websiteId, selectedKeywords, showToast]);
  
  // Import keywords
  const importKeywords = useCallback(async (file) => {
    setLoading('import', true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('websiteId', websiteId);
      
      const response = await api.upload('/keywords/import', formData, (progress) => {
        console.log(`Import progress: ${progress}%`);
      });
      
      showToast(`Imported ${response.imported} keywords successfully!`, 'success');
      
      // Refresh keywords
      await fetchKeywords({ websiteId });
      
      return { success: true, imported: response.imported };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to import keywords';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('import', false);
    }
  }, [websiteId, showToast, setLoading, fetchKeywords]);
  
  // Calculate keyword metrics
  const keywordMetrics = useMemo(() => {
    const keywords = getKeywords();
    
    const metrics = {
      total: keywords.length,
      tracked: keywords.filter(k => k.position !== null).length,
      topTen: keywords.filter(k => k.position && k.position <= 10).length,
      improved: keywords.filter(k => k.position_change && k.position_change < 0).length,
      declined: keywords.filter(k => k.position_change && k.position_change > 0).length,
      notRanking: keywords.filter(k => k.position === null || k.position > 100).length,
      avgPosition: 0,
      totalVolume: 0
    };
    
    // Calculate averages
    const rankedKeywords = keywords.filter(k => k.position && k.position <= 100);
    if (rankedKeywords.length > 0) {
      metrics.avgPosition = Math.round(
        rankedKeywords.reduce((sum, k) => sum + k.position, 0) / rankedKeywords.length
      );
    }
    
    metrics.totalVolume = keywords.reduce((sum, k) => sum + (k.search_volume || 0), 0);
    
    return metrics;
  }, [getKeywords]);
  
  // Selection management
  const selectKeyword = useCallback((keyword) => {
    setSelectedKeywords(prev => {
      const exists = prev.find(k => k.id === keyword.id);
      if (exists) {
        return prev.filter(k => k.id !== keyword.id);
      } else {
        return [...prev, keyword];
      }
    });
  }, []);
  
  const selectAllKeywords = useCallback(() => {
    const keywords = getKeywords();
    setSelectedKeywords(keywords);
  }, [getKeywords]);
  
  const clearSelection = useCallback(() => {
    setSelectedKeywords([]);
  }, []);
  
  // Auto-track keywords daily
  useEffect(() => {
    if (!websiteId) return;
    
    // Check if auto-tracking is enabled
    const autoTrack = localStorage.getItem('autoTrackKeywords') === 'true';
    if (!autoTrack) return;
    
    // Track once on mount
    const autoTrackKeywords = async () => {
      const keywords = getKeywords();
      if (keywords.length > 0) {
        await trackKeywordPositions(keywords.map(k => k.id));
      }
    };
    
    autoTrackKeywords();
  }, [websiteId]); // Only run on mount or websiteId change
  
  return {
    // Data
    keywords: getKeywords(),
    keywordGroups,
    selectedKeywords,
    trackingHistory,
    suggestions,
    keywordMetrics,
    
    // Loading states
    isTracking,
    loadingGroups,
    
    // Actions
    getKeywords,
    addKeyword,
    updateKeyword,
    deleteKeyword,
    trackKeywordPositions,
    fetchTrackingHistory,
    getKeywordSuggestions,
    researchCompetitorKeywords,
    createKeywordGroup,
    bulkAddKeywords,
    bulkDeleteKeywords,
    exportKeywords,
    importKeywords,
    
    // Selection actions
    selectKeyword,
    selectAllKeywords,
    clearSelection,
    
    // Refresh actions
    refetchGroups
  };
}

export default useKeywordTracking;