import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { useWebsiteData } from '../../hooks/useWebsiteData';
import Loading from '../Common/Loading';
import { 
  formatNumber, 
  formatDate,
  formatPercentageChange,
  formatCompactNumber 
} from '../../utils/formatters';
import { DATE_RANGES, CHART_COLORS } from '../../utils/constants';
import dataProcessor from '../../services/dataProcessor';
import { 
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  EyeIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import styles from './Analytics.module.css';

const TrafficChart = () => {
  const { showToast, selectedWebsite } = useApp();
  const { analytics, dataLoading, fetchAnalytics } = useData();
  const [dateRange, setDateRange] = useState(DATE_RANGES.LAST_30_DAYS.value);
  const [metric, setMetric] = useState('sessions'); // sessions, users, pageviews, avgSessionDuration
  const [chartType, setChartType] = useState('line'); // line, bar
  const [granularity, setGranularity] = useState('day'); // day, week, month
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [selectedSource, setSelectedSource] = useState('all');
  
  // Fetch analytics data when date range changes
  useEffect(() => {
    if (selectedWebsite) {
      fetchAnalytics(dateRange);
    }
  }, [selectedWebsite, dateRange, fetchAnalytics]);
  
  // Process chart data
  const chartData = useMemo(() => {
    if (!analytics?.traffic) {
      return { labels: [], datasets: [] };
    }
    
    const processedData = dataProcessor.processAnalyticsData(analytics.traffic, {
      metric,
      dimension: 'date',
      dateRange,
      aggregation: 'sum'
    });
    
    // Add comparison data if enabled
    if (compareEnabled && analytics.previousTraffic) {
      const previousData = dataProcessor.processAnalyticsData(analytics.previousTraffic, {
        metric,
        dimension: 'date',
        dateRange,
        aggregation: 'sum'
      });
      
      processedData.datasets.push({
        ...previousData.datasets[0],
        label: 'Previous Period',
        borderColor: CHART_COLORS.NEUTRAL,
        backgroundColor: CHART_COLORS.NEUTRAL + '20',
        borderDash: [5, 5]
      });
    }
    
    return processedData;
  }, [analytics, metric, dateRange, compareEnabled]);
  
  // Calculate traffic metrics
  const trafficMetrics = useMemo(() => {
    if (!analytics) {
      return {
        sessions: { value: 0, change: 0 },
        users: { value: 0, change: 0 },
        pageviews: { value: 0, change: 0 },
        avgSessionDuration: { value: 0, change: 0 },
        bounceRate: { value: 0, change: 0 },
        pagesPerSession: { value: 0, change: 0 }
      };
    }
    
    return {
      sessions: {
        value: analytics.metrics?.sessions || 0,
        change: analytics.metrics?.sessionsChange || 0
      },
      users: {
        value: analytics.metrics?.users || 0,
        change: analytics.metrics?.usersChange || 0
      },
      pageviews: {
        value: analytics.metrics?.pageviews || 0,
        change: analytics.metrics?.pageviewsChange || 0
      },
      avgSessionDuration: {
        value: analytics.metrics?.avgSessionDuration || 0,
        change: analytics.metrics?.avgSessionDurationChange || 0
      },
      bounceRate: {
        value: analytics.metrics?.bounceRate || 0,
        change: analytics.metrics?.bounceRateChange || 0
      },
      pagesPerSession: {
        value: analytics.metrics?.pagesPerSession || 0,
        change: analytics.metrics?.pagesPerSessionChange || 0
      }
    };
  }, [analytics]);
  
  // Traffic sources data
  const trafficSources = useMemo(() => {
    if (!analytics?.sources) return [];
    
    return analytics.sources
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
  }, [analytics]);
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            switch (metric) {
              case 'avgSessionDuration':
                return `${label}: ${Math.floor(value / 60)}m ${Math.floor(value % 60)}s`;
              case 'bounceRate':
                return `${label}: ${value.toFixed(1)}%`;
              default:
                return `${label}: ${formatNumber(value)}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: (value) => {
            switch (metric) {
              case 'avgSessionDuration':
                return `${Math.floor(value / 60)}m`;
              case 'bounceRate':
                return `${value}%`;
              default:
                return formatCompactNumber(value);
            }
          }
        }
      }
    }
  };
  
  // Export data
  const handleExport = () => {
    try {
      const csv = dataProcessor.exportData(analytics.traffic, 'csv');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `traffic-analytics-${dateRange}-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      showToast('Data exported successfully!', 'success');
    } catch (error) {
      showToast('Failed to export data', 'error');
    }
  };
  
  // Get metric icon
  const getMetricIcon = (metricKey) => {
    const icons = {
      sessions: ArrowRightOnRectangleIcon,
      users: UsersIcon,
      pageviews: EyeIcon,
      avgSessionDuration: ClockIcon
    };
    return icons[metricKey] || ArrowTrendingUpIcon;
  };
  
  if (!selectedWebsite) {
    return (
      <div className={styles.noWebsite}>
        <h2>Select a Website</h2>
        <p>Please select a website to view analytics</p>
      </div>
    );
  }
  
  return (
    <div className={styles.analyticsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Traffic Analytics</h1>
          <p className={styles.subtitle}>
            Monitor your website traffic and user behavior
          </p>
        </div>
        <div className={styles.headerRight}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={styles.dateRangeSelect}
          >
            {Object.values(DATE_RANGES).slice(0, -1).map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button onClick={handleExport} className={styles.exportButton}>
            <ArrowDownTrayIcon className={styles.buttonIcon} />
            Export
          </button>
        </div>
      </div>
      
      {/* Metrics Overview */}
      <div className={styles.metricsGrid}>
        {Object.entries(trafficMetrics).slice(0, 4).map(([key, data]) => {
          const Icon = getMetricIcon(key);
          const changeData = formatPercentageChange(data.change);
          
          return (
            <div key={key} className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <Icon className={styles.metricIcon} />
                <span className={styles.metricLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </span>
              </div>
              <div className={styles.metricValue}>
                {key === 'avgSessionDuration' 
                  ? `${Math.floor(data.value / 60)}:${String(Math.floor(data.value % 60)).padStart(2, '0')}`
                  : key === 'bounceRate'
                  ? `${data.value.toFixed(1)}%`
                  : formatNumber(data.value)
                }
              </div>
              {data.change !== 0 && (
                <div className={`${styles.metricChange} ${styles[changeData.color]}`}>
                  {changeData.isPositive ? (
                    <ArrowTrendingUpIcon className={styles.changeIcon} />
                  ) : changeData.isNegative ? (
                    <ArrowTrendingDownIcon className={styles.changeIcon} />
                  ) : null}
                  <span>{changeData.text}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Chart Controls */}
      <div className={styles.chartControls}>
        <div className={styles.controlsLeft}>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className={styles.metricSelect}
          >
            <option value="sessions">Sessions</option>
            <option value="users">Users</option>
            <option value="pageviews">Pageviews</option>
            <option value="avgSessionDuration">Avg. Session Duration</option>
          </select>
          
          <div className={styles.chartTypeToggle}>
            <button
              onClick={() => setChartType('line')}
              className={`${styles.chartTypeButton} ${chartType === 'line' ? styles.active : ''}`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`${styles.chartTypeButton} ${chartType === 'bar' ? styles.active : ''}`}
            >
              Bar
            </button>
          </div>
        </div>
        
        <div className={styles.controlsRight}>
          <label className={styles.compareToggle}>
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
            />
            <span>Compare to previous period</span>
          </label>
        </div>
      </div>
      
      {/* Main Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartContainer}>
          {dataLoading.analytics ? (
            <Loading message="Loading analytics data..." />
          ) : chartData.labels.length > 0 ? (
            chartType === 'line' ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )
          ) : (
            <div className={styles.noData}>
              <p>No data available for the selected period</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Traffic Sources */}
      <div className={styles.sourcesSection}>
        <h3>Top Traffic Sources</h3>
        <div className={styles.sourcesTable}>
          <div className={styles.tableHeader}>
            <div className={styles.sourceColumn}>Source / Medium</div>
            <div className={styles.dataColumn}>Sessions</div>
            <div className={styles.dataColumn}>Users</div>
            <div className={styles.dataColumn}>Bounce Rate</div>
            <div className={styles.dataColumn}>Conversion Rate</div>
          </div>
          {trafficSources.map((source, index) => (
            <div key={index} className={styles.tableRow}>
              <div className={styles.sourceColumn}>
                <span className={styles.sourceName}>{source.source}</span>
                <span className={styles.sourceMedium}>/ {source.medium || 'direct'}</span>
              </div>
              <div className={styles.dataColumn}>
                <span className={styles.dataValue}>{formatNumber(source.sessions)}</span>
                <div className={styles.dataBar}>
                  <div 
                    className={styles.dataBarFill}
                    style={{ width: `${(source.sessions / trafficSources[0].sessions) * 100}%` }}
                  />
                </div>
              </div>
              <div className={styles.dataColumn}>
                {formatNumber(source.users)}
              </div>
              <div className={styles.dataColumn}>
                {source.bounceRate.toFixed(1)}%
              </div>
              <div className={styles.dataColumn}>
                <span className={styles.conversionRate}>
                  {source.conversionRate.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className={styles.additionalMetrics}>
        <div className={styles.metricBox}>
          <h4>User Engagement</h4>
          <div className={styles.engagementMetrics}>
            <div className={styles.engagementItem}>
              <span className={styles.engagementLabel}>Pages / Session</span>
              <span className={styles.engagementValue}>
                {trafficMetrics.pagesPerSession.value.toFixed(2)}
              </span>
            </div>
            <div className={styles.engagementItem}>
              <span className={styles.engagementLabel}>Bounce Rate</span>
              <span className={styles.engagementValue}>
                {trafficMetrics.bounceRate.value.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficChart;