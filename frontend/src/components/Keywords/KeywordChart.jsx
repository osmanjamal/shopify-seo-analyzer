import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import { 
  formatNumber, 
  formatPosition,
  formatSearchVolume,
  formatDate 
} from '../../utils/formatters';
import { 
  POSITION_RANGES, 
  CHART_COLORS, 
  CHART_PALETTE,
  DATE_RANGES 
} from '../../utils/constants';
import dataProcessor from '../../services/dataProcessor';
import { XMarkIcon } from '@heroicons/react/24/outline';
import styles from './Keywords.module.css';

const KeywordChart = ({ keywords, onClose }) => {
  const [chartType, setChartType] = useState('position_distribution');
  const [dateRange, setDateRange] = useState(DATE_RANGES.LAST_30_DAYS.value);
  
  // Process keyword data for different chart types
  const chartData = useMemo(() => {
    switch (chartType) {
      case 'position_distribution':
        return getPositionDistributionData();
      case 'volume_distribution':
        return getVolumeDistributionData();
      case 'position_vs_volume':
        return getPositionVsVolumeData();
      case 'progress_over_time':
        return getProgressOverTimeData();
      case 'top_keywords':
        return getTopKeywordsData();
      case 'difficulty_analysis':
        return getDifficultyAnalysisData();
      default:
        return { labels: [], datasets: [] };
    }
  }, [keywords, chartType, dateRange]);
  
  // Get position distribution data
  function getPositionDistributionData() {
    const distribution = Object.values(POSITION_RANGES).map(range => {
      const count = keywords.filter(k => {
        const pos = k.position;
        if (!pos && range.min > 100) return true;
        return pos >= range.min && (range.max === null || pos <= range.max);
      }).length;
      return { label: range.label, count, color: range.color };
    });
    
    return {
      labels: distribution.map(d => d.label),
      datasets: [{
        label: 'Keywords',
        data: distribution.map(d => d.count),
        backgroundColor: distribution.map(d => d.color),
        borderWidth: 0
      }]
    };
  }
  
  // Get volume distribution data
  function getVolumeDistributionData() {
    const ranges = [
      { label: 'No Volume', min: 0, max: 0 },
      { label: '1-100', min: 1, max: 100 },
      { label: '101-1K', min: 101, max: 1000 },
      { label: '1K-10K', min: 1001, max: 10000 },
      { label: '10K+', min: 10001, max: Infinity }
    ];
    
    const distribution = ranges.map((range, index) => {
      const count = keywords.filter(k => {
        const vol = k.search_volume || 0;
        return vol >= range.min && vol <= range.max;
      }).length;
      return { 
        label: range.label, 
        count,
        color: CHART_PALETTE[index % CHART_PALETTE.length]
      };
    });
    
    return {
      labels: distribution.map(d => d.label),
      datasets: [{
        label: 'Keywords',
        data: distribution.map(d => d.count),
        backgroundColor: distribution.map(d => d.color),
        borderColor: distribution.map(d => d.color),
        borderWidth: 2
      }]
    };
  }
  
  // Get position vs volume scatter data
  function getPositionVsVolumeData() {
    const scatterData = keywords
      .filter(k => k.position && k.position <= 100 && k.search_volume)
      .map(k => ({
        x: k.position,
        y: k.search_volume,
        label: k.keyword
      }));
    
    return {
      datasets: [{
        label: 'Keywords',
        data: scatterData,
        backgroundColor: CHART_COLORS.PRIMARY + '60',
        borderColor: CHART_COLORS.PRIMARY,
        borderWidth: 1,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
  }
  
  // Get progress over time data (simulated)
  function getProgressOverTimeData() {
    // This would normally use historical data
    // For now, we'll simulate it
    const days = DATE_RANGES[Object.keys(DATE_RANGES).find(k => DATE_RANGES[k].value === dateRange)]?.days || 30;
    const dates = [];
    const topTenData = [];
    const top20Data = [];
    const top50Data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(formatDate(date, 'MMM dd'));
      
      // Simulate data with some randomness
      const baseTopTen = keywords.filter(k => k.position && k.position <= 10).length;
      const baseTop20 = keywords.filter(k => k.position && k.position <= 20).length;
      const baseTop50 = keywords.filter(k => k.position && k.position <= 50).length;
      
      topTenData.push(Math.max(0, baseTopTen + Math.floor(Math.random() * 5 - 2)));
      top20Data.push(Math.max(0, baseTop20 + Math.floor(Math.random() * 8 - 4)));
      top50Data.push(Math.max(0, baseTop50 + Math.floor(Math.random() * 10 - 5)));
    }
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Top 10',
          data: topTenData,
          borderColor: POSITION_RANGES.TOP_10.color,
          backgroundColor: POSITION_RANGES.TOP_10.color + '20',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Top 20',
          data: top20Data,
          borderColor: POSITION_RANGES.TOP_20.color,
          backgroundColor: POSITION_RANGES.TOP_20.color + '20',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Top 50',
          data: top50Data,
          borderColor: POSITION_RANGES.TOP_50.color,
          backgroundColor: POSITION_RANGES.TOP_50.color + '20',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }
  
  // Get top keywords by volume
  function getTopKeywordsData() {
    const topKeywords = [...keywords]
      .filter(k => k.search_volume)
      .sort((a, b) => b.search_volume - a.search_volume)
      .slice(0, 10);
    
    return {
      labels: topKeywords.map(k => k.keyword.length > 20 ? k.keyword.substring(0, 20) + '...' : k.keyword),
      datasets: [{
        label: 'Search Volume',
        data: topKeywords.map(k => k.search_volume),
        backgroundColor: CHART_COLORS.PRIMARY,
        borderColor: CHART_COLORS.PRIMARY,
        borderWidth: 2
      }]
    };
  }
  
  // Get difficulty analysis data
  function getDifficultyAnalysisData() {
    const difficultyRanges = [
      { label: 'Easy (0-30)', min: 0, max: 30, color: CHART_COLORS.SUCCESS },
      { label: 'Medium (31-60)', min: 31, max: 60, color: CHART_COLORS.WARNING },
      { label: 'Hard (61-100)', min: 61, max: 100, color: CHART_COLORS.ERROR }
    ];
    
    const distribution = difficultyRanges.map(range => {
      const keywordsInRange = keywords.filter(k => 
        k.difficulty >= range.min && k.difficulty <= range.max
      );
      
      return {
        label: range.label,
        count: keywordsInRange.length,
        avgVolume: keywordsInRange.reduce((sum, k) => sum + (k.search_volume || 0), 0) / (keywordsInRange.length || 1),
        color: range.color
      };
    });
    
    return {
      labels: distribution.map(d => d.label),
      datasets: [
        {
          label: 'Keyword Count',
          data: distribution.map(d => d.count),
          backgroundColor: distribution.map(d => d.color + '80'),
          borderColor: distribution.map(d => d.color),
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Avg Search Volume',
          data: distribution.map(d => Math.round(d.avgVolume)),
          type: 'line',
          borderColor: CHART_COLORS.INFO,
          backgroundColor: CHART_COLORS.INFO + '20',
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };
  }
  
  // Chart options based on type
  const getChartOptions = () => {
    const baseOptions = {
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
      }
    };
    
    switch (chartType) {
      case 'position_vs_volume':
        return {
          ...baseOptions,
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              title: {
                display: true,
                text: 'Position'
              },
              min: 1,
              max: 100
            },
            y: {
              type: 'logarithmic',
              title: {
                display: true,
                text: 'Search Volume'
              }
            }
          },
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: (context) => {
                  const point = context.raw;
                  return `${point.label}: Position ${point.x}, Volume ${formatNumber(point.y)}`;
                }
              }
            }
          }
        };
        
      case 'difficulty_analysis':
        return {
          ...baseOptions,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Keyword Count'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Avg Search Volume'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        };
        
      default:
        return {
          ...baseOptions,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        };
    }
  };
  
  // Get chart component based on type
  const getChartComponent = () => {
    switch (chartType) {
      case 'position_distribution':
      case 'volume_distribution':
        return <Doughnut data={chartData} options={getChartOptions()} />;
        
      case 'position_vs_volume':
        return <Scatter data={chartData} options={getChartOptions()} />;
        
      case 'progress_over_time':
        return <Line data={chartData} options={getChartOptions()} />;
        
      case 'top_keywords':
      case 'difficulty_analysis':
        return <Bar data={chartData} options={getChartOptions()} />;
        
      default:
        return <div>Select a chart type</div>;
    }
  };
  
  return (
    <div className={styles.modal}>
      <div className={styles.modalOverlay} onClick={onClose} />
      <div className={styles.modalContent} style={{ maxWidth: '900px' }}>
        <div className={styles.modalHeader}>
          <h3>Keyword Analytics</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <XMarkIcon className={styles.closeIcon} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Chart Type Selector */}
          <div className={styles.chartControls}>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className={styles.chartTypeSelect}
            >
              <option value="position_distribution">Position Distribution</option>
              <option value="volume_distribution">Search Volume Distribution</option>
              <option value="position_vs_volume">Position vs Volume</option>
              <option value="progress_over_time">Progress Over Time</option>
              <option value="top_keywords">Top Keywords by Volume</option>
              <option value="difficulty_analysis">Difficulty Analysis</option>
            </select>
            
            {chartType === 'progress_over_time' && (
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
            )}
          </div>
          
          {/* Chart Container */}
          <div className={styles.chartContainer} style={{ height: '400px' }}>
            {getChartComponent()}
          </div>
          
          {/* Chart Summary */}
          <div className={styles.chartSummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Keywords:</span>
              <span className={styles.summaryValue}>{formatNumber(keywords.length)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Tracked Keywords:</span>
              <span className={styles.summaryValue}>
                {formatNumber(keywords.filter(k => k.position !== null).length)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Search Volume:</span>
              <span className={styles.summaryValue}>
                {formatSearchVolume(keywords.reduce((sum, k) => sum + (k.search_volume || 0), 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

KeywordChart.propTypes = {
  keywords: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func.isRequired
};

export default KeywordChart;