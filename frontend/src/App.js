import React, { Suspense, lazy, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import AuthContext from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Loading from './components/Common/Loading';
import './styles/globals.css';
import './styles/variables.css';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const Keywords = lazy(() => import('./components/Keywords/KeywordTable'));
const Technical = lazy(() => import('./components/Technical/TechnicalIssues'));
const Analytics = lazy(() => import('./components/Analytics/TrafficChart'));
const Settings = lazy(() => import('./components/Settings/ApiSettings'));

// Layout components
const MainLayout = lazy(() => import('./components/Common/MainLayout'));
const AuthLayout = lazy(() => import('./components/Auth/AuthLayout'));
const Login = lazy(() => import('./components/Auth/Login'));
const LoginCallback = lazy(() => import('./components/Auth/LoginCallback'));

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <Suspense fallback={<Loading fullScreen />}>
                <Routes>
                  {/* Auth Routes */}
                  <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
                  <Route path="/login/callback" element={<LoginCallback />} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="keywords" element={<Keywords />} />
                    <Route path="technical" element={<Technical />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* 404 Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </DataProvider>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;