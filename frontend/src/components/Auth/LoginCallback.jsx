import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import Loading from '../Common/Loading';

function LoginCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setIsAuthenticated } = useAuth();
  const { showToast } = useApp();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const error = searchParams.get('error');

      if (error) {
        showToast('Google authentication failed', 'error');
        navigate('/login');
        return;
      }

      if (token && refreshToken) {
        try {
          // Store tokens
          localStorage.setItem('authToken', token);
          localStorage.setItem('refreshToken', refreshToken);
          api.setAuthToken(token);
          
          // Get user data
          const userData = await api.get('/auth/me');
          setUser(userData);
          setIsAuthenticated(true);
          
          // Redirect to dashboard
          showToast('Successfully logged in with Google!', 'success');
          navigate('/dashboard');
        } catch (error) {
          showToast('Authentication failed', 'error');
          navigate('/login');
        }
      } else {
        showToast('Missing authentication tokens', 'error');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, showToast]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Loading />
    </div>
  );
}

export default LoginCallback;