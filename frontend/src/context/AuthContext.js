import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import googleApi from '../services/googleApi';
import { useApp } from './AppContext';

// Create context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { showToast, setLoading, resetState } = useApp();
  
  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Google OAuth state
  const [googleUser, setGoogleUser] = useState(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  
  // Initialize auth state from storage
  useEffect(() => {
    initializeAuth();
  }, []);
  
  // Initialize authentication
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (token) {
        api.setAuthToken(token);
        const userData = await api.get('/auth/me');
        
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          
          // Check Google connection
          if (userData.google_connected) {
            setIsGoogleConnected(true);
            await checkGoogleTokens();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      logout(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Login with email/password
  const login = async (email, password) => {
    try {
      setLoading('auth', true);
      setAuthError(null);
      
      const response = await api.post('/auth/login', { email, password });
      
      if (response.tokens) {
        // Store tokens
        localStorage.setItem('authToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
        api.setAuthToken(response.tokens.accessToken);
        
        // Set user data
        setUser(response.user);
        setIsAuthenticated(true);
        
        // Check Google connection
        if (response.user.google_connected) {
          setIsGoogleConnected(true);
        }
        
        showToast('Successfully logged in!', 'success');
        navigate('/dashboard');
        
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      setAuthError(message);
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('auth', false);
    }
  };
  
  // Register new user
  const register = async (userData) => {
    try {
      setLoading('auth', true);
      setAuthError(null);
      
      const response = await api.post('/auth/register', userData);
      
      if (response.tokens) {
        // Auto-login after registration
        localStorage.setItem('authToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
        api.setAuthToken(response.tokens.accessToken);
        
        setUser(response.user);
        setIsAuthenticated(true);
        
        showToast('Account created successfully!', 'success');
        navigate('/dashboard');
        
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      setAuthError(message);
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('auth', false);
    }
  };
  
  // Google OAuth login
  const loginWithGoogle = async (code) => {
    try {
      setLoading('auth', true);
      setAuthError(null);
      
      const response = await api.post('/auth/google', { code });
      
      if (response.tokens) {
        // Store tokens
        localStorage.setItem('authToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
        api.setAuthToken(response.tokens.accessToken);
        
        // Store Google tokens if provided
        if (response.googleTokens) {
          await googleApi.setTokens(response.googleTokens);
          setIsGoogleConnected(true);
        }
        
        setUser(response.user);
        setIsAuthenticated(true);
        
        showToast('Successfully logged in with Google!', 'success');
        navigate('/dashboard');
        
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Google login failed';
      setAuthError(message);
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('auth', false);
    }
  };
  
  // Connect Google account (for existing users)
  const connectGoogleAccount = async () => {
    try {
      setLoading('googleConnect', true);
      
      const authUrl = await api.get('/auth/google/connect');
      
      // Open Google OAuth popup
      const popup = window.open(
        authUrl,
        'googleAuth',
        'width=500,height=600,menubar=no,toolbar=no'
      );
      
      // Listen for callback
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(checkInterval);
              reject(new Error('Authentication cancelled'));
            }
          } catch (error) {
            // Ignore cross-origin errors
          }
        }, 1000);
        
        // Listen for message from popup
        window.addEventListener('message', async function handler(event) {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'google-auth-success') {
            clearInterval(checkInterval);
            window.removeEventListener('message', handler);
            popup.close();
            
            // Update user data
            await updateUserData();
            setIsGoogleConnected(true);
            showToast('Google account connected successfully!', 'success');
            resolve({ success: true });
          }
        });
      });
    } catch (error) {
      showToast('Failed to connect Google account', 'error');
      return { success: false, error: error.message };
    } finally {
      setLoading('googleConnect', false);
    }
  };
  
  // Disconnect Google account
  const disconnectGoogleAccount = async () => {
    try {
      setLoading('googleConnect', true);
      
      await api.post('/auth/google/disconnect');
      
      setIsGoogleConnected(false);
      setGoogleUser(null);
      await googleApi.clearTokens();
      
      showToast('Google account disconnected', 'info');
      return { success: true };
    } catch (error) {
      showToast('Failed to disconnect Google account', 'error');
      return { success: false, error: error.message };
    } finally {
      setLoading('googleConnect', false);
    }
  };
  
  // Check Google token validity
  const checkGoogleTokens = async () => {
    try {
      const isValid = await googleApi.checkTokenValidity();
      
      if (!isValid) {
        // Try to refresh
        const refreshed = await googleApi.refreshTokens();
        if (!refreshed) {
          setIsGoogleConnected(false);
          showToast('Google connection expired. Please reconnect.', 'warning');
        }
      }
    } catch (error) {
      console.error('Google token check error:', error);
    }
  };
  
  // Update user data
  const updateUserData = async () => {
    try {
      const userData = await api.get('/auth/me');
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Update user data error:', error);
      return null;
    }
  };
  
  // Update profile
  const updateProfile = async (profileData) => {
    try {
      setLoading('profile', true);
      
      const response = await api.put('/auth/profile', profileData);
      
      setUser(response.user);
      showToast('Profile updated successfully!', 'success');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('profile', false);
    }
  };
  
  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading('password', true);
      
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      showToast('Password changed successfully!', 'success');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading('password', false);
    }
  };
  
  // Logout
  const logout = useCallback(async (showMessage = true) => {
    try {
      // Call logout API
      await api.post('/auth/logout').catch(() => {});
      
      // Clear local data
      localStorage.removeItem('authToken');
      localStorage.removeItem('selectedWebsiteId');
      api.clearAuthToken();
      await googleApi.clearTokens();
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      setIsGoogleConnected(false);
      setGoogleUser(null);
      resetState();
      
      if (showMessage) {
        showToast('Logged out successfully', 'info');
      }
      
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [navigate, resetState, showToast]);
  
  // Session check
  useEffect(() => {
    const checkSession = async () => {
      if (isAuthenticated && !isLoading) {
        try {
          await api.get('/auth/check-session');
        } catch (error) {
          if (error.response?.status === 401) {
            logout(false);
          }
        }
      }
    };
    
    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, isLoading, logout]);
  
  // Context value
  const value = {
    // State
    user,
    isAuthenticated,
    isLoading,
    authError,
    googleUser,
    isGoogleConnected,
    
    // Actions
    login,
    register,
    loginWithGoogle,
    logout,
    connectGoogleAccount,
    disconnectGoogleAccount,
    updateProfile,
    changePassword,
    updateUserData,
    checkGoogleTokens
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;