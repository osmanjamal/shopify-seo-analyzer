import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { useWebsiteData } from '../../hooks/useWebsiteData';
import PageSpeed from './PageSpeed';
import StructuredData from './StructuredData';
import Loading from '../Common/Loading';
import { 
  formatDate, 
  formatNumber,
  formatIssueSeverity,
  formatUrl 
} from '../../utils/formatters';
import { ISSUE_TYPES } from '../../utils/constants';
import { 
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  BugAntIcon,
  ShieldExclamationIcon,
  GlobeAltIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import styles from './Technical.module.css';

// Issue category icons
const categoryIcons = {
  security: ShieldExclamationIcon,
  performance: BugAntIcon,
  seo: GlobeAltIcon,
  content: DocumentTextIcon,
  technical: ExclamationTriangleIcon
};

// Issue severity icons
const severityIcons = {
  critical: ExclamationTriangleIcon,
  high: ExclamationCircleIcon,
  medium: InformationCircleIcon,
  low: InformationCircleIcon,
  info: InformationCircleIcon
};

const TechnicalIssues = () => {
  const { showToast, selectedWebsite } = useApp();
  const { 
    technicalIssues, 
    dataLoading, 
    fetchTechnicalIssues, 
    runTechnicalAnalysis 
  } = useData();
  const { runWebsiteAnalysis } = useWebsiteData();
  
  // Local state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [expandedIssues, setExpandedIssues] = useState(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPageSpeed, setShowPageSpeed] = useState(false);
  const [showStructuredData, setShowStructuredData] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  
  // Load last analysis date
  useEffect(() => {
    if (selectedWebsite) {
      const stored = localStorage.getItem(`lastAnalysis_${selectedWebsite.id}`);
      if (stored) {
        setLastAnalysis(new Date(stored));
      }
    }
  }, [selectedWebsite]);
  
  // Group and filter issues
  const processedIssues = useMemo(() => {
    let filtered = [...technicalIssues];
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(issue => issue.category === selectedCategory);
    }
    
    // Filter by severity
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(issue => issue.severity === selectedSeverity);
    }
    
    // Group by category
    const grouped = {};
    filtered.forEach(issue => {
      const category = issue.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(issue);
    });
    
    // Sort issues within each category by severity
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    });
    
    return grouped;
  }, [technicalIssues, selectedCategory, selectedSeverity]);
  
  // Calculate issue statistics
  const issueStats = useMemo(() => {
    const stats = {
      total: technicalIssues.length,
      byCategory: {},
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      score: 100
    };
    
    technicalIssues.forEach(issue => {
      // Count by category
      const category = issue.category || 'other';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      // Count by severity
      if (stats.bySeverity[issue.severity] !== undefined) {
        stats.bySeverity[issue.severity]++;
      }
      
      // Calculate score deduction
      const severityWeights = {
        critical: 20,
        high: 10,
        medium: 5,
        low: 2,
        info: 0
      };
      stats.score -= severityWeights[issue.severity] || 0;
    });
    
    stats.score = Math.max(0, stats.score);
    
    return stats;
  }, [technicalIssues]);
  
  // Run full analysis
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Run technical analysis
      await runTechnicalAnalysis();
      
      // Update last analysis date
      const now = new Date();
      setLastAnalysis(now);
      localStorage.setItem(`lastAnalysis_${selectedWebsite.id}`, now.toISOString());
      
      showToast('Technical analysis completed!', 'success');
    } catch (error) {
      showToast('Failed to run analysis', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Toggle issue expansion
  const toggleIssueExpansion = (issueId) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };
  
  // Export issues report
  const handleExportReport = async () => {
    try {
      // Create CSV content
      let csv = 'Category,Severity,Title,Description,URL,Impact,Recommendation\n';
      
      technicalIssues.forEach(issue => {
        const row = [
          issue.category || 'other',
          issue.severity,
          `"${issue.title.replace(/"/g, '""')}"`,
          `"${issue.description.replace(/"/g, '""')}"`,
          issue.url || '',
          issue.impact || '',
          `"${(issue.recommendation || '').replace(/"/g, '""')}"`
        ].join(',');
        csv += row + '\n';
      });
      
      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `technical-issues-${selectedWebsite.domain}-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      showToast('Report exported successfully!', 'success');
    } catch (error) {
      showToast('Failed to export report', 'error');
    }
  };
  
  // Get severity color
  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#6b7280',
      info: '#06b6d4'
    };
    return colors[severity] || colors.info;
  };
  
  if (!selectedWebsite) {
    return (
      <div className={styles.noWebsite}>
        <h2>Select a Website</h2>
        <p>Please select a website to view technical issues</p>
      </div>
    );
  }
  
  return (
    <div className={styles.technicalContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Technical SEO Analysis</h1>
          <p className={styles.subtitle}>
            Monitor and fix technical issues affecting your SEO
          </p>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={handleRunAnalysis}
            className={styles.primaryButton}
            disabled={isAnalyzing}
          >
            <ArrowPathIcon className={`${styles.buttonIcon} ${isAnalyzing ? styles.spinning : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>
      
      {/* Score Card */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreSection}>
          <div className={styles.scoreCircle} style={{ '--score': issueStats.score }}>
            <svg viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke={issueStats.score >= 90 ? '#10b981' : issueStats.score >= 70 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10"
                strokeDasharray={`${(issueStats.score / 100) * 565.48} 565.48`}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className={styles.scoreValue}>
              <span className={styles.scoreNumber}>{issueStats.score}</span>
              <span className={styles.scoreLabel}>Health Score</span>
            </div>
          </div>
        </div>
        
        <div className={styles.scoreDetails}>
          <h3>Technical Health Overview</h3>
          <div className={styles.issueBreakdown}>
            {Object.entries(issueStats.bySeverity).map(([severity, count]) => (
              <div key={severity} className={styles.severityItem}>
                <div 
                  className={styles.severityIndicator}
                  style={{ backgroundColor: getSeverityColor(severity) }}
                />
                <span className={styles.severityLabel}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </span>
                <span className={styles.severityCount}>{count}</span>
              </div>
            ))}
          </div>
          {lastAnalysis && (
            <p className={styles.lastAnalysisDate}>
              Last analysis: {formatDate(lastAnalysis, 'MMM dd, yyyy HH:mm')}
            </p>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          onClick={() => setShowPageSpeed(true)}
          className={styles.actionCard}
        >
          <BugAntIcon className={styles.actionIcon} />
          <span>Page Speed Analysis</span>
        </button>
        <button
          onClick={() => setShowStructuredData(true)}
          className={styles.actionCard}
        >
          <DocumentTextIcon className={styles.actionIcon} />
          <span>Structured Data Test</span>
        </button>
        <button
          onClick={handleExportReport}
          className={styles.actionCard}
        >
          <DocumentArrowDownIcon className={styles.actionIcon} />
          <span>Export Report</span>
        </button>
      </div>
      
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Categories</option>
            {Object.entries(issueStats.byCategory).map(([category, count]) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Severity</label>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Severities</option>
            {Object.entries(issueStats.bySeverity).map(([severity, count]) => (
              <option key={severity} value={severity}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)} ({count})
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterStats}>
          Showing {Object.values(processedIssues).flat().length} of {issueStats.total} issues
        </div>
      </div>
      
      {/* Issues List */}
      <div className={styles.issuesList}>
        {dataLoading.technical ? (
          <Loading message="Loading technical issues..." />
        ) : Object.keys(processedIssues).length === 0 ? (
          <div className={styles.emptyState}>
            {technicalIssues.length === 0 ? (
              <>
                <CheckCircleIcon className={styles.emptyIcon} />
                <h3>No Issues Found</h3>
                <p>Great! No technical issues detected on your website.</p>
                <button onClick={handleRunAnalysis} className={styles.primaryButton}>
                  Run New Analysis
                </button>
              </>
            ) : (
              <>
                <FunnelIcon className={styles.emptyIcon} />
                <h3>No Matching Issues</h3>
                <p>Try adjusting your filters to see issues.</p>
              </>
            )}
          </div>
        ) : (
          Object.entries(processedIssues).map(([category, issues]) => (
            <div key={category} className={styles.categorySection}>
              <div className={styles.categoryHeader}>
                {React.createElement(categoryIcons[category] || ExclamationTriangleIcon, {
                  className: styles.categoryIcon
                })}
                <h3 className={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h3>
                <span className={styles.categoryCount}>{issues.length} issues</span>
              </div>
              
              <div className={styles.categoryIssues}>
                {issues.map(issue => {
                  const isExpanded = expandedIssues.has(issue.id);
                  const severityData = formatIssueSeverity(issue.severity);
                  const SeverityIcon = severityIcons[issue.severity] || InformationCircleIcon;
                  
                  return (
                    <div 
                      key={issue.id} 
                      className={`${styles.issueCard} ${styles[`severity-${issue.severity}`]}`}
                    >
                      <div 
                        className={styles.issueHeader}
                        onClick={() => toggleIssueExpansion(issue.id)}
                      >
                        <div className={styles.issueIcon}>
                          <SeverityIcon 
                            className={styles.severityIcon}
                            style={{ color: severityData.color }}
                          />
                        </div>
                        <div className={styles.issueInfo}>
                          <h4 className={styles.issueTitle}>{issue.title}</h4>
                          <p className={styles.issueDescription}>{issue.description}</p>
                          {issue.url && (
                            <a 
                              href={issue.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={styles.issueUrl}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formatUrl(issue.url)}
                            </a>
                          )}
                        </div>
                        <div className={styles.issueActions}>
                          <span 
                            className={styles.severityBadge}
                            style={{ 
                              backgroundColor: `${severityData.color}20`,
                              color: severityData.color
                            }}
                          >
                            {severityData.text}
                          </span>
                          <button className={styles.expandButton}>
                            <svg 
                              className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
                              viewBox="0 0 24 24" 
                              fill="none"
                            >
                              <path 
                                d="M19 9l-7 7-7-7" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className={styles.issueDetails}>
                          {issue.impact && (
                            <div className={styles.detailSection}>
                              <h5>Impact</h5>
                              <p>{issue.impact}</p>
                            </div>
                          )}
                          
                          {issue.recommendation && (
                            <div className={styles.detailSection}>
                              <h5>How to Fix</h5>
                              <p>{issue.recommendation}</p>
                            </div>
                          )}
                          
                          {issue.affectedPages && issue.affectedPages > 0 && (
                            <div className={styles.detailSection}>
                              <h5>Affected Pages</h5>
                              <p>{formatNumber(issue.affectedPages)} pages affected</p>
                            </div>
                          )}
                          
                          {issue.examples && issue.examples.length > 0 && (
                            <div className={styles.detailSection}>
                              <h5>Examples</h5>
                              <ul className={styles.examplesList}>
                                {issue.examples.slice(0, 3).map((example, index) => (
                                  <li key={index}>
                                    <a 
                                      href={example} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                    >
                                      {formatUrl(example)}
                                    </a>
                                  </li>
                                ))}
                                {issue.examples.length > 3 && (
                                  <li className={styles.moreExamples}>
                                    And {issue.examples.length - 3} more...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Modals */}
      {showPageSpeed && (
        <PageSpeed onClose={() => setShowPageSpeed(false)} />
      )}
      
      {showStructuredData && (
        <StructuredData onClose={() => setShowStructuredData(false)} />
      )}
    </div>
  );
};

export default TechnicalIssues;