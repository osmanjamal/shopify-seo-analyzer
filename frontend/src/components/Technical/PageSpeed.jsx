import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import Loading from '../Common/Loading';
import { ScoreCircle } from '../Dashboard/ScoreCircle';
import { 
  formatNumber, 
  formatFileSize,
  formatLoadTime,
  formatPercentage 
} from '../../utils/formatters';
import { SEO_THRESHOLDS } from '../../utils/constants';
import { 
  XMarkIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BoltIcon,
  DocumentIcon,
  PhotoIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import styles from './Technical.module.css';

const PageSpeed = ({ onClose }) => {
  const { showToast, selectedWebsite } = useApp();
  const [url, setUrl] = useState(selectedWebsite?.domain ? `https://${selectedWebsite.domain}` : '');
  const [device, setDevice] = useState('mobile'); // 'mobile' or 'desktop'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('performance'); // 'performance', 'opportunities', 'diagnostics'
  
  // Analyze page speed
  const analyzePageSpeed = async () => {
    if (!url) {
      showToast('Please enter a URL', 'error');
      return;
    }
    
    setIsAnalyzing(true);
    setResults(null);
    
    try {
      const response = await api.post('/technical/pagespeed', {
        url,
        strategy: device
      });
      
      if (response.data) {
        setResults(response.data);
        showToast('Page speed analysis completed!', 'success');
      }
    } catch (error) {
      showToast('Failed to analyze page speed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Get metric status
  const getMetricStatus = (value, metric) => {
    const thresholds = {
      FCP: { good: 1800, needs_improvement: 3000 }, // First Contentful Paint
      LCP: { good: 2500, needs_improvement: 4000 }, // Largest Contentful Paint
      FID: { good: 100, needs_improvement: 300 },   // First Input Delay
      CLS: { good: 0.1, needs_improvement: 0.25 },  // Cumulative Layout Shift
      SI: { good: 3400, needs_improvement: 5800 },  // Speed Index
      TTI: { good: 3800, needs_improvement: 7300 }, // Time to Interactive
      TBT: { good: 200, needs_improvement: 600 }    // Total Blocking Time
    };
    
    const threshold = thresholds[metric];
    if (!threshold) return 'neutral';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needs_improvement) return 'needs-improvement';
    return 'poor';
  };
  
  // Format metric value
  const formatMetricValue = (value, metric) => {
    if (metric === 'CLS') {
      return value.toFixed(3);
    }
    return formatLoadTime(value);
  };
  
  // Get opportunity impact
  const getOpportunityImpact = (savings) => {
    if (savings > 3000) return { level: 'high', color: '#ef4444' };
    if (savings > 1000) return { level: 'medium', color: '#f59e0b' };
    return { level: 'low', color: '#3b82f6' };
  };
  
  // Run analysis on mount if URL is provided
  useEffect(() => {
    if (url) {
      analyzePageSpeed();
    }
  }, []);
  
  return (
    <div className={styles.modal}>
      <div className={styles.modalOverlay} onClick={onClose} />
      <div className={styles.modalContent} style={{ maxWidth: '900px' }}>
        <div className={styles.modalHeader}>
          <h3>PageSpeed Insights</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <XMarkIcon className={styles.closeIcon} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* URL Input */}
          <div className={styles.pageSpeedControls}>
            <div className={styles.urlInput}>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to analyze"
                className={styles.input}
                disabled={isAnalyzing}
              />
              <button
                onClick={analyzePageSpeed}
                className={styles.analyzeButton}
                disabled={isAnalyzing || !url}
              >
                <ArrowPathIcon className={`${styles.buttonIcon} ${isAnalyzing ? styles.spinning : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            
            {/* Device Toggle */}
            <div className={styles.deviceToggle}>
              <button
                onClick={() => setDevice('mobile')}
                className={`${styles.deviceButton} ${device === 'mobile' ? styles.active : ''}`}
              >
                <DevicePhoneMobileIcon className={styles.deviceIcon} />
                Mobile
              </button>
              <button
                onClick={() => setDevice('desktop')}
                className={`${styles.deviceButton} ${device === 'desktop' ? styles.active : ''}`}
              >
                <ComputerDesktopIcon className={styles.deviceIcon} />
                Desktop
              </button>
            </div>
          </div>
          
          {/* Results */}
          {isAnalyzing ? (
            <div className={styles.loadingContainer}>
              <Loading message="Analyzing page speed..." />
              <p className={styles.loadingNote}>This may take up to 30 seconds</p>
            </div>
          ) : results ? (
            <>
              {/* Score Overview */}
              <div className={styles.scoreOverview}>
                <div className={styles.mainScore}>
                  <ScoreCircle 
                    score={results.score} 
                    size={180}
                    strokeWidth={20}
                  />
                  <h4>Performance Score</h4>
                </div>
                
                {/* Core Web Vitals */}
                <div className={styles.coreWebVitals}>
                  <h4>Core Web Vitals</h4>
                  <div className={styles.vitalsGrid}>
                    {results.metrics && Object.entries({
                      LCP: 'Largest Contentful Paint',
                      FID: 'First Input Delay',
                      CLS: 'Cumulative Layout Shift'
                    }).map(([key, label]) => {
                      const value = results.metrics[key];
                      const status = getMetricStatus(value, key);
                      
                      return (
                        <div key={key} className={`${styles.vitalCard} ${styles[`status-${status}`]}`}>
                          <div className={styles.vitalHeader}>
                            <span className={styles.vitalKey}>{key}</span>
                            {status === 'good' ? (
                              <CheckCircleIcon className={styles.statusIcon} />
                            ) : status === 'poor' ? (
                              <XCircleIcon className={styles.statusIcon} />
                            ) : (
                              <ExclamationTriangleIcon className={styles.statusIcon} />
                            )}
                          </div>
                          <div className={styles.vitalValue}>
                            {formatMetricValue(value, key)}
                          </div>
                          <div className={styles.vitalLabel}>{label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Tabs */}
              <div className={styles.tabs}>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`${styles.tab} ${activeTab === 'performance' ? styles.active : ''}`}
                >
                  Performance Metrics
                </button>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className={`${styles.tab} ${activeTab === 'opportunities' ? styles.active : ''}`}
                >
                  Opportunities ({results.opportunities?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`${styles.tab} ${activeTab === 'diagnostics' ? styles.active : ''}`}
                >
                  Diagnostics ({results.diagnostics?.length || 0})
                </button>
              </div>
              
              {/* Tab Content */}
              <div className={styles.tabContent}>
                {/* Performance Metrics */}
                {activeTab === 'performance' && results.metrics && (
                  <div className={styles.metricsSection}>
                    <div className={styles.metricsGrid}>
                      {Object.entries({
                        FCP: { name: 'First Contentful Paint', icon: BoltIcon },
                        SI: { name: 'Speed Index', icon: BoltIcon },
                        LCP: { name: 'Largest Contentful Paint', icon: PhotoIcon },
                        TTI: { name: 'Time to Interactive', icon: BoltIcon },
                        TBT: { name: 'Total Blocking Time', icon: BoltIcon },
                        CLS: { name: 'Cumulative Layout Shift', icon: DocumentIcon }
                      }).map(([key, data]) => {
                        const value = results.metrics[key];
                        const status = getMetricStatus(value, key);
                        
                        return (
                          <div key={key} className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <data.icon className={styles.metricIcon} />
                              <span className={`${styles.metricStatus} ${styles[`status-${status}`]}`}>
                                {status === 'good' ? 'Good' : status === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
                              </span>
                            </div>
                            <h5 className={styles.metricName}>{data.name}</h5>
                            <div className={styles.metricValue}>
                              {formatMetricValue(value, key)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Resource Breakdown */}
                    {results.resources && (
                      <div className={styles.resourceBreakdown}>
                        <h4>Resource Breakdown</h4>
                        <div className={styles.resourceList}>
                          <div className={styles.resourceItem}>
                            <DocumentIcon className={styles.resourceIcon} />
                            <span>HTML</span>
                            <span className={styles.resourceValue}>
                              {formatFileSize(results.resources.html || 0)}
                            </span>
                          </div>
                          <div className={styles.resourceItem}>
                            <CodeBracketIcon className={styles.resourceIcon} />
                            <span>CSS</span>
                            <span className={styles.resourceValue}>
                              {formatFileSize(results.resources.css || 0)}
                            </span>
                          </div>
                          <div className={styles.resourceItem}>
                            <CodeBracketIcon className={styles.resourceIcon} />
                            <span>JavaScript</span>
                            <span className={styles.resourceValue}>
                              {formatFileSize(results.resources.js || 0)}
                            </span>
                          </div>
                          <div className={styles.resourceItem}>
                            <PhotoIcon className={styles.resourceIcon} />
                            <span>Images</span>
                            <span className={styles.resourceValue}>
                              {formatFileSize(results.resources.images || 0)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.totalSize}>
                          <span>Total Page Size</span>
                          <span className={styles.totalValue}>
                            {formatFileSize(results.totalSize || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Opportunities */}
                {activeTab === 'opportunities' && results.opportunities && (
                  <div className={styles.opportunitiesSection}>
                    {results.opportunities.length === 0 ? (
                      <div className={styles.emptyOpportunities}>
                        <CheckCircleIcon className={styles.successIcon} />
                        <p>No significant opportunities found!</p>
                      </div>
                    ) : (
                      results.opportunities.map((opportunity, index) => {
                        const impact = getOpportunityImpact(opportunity.savings || 0);
                        
                        return (
                          <div key={index} className={styles.opportunityCard}>
                            <div className={styles.opportunityHeader}>
                              <h5>{opportunity.title}</h5>
                              {opportunity.savings > 0 && (
                                <span 
                                  className={styles.savingsBadge}
                                  style={{ backgroundColor: `${impact.color}20`, color: impact.color }}
                                >
                                  Save {formatLoadTime(opportunity.savings)}
                                </span>
                              )}
                            </div>
                            <p className={styles.opportunityDescription}>
                              {opportunity.description}
                            </p>
                            {opportunity.details && (
                              <div className={styles.opportunityDetails}>
                                <pre>{opportunity.details}</pre>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                
                {/* Diagnostics */}
                {activeTab === 'diagnostics' && results.diagnostics && (
                  <div className={styles.diagnosticsSection}>
                    {results.diagnostics.length === 0 ? (
                      <div className={styles.emptyDiagnostics}>
                        <CheckCircleIcon className={styles.successIcon} />
                        <p>No diagnostic issues found!</p>
                      </div>
                    ) : (
                      results.diagnostics.map((diagnostic, index) => (
                        <div key={index} className={styles.diagnosticCard}>
                          <div className={styles.diagnosticHeader}>
                            <ExclamationTriangleIcon className={styles.warningIcon} />
                            <h5>{diagnostic.title}</h5>
                          </div>
                          <p className={styles.diagnosticDescription}>
                            {diagnostic.description}
                          </p>
                          {diagnostic.items && diagnostic.items.length > 0 && (
                            <ul className={styles.diagnosticItems}>
                              {diagnostic.items.slice(0, 5).map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                              {diagnostic.items.length > 5 && (
                                <li className={styles.moreItems}>
                                  And {diagnostic.items.length - 5} more...
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {/* Lab Data */}
              {results.labData && (
                <div className={styles.labData}>
                  <p className={styles.labDataNote}>
                    Lab data is collected in a controlled environment and may not represent real user experience.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyResults}>
              <BoltIcon className={styles.emptyIcon} />
              <h3>Analyze Your Page Speed</h3>
              <p>Enter a URL above to get detailed performance insights and recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PageSpeed.propTypes = {
  onClose: PropTypes.func.isRequired
};

// Mock API call for demonstration
const api = {
  post: async (url, data) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock data
    return {
      data: {
        score: Math.floor(Math.random() * 30) + 70,
        metrics: {
          FCP: Math.random() * 3000 + 500,
          LCP: Math.random() * 4000 + 1000,
          FID: Math.random() * 200 + 50,
          CLS: Math.random() * 0.2,
          SI: Math.random() * 4000 + 1000,
          TTI: Math.random() * 5000 + 2000,
          TBT: Math.random() * 500 + 100
        },
        opportunities: [
          {
            title: 'Eliminate render-blocking resources',
            description: '2 stylesheets and 1 script are blocking the first paint of your page.',
            savings: 1200
          },
          {
            title: 'Properly size images',
            description: 'Serve images that are appropriately-sized to save cellular data and improve load time.',
            savings: 890
          },
          {
            title: 'Remove unused CSS',
            description: 'Remove dead rules from stylesheets and defer the loading of CSS not used for above-the-fold content.',
            savings: 450
          }
        ],
        diagnostics: [
          {
            title: 'Ensure text remains visible during webfont load',
            description: 'Leverage the font-display CSS feature to ensure text is user-visible while webfonts are loading.',
            items: ['font-awesome.woff2', 'roboto-regular.woff2']
          },
          {
            title: 'Minimize main-thread work',
            description: 'Consider reducing the time spent parsing, compiling and executing JS.',
            items: []
          }
        ],
        resources: {
          html: 25600,
          css: 89300,
          js: 425000,
          images: 1250000
        },
        totalSize: 1789900,
        labData: true
      }
    };
  }
};

export default PageSpeed;