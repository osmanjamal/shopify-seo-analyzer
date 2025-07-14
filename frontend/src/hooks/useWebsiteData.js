import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import api from '../services/api';
import { useApi } from './useApi';

// Custom hook for managing website data and operations
export function useWebsiteData() {
  const { selectedWebsite, setSelectedWebsite, setWebsites, showToast, setLoading } = useApp();
  const { user, isAuthenticated } = useAuth();
  const { fetchDashboardData, refreshAllData } = useData();
  
  const [websites, setLocalWebsites] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  
  // Fetch websites list
  const { 
    data: websitesData, 
    loading: loadingWebsites, 
    error: websitesError,
    refetch: refetchWebsites 
  } = useApi('/websites', {
    autoFetch: isAuthenticated,
    onSuccess: (data) => {
      const websitesList = data.websites || data || [];
      setLocalWebsites(websitesList);
      setWebsites(websitesList);
      
      // Auto-select website if needed
      if (websitesList.length > 0 && !selectedWebsite) {
        const savedWebsiteId = localStorage.getItem('selectedWebsiteId');
        const websiteToSelect = savedWebsiteId 
          ? websitesList.find(w => w.id === parseInt(savedWebsiteId))
          : websitesList[0];
          
        if (websiteToSelect) {
          setSelectedWebsite(websiteToSelect);
        }
      }
    }
  });
  
  // Create new website
  const createWebsite = useCallback(async (websiteData) => {
    setIsCreating(true);
    
    try {
      const response = await api.post('/websites', websiteData);
      
      if (response.website) {
        // Update local state
        const updatedWebsites = [...websites, response.website];
        setLocalWebsites(updatedWebsites);
        setWebsites(updatedWebsites);
        
        // Auto-select the new website
        setSelectedWebsite(response.website);
        
        showToast('Website added successfully!', 'success');
        
        // Start verification if URL provided
        if (websiteData.url) {
          await verifyWebsite(response.website.id);
        }
        
        return { success: true, website: response.website };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create website';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setIsCreating(false);
    }
  }, [websites, setWebsites, setSelectedWebsite, showToast]);
  
  // Update website
  const updateWebsite = useCallback(async (websiteId, updates) => {
    setLoading('updateWebsite', true);
    
    try {
      const response = await api.put(`/websites/${websiteId}`, updates);
      
      if (response.website) {
        // Update local state
        const updatedWebsites = websites.map(w => 
          w.id === websiteId ? response.website : w
        );
        setLocalWebsites(updatedWebsites);
        setWebsites(updatedWebsites);
        
        // Update selected website if it's the current one
        if (selectedWebsite?.id === websiteId) {
          setSelectedWebsite(response.website);
        }
        
        showToast('Website updated successfully!', 'success');
        return { success: true, website: response.website };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update website';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('updateWebsite', false);
    }
  }, [websites, selectedWebsite, setWebsites, setSelectedWebsite, showToast, setLoading]);
  
  // Delete website
  const deleteWebsite = useCallback(async (websiteId) => {
    if (!window.confirm('Are you sure you want to delete this website? This action cannot be undone.')) {
      return { success: false, cancelled: true };
    }
    
    setLoading('deleteWebsite', true);
    
    try {
      await api.delete(`/websites/${websiteId}`);
      
      // Update local state
      const updatedWebsites = websites.filter(w => w.id !== websiteId);
      setLocalWebsites(updatedWebsites);
      setWebsites(updatedWebsites);
      
      // Select another website if the deleted one was selected
      if (selectedWebsite?.id === websiteId) {
        setSelectedWebsite(updatedWebsites[0] || null);
      }
      
      showToast('Website deleted successfully!', 'success');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete website';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('deleteWebsite', false);
    }
  }, [websites, selectedWebsite, setWebsites, setSelectedWebsite, showToast, setLoading]);
  
  // Verify website ownership
  const verifyWebsite = useCallback(async (websiteId) => {
    setIsVerifying(true);
    setVerificationStatus(null);
    
    try {
      // Get verification methods
      const methods = await api.get(`/websites/${websiteId}/verify-methods`);
      
      // For now, use meta tag verification
      const response = await api.post(`/websites/${websiteId}/verify`, {
        method: 'meta_tag'
      });
      
      setVerificationStatus(response);
      
      if (response.verified) {
        // Update website status
        await updateWebsite(websiteId, { verified: true });
        showToast('Website verified successfully!', 'success');
      } else {
        showToast('Verification pending. Please add the verification tag to your website.', 'info');
      }
      
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      showToast(message, 'error');
      setVerificationStatus({ verified: false, error: message });
      return { verified: false, error: message };
    } finally {
      setIsVerifying(false);
    }
  }, [updateWebsite, showToast]);
  
  // Check verification status
  const checkVerificationStatus = useCallback(async (websiteId) => {
    try {
      const response = await api.get(`/websites/${websiteId}/verify-status`);
      
      if (response.verified && !websites.find(w => w.id === websiteId)?.verified) {
        await updateWebsite(websiteId, { verified: true });
      }
      
      return response;
    } catch (error) {
      console.error('Check verification error:', error);
      return { verified: false };
    }
  }, [websites, updateWebsite]);
  
  // Connect Google Analytics/Search Console
  const connectGoogleServices = useCallback(async (websiteId, services) => {
    setLoading('connectGoogle', true);
    
    try {
      const response = await api.post(`/websites/${websiteId}/connect-google`, services);
      
      if (response.success) {
        await updateWebsite(websiteId, {
          google_analytics_id: services.analyticsId,
          google_site_id: services.searchConsoleId
        });
        
        showToast('Google services connected successfully!', 'success');
        
        // Refresh data to get new analytics
        if (selectedWebsite?.id === websiteId) {
          await refreshAllData();
        }
      }
      
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to connect Google services';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('connectGoogle', false);
    }
  }, [selectedWebsite, updateWebsite, refreshAllData, showToast, setLoading]);
  
  // Connect Shopify store
  const connectShopifyStore = useCallback(async (websiteId, shopifyData) => {
    setLoading('connectShopify', true);
    
    try {
      const response = await api.post(`/websites/${websiteId}/connect-shopify`, shopifyData);
      
      if (response.success) {
        await updateWebsite(websiteId, {
          shopify_domain: shopifyData.domain,
          shopify_connected: true
        });
        
        showToast('Shopify store connected successfully!', 'success');
        
        // Refresh data to get Shopify data
        if (selectedWebsite?.id === websiteId) {
          await refreshAllData();
        }
      }
      
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to connect Shopify store';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('connectShopify', false);
    }
  }, [selectedWebsite, updateWebsite, refreshAllData, showToast, setLoading]);
  
  // Get website statistics
  const getWebsiteStats = useCallback(async (websiteId) => {
    try {
      const response = await api.get(`/websites/${websiteId}/stats`);
      return response;
    } catch (error) {
      console.error('Get website stats error:', error);
      return null;
    }
  }, []);
  
  // Run website analysis
  const runWebsiteAnalysis = useCallback(async (websiteId, analysisType = 'full') => {
    setLoading('websiteAnalysis', true);
    showToast('Starting website analysis...', 'info');
    
    try {
      const response = await api.post(`/websites/${websiteId}/analyze`, {
        type: analysisType
      });
      
      if (response.jobId) {
        // Poll for results
        const pollInterval = setInterval(async () => {
          try {
            const status = await api.get(`/jobs/${response.jobId}/status`);
            
            if (status.completed) {
              clearInterval(pollInterval);
              showToast('Website analysis completed!', 'success');
              
              // Refresh data
              if (selectedWebsite?.id === websiteId) {
                await refreshAllData();
              }
            } else if (status.failed) {
              clearInterval(pollInterval);
              showToast('Website analysis failed', 'error');
            }
          } catch (error) {
            clearInterval(pollInterval);
            console.error('Poll analysis status error:', error);
          }
        }, 5000);
        
        return { success: true, jobId: response.jobId };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to start analysis';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('websiteAnalysis', false);
    }
  }, [selectedWebsite, refreshAllData, showToast, setLoading]);
  
  // Switch between websites
  const switchWebsite = useCallback((website) => {
    if (website && website.id !== selectedWebsite?.id) {
      setSelectedWebsite(website);
      showToast(`Switched to ${website.domain}`, 'info');
    }
  }, [selectedWebsite, setSelectedWebsite, showToast]);
  
  // Computed values
  const websiteCount = useMemo(() => websites.length, [websites]);
  const hasWebsites = useMemo(() => websiteCount > 0, [websiteCount]);
  const canAddMoreWebsites = useMemo(() => {
    const maxWebsites = parseInt(process.env.REACT_APP_MAX_WEBSITES || '10');
    return websiteCount < maxWebsites;
  }, [websiteCount]);
  
  const selectedWebsiteData = useMemo(() => {
    if (!selectedWebsite) return null;
    return websites.find(w => w.id === selectedWebsite.id) || selectedWebsite;
  }, [selectedWebsite, websites]);
  
  // Auto-refresh website list periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      refetchWebsites();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [isAuthenticated, refetchWebsites]);
  
  return {
    // Data
    websites,
    selectedWebsite: selectedWebsiteData,
    websiteCount,
    hasWebsites,
    canAddMoreWebsites,
    
    // Loading states
    loadingWebsites,
    isCreating,
    isVerifying,
    
    // Error states
    websitesError,
    verificationStatus,
    
    // Actions
    createWebsite,
    updateWebsite,
    deleteWebsite,
    verifyWebsite,
    checkVerificationStatus,
    connectGoogleServices,
    connectShopifyStore,
    getWebsiteStats,
    runWebsiteAnalysis,
    switchWebsite,
    refetchWebsites
  };
}

export default useWebsiteData;