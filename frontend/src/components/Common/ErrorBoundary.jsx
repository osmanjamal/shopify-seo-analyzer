import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import styles from './Common.module.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send error to analytics/monitoring service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: true
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount, showDetails } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      // If error persists after multiple attempts, show persistent error
      if (errorCount > 3) {
        return (
          <div className={styles.errorBoundaryContainer}>
            <div className={styles.errorContent}>
              <div className={styles.errorIconLarge}>
                <AlertTriangle />
              </div>
              <h1 className={styles.errorTitle}>Persistent Error Detected</h1>
              <p className={styles.errorMessage}>
                We're experiencing technical difficulties. Please try refreshing the page or contact support if the problem persists.
              </p>
              <div className={styles.errorActions}>
                <button 
                  className={styles.primaryButton}
                  onClick={this.handleReload}
                >
                  <RefreshCw className={styles.buttonIcon} />
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className={styles.errorBoundaryContainer}>
          <div className={styles.errorCard}>
            <div className={styles.errorHeader}>
              <div className={styles.errorIcon}>
                <AlertTriangle />
              </div>
              <div>
                <h2 className={styles.errorTitle}>Oops! Something went wrong</h2>
                <p className={styles.errorSubtitle}>
                  We encountered an unexpected error. Don't worry, we're on it!
                </p>
              </div>
            </div>

            {error && (
              <div className={styles.errorMessageBox}>
                <code className={styles.errorCode}>{error.toString()}</code>
              </div>
            )}

            <div className={styles.errorActions}>
              <button 
                className={styles.primaryButton}
                onClick={this.handleReset}
              >
                <RefreshCw className={styles.buttonIcon} />
                Try Again
              </button>
              <button 
                className={styles.secondaryButton}
                onClick={this.handleGoHome}
              >
                <Home className={styles.buttonIcon} />
                Go to Dashboard
              </button>
              {isDevelopment && (
                <button 
                  className={styles.ghostButton}
                  onClick={this.toggleDetails}
                >
                  <Bug className={styles.buttonIcon} />
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
              )}
            </div>

            {isDevelopment && showDetails && errorInfo && (
              <div className={styles.errorDetails}>
                <h3 className={styles.errorDetailsTitle}>Error Stack Trace:</h3>
                <pre className={styles.errorStack}>
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className={styles.errorTips}>
              <h3>What can you do?</h3>
              <ul>
                <li>Try refreshing the page</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error boundary wrapper with fallback UI customization
export const withErrorBoundary = (Component, fallbackUI) => {
  return class extends React.Component {
    render() {
      return (
        <ErrorBoundary fallbackUI={fallbackUI}>
          <Component {...this.props} />
        </ErrorBoundary>
      );
    }
  };
};

// Hook for error handling in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = () => setError(null);
  const throwError = (error) => setError(error);

  return { throwError, resetError };
};

// Network Error Component
export const NetworkError = ({ onRetry }) => {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <div className={styles.errorIcon}>
          <AlertTriangle />
        </div>
        <h3 className={styles.errorTitle}>Connection Problem</h3>
        <p className={styles.errorMessage}>
          Unable to connect to our servers. Please check your internet connection and try again.
        </p>
        <button 
          className={styles.primaryButton}
          onClick={onRetry}
        >
          <RefreshCw className={styles.buttonIcon} />
          Retry
        </button>
      </div>
    </div>
  );
};

// Not Found Error Component
export const NotFoundError = () => {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <div className={styles.error404}>404</div>
        <h2 className={styles.errorTitle}>Page Not Found</h2>
        <p className={styles.errorMessage}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button 
          className={styles.primaryButton}
          onClick={() => window.location.href = '/'}
        >
          <Home className={styles.buttonIcon} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

// Permission Error Component
export const PermissionError = () => {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <div className={styles.errorIcon}>
          <AlertTriangle />
        </div>
        <h3 className={styles.errorTitle}>Access Denied</h3>
        <p className={styles.errorMessage}>
          You don't have permission to access this resource. Please contact your administrator.
        </p>
        <button 
          className={styles.primaryButton}
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default ErrorBoundary;