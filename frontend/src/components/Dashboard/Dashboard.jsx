import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useWebsiteData } from '../../hooks/useWebsiteData';
import { useRealTimeAnalytics } from '../../hooks/useRealTimeAnalytics';
import MetricsCard from './MetricsCard';
import ScoreCircle from './ScoreCircle';
import Loading from '../Common/Loading';
import ErrorBoundary from '../Common/ErrorBoundary';
import { 
  formatNumber, 
  formatPercentageChange, 
  formatCompactNumber,
  formatRelativeTime 
} from '../../utils/formatters';
import { DATE_RANGES, CHART_COLORS } from '../../utils/constants';
import dataProcessor from '../../services/dataProcessor';
import styles from './Dashboard.module.css';

// Chart imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast, selectedWebsite } = useApp();
  const { user } = useAuth();
  const { 
    dashboardData, 
    dataLoading, 
    fetchDashboardData,
    analytics,
    keywords,
    technicalIssues 
  } = useData();
  const { websites, switchWebsite } = useWebsiteData();
  const realtimeAnalytics = useRealTimeAnalytics(selectedWebsite?.id, {
    autoStart: true,
    pollInterval: 30000
  });
  
  // Local state
  const [dateRange, setDateRange] = useState(DATE_RANGES.LAST_7_DAYS.value);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Refresh dashboard data
  const refreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardData(true);
      showToast('Dashboard refreshed', 'success');
    } catch (error) {
      showToast('Failed to refresh dashboard', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedWebsite) {
        fetchDashboardData();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [selectedWebsite, fetchDashboardData]);
  
  // Calculate metrics
  const metrics = {
    seoScore: dashboardData?.seoScore || 0,
    organicTraffic: dashboardData?.analytics?.organicSessions || 0,
    keywords: {
      total: keywords.length || 0,
      ranking: keywords.filter(k => k.position && k.position <= 100).length || 0,
      topTen: keywords.filter(k => k.position && k.position <= 10).length || 0
    },
    issues: {
      critical: technicalIssues.filter(i => i.severity === 'critical').length || 0,
      total: technicalIssues.length || 0
    },
    performance: {
      loadTime: dashboardData?.performance?.avgLoadTime || 0,
      score: dashboardData?.performance?.score || 0
    },
    realtime: {
      activeUsers: realtimeAnalytics.data.activeUsers || 0
    }
  };
  
  // Process chart data
  const trafficChartData = dashboardData?.analytics?.traffic 
    ? dataProcessor.processAnalyticsData(dashboardData.analytics.traffic, {
        metric: 'sessions',
        dimension: 'date'
      })
    : { labels: [], datasets: [] };
    
  const keywordPositionData = {
    labels: Object.values(POSITION_RANGES).map(r => r.label),
    datasets: [{
      label: 'Keywords',
      data: Object.values(POSITION_RANGES).map(range => {
        return keywords.filter(k => {
          const pos = k.position;
          if (!pos && range.min > 100) return true;
          return pos >= range.min && (range.max === null || pos <= range.max);
        }).length;
      }),
      backgroundColor: Object.values(POSITION_RANGES).map(r => r.color)
    }]
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };
  
  if (!selectedWebsite) {
    return (
      <div className={styles.noWebsite}>
        <h2>Welcome to SEO Analyzer</h2>
        <p>Please select a website to view the dashboard</p>
        {websites.length > 0 ? (
          <div className={styles.websiteList}>
            {websites.map(site => (
              <button
                key={site.id}
                onClick={() => switchWebsite(site)}
                className={styles.websiteButton}
              >
                {site.domain}
              </button>
            ))}
          </div>
        ) : (
          <button 
            onClick={() => navigate('/settings')}
            className={styles.addWebsiteButton}
          >
            Add Your First Website
          </button>
        )}
      </div>
    );
  }
  
  if (dataLoading.dashboard && !dashboardData) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }
  
  return (
    <ErrorBoundary>
      <div className={styles.dashboard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Dashboard</h1>
            <p className={styles.subtitle}>
              {selectedWebsite.domain} • Last updated {formatRelativeTime(dashboardData?.lastUpdated)}
            </p>
          </div>
          <div className={styles.headerRight}>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className={styles.dateRangeSelect}
            >
              {Object.values(DATE_RANGES).map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <button 
              onClick={refreshDashboard}
              className={styles.refreshButton}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* SEO Score */}
        <div className={styles.scoreSection}>
          <div className={styles.scoreCard}>
            <h2>Overall SEO Score</h2>
            <ScoreCircle 
              score={metrics.seoScore} 
              size={200}
              strokeWidth={20}
            />
            <p className={styles.scoreDescription}>
              Your website's SEO health score based on technical, content, and performance factors
            </p>
          </div>
          
          {/* Real-time Users */}
          {realtimeAnalytics.isConnected && (
            <div className={styles.realtimeCard}>
              <h3>Active Users Right Now</h3>
              <div className={styles.realtimeNumber}>
                {formatNumber(metrics.realtime.activeUsers)}
              </div>
              <div className={styles.realtimeIndicator}>
                <span className={styles.liveIndicator}></span>
                Real-time
              </div>
            </div>
          )}
        </div>
        
        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          <MetricsCard
            title="Organic Traffic"
            value={formatCompactNumber(metrics.organicTraffic)}
            change={dashboardData?.analytics?.trafficChange}
            icon="traffic"
            onClick={() => navigate('/analytics')}
          />
          
          <MetricsCard
            title="Total Keywords"
            value={formatNumber(metrics.keywords.total)}
            subtitle={`${metrics.keywords.ranking} ranking`}
            icon="keywords"
            onClick={() => navigate('/keywords')}
          />
          
          <MetricsCard
            title="Top 10 Keywords"
            value={formatNumber(metrics.keywords.topTen)}
            change={dashboardData?.keywords?.topTenChange}
            icon="trophy"
            onClick={() => navigate('/keywords')}
          />
          
          <MetricsCard
            title="Technical Issues"
            value={formatNumber(metrics.issues.total)}
            subtitle={metrics.issues.critical > 0 ? `${metrics.issues.critical} critical` : 'No critical issues'}
            status={metrics.issues.critical > 0 ? 'error' : 'success'}
            icon="alert"
            onClick={() => navigate('/technical')}
          />
          
          <MetricsCard
            title="Page Speed"
            value={`${metrics.performance.score}/100`}
            subtitle={`${(metrics.performance.loadTime / 1000).toFixed(1)}s load time`}
            status={metrics.performance.score >= 90 ? 'success' : metrics.performance.score >= 50 ? 'warning' : 'error'}
            icon="speed"
            onClick={() => navigate('/technical')}
          />
          
          <MetricsCard
            title="Conversion Rate"
            value={formatPercentage(dashboardData?.analytics?.conversionRate || 0, 2)}
            change={dashboardData?.analytics?.conversionRateChange}
            icon="conversion"
            onClick={() => navigate('/analytics')}
          />
        </div>
        
        {/* Charts Section */}
        <div className={styles.chartsSection}>
          {/* Traffic Chart */}
          <div className={styles.chartCard}>
            <h3>Organic Traffic Trend</h3>
            <div className={styles.chartContainer}>
              {trafficChartData.labels.length > 0 ? (
                <Line data={trafficChartData} options={chartOptions} />
              ) : (
                <div className={styles.noData}>No traffic data available</div>
              )}
            </div>
          </div>
          
          {/* Keyword Distribution */}
          <div className={styles.chartCard}>
            <h3>Keyword Position Distribution</h3>
            <div className={styles.chartContainer}>
              {keywords.length > 0 ? (
                <Doughnut 
                  data={keywordPositionData} 
                  options={{
                    ...chartOptions,
                    maintainAspectRatio: true,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        position: 'right'
                      }
                    }
                  }} 
                />
              ) : (
                <div className={styles.noData}>No keyword data available</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <h3>Quick Actions</h3>
          <div className={styles.actionButtons}>
            <button 
              onClick={() => navigate('/keywords')}
              className={styles.actionButton}
            >
              Add Keywords
            </button>
            <button 
              onClick={() => navigate('/technical')}
              className={styles.actionButton}
            >
              Run Site Audit
            </button>
            <button 
              onClick={() => navigate('/analytics')}
              className={styles.actionButton}
            >
              View Analytics
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className={styles.actionButton}
            >
              Configure Settings
            </button>
          </div>
        </div>
        
        {/* Recent Activity */}
        {dashboardData?.recentActivity && (
          <div className={styles.recentActivity}>
            <h3>Recent Activity</h3>
            <div className={styles.activityList}>
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    {activity.type === 'keyword' ? '🔍' : 
                     activity.type === 'issue' ? '⚠️' : 
                     activity.type === 'traffic' ? '📈' : '📊'}
                  </div>
                  <div className={styles.activityContent}>
                    <p>{activity.message}</p>
                    <span className={styles.activityTime}>
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;