import { 
  POSITION_RANGES, 
  DATE_RANGES, 
  CHART_COLORS, 
  CHART_PALETTE 
} from '../utils/constants';
import { 
  formatNumber, 
  formatPercentage, 
  formatDate 
} from '../utils/formatters';

// Data processor service
class DataProcessor {
  // Process analytics data for charts
  processAnalyticsData(rawData, options = {}) {
    const {
      metric = 'sessions',
      dimension = 'date',
      dateRange = DATE_RANGES.LAST_30_DAYS,
      aggregation = 'sum'
    } = options;
    
    if (!rawData || !Array.isArray(rawData)) {
      return { labels: [], datasets: [] };
    }
    
    // Group by dimension
    const grouped = this.groupByDimension(rawData, dimension);
    
    // Aggregate data
    const aggregated = this.aggregateData(grouped, metric, aggregation);
    
    // Format for chart
    return this.formatChartData(aggregated, {
      label: metric,
      color: CHART_COLORS.PRIMARY
    });
  }
  
  // Group data by dimension
  groupByDimension(data, dimension) {
    const grouped = {};
    
    data.forEach(item => {
      const key = this.extractDimensionValue(item, dimension);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  }
  
  // Extract dimension value
  extractDimensionValue(item, dimension) {
    switch (dimension) {
      case 'date':
        return formatDate(item.date, 'yyyy-MM-dd');
      case 'hour':
        return new Date(item.date).getHours();
      case 'dayOfWeek':
        return new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' });
      case 'source':
        return item.source || 'Direct';
      case 'device':
        return item.deviceCategory || 'Unknown';
      default:
        return item[dimension] || 'Unknown';
    }
  }
  
  // Aggregate data
  aggregateData(grouped, metric, aggregation) {
    const result = {};
    
    Object.entries(grouped).forEach(([key, items]) => {
      switch (aggregation) {
        case 'sum':
          result[key] = items.reduce((sum, item) => sum + (item[metric] || 0), 0);
          break;
        case 'average':
          result[key] = items.reduce((sum, item) => sum + (item[metric] || 0), 0) / items.length;
          break;
        case 'count':
          result[key] = items.length;
          break;
        case 'max':
          result[key] = Math.max(...items.map(item => item[metric] || 0));
          break;
        case 'min':
          result[key] = Math.min(...items.map(item => item[metric] || 0));
          break;
        default:
          result[key] = items[0]?.[metric] || 0;
      }
    });
    
    return result;
  }
  
  // Format data for Chart.js
  formatChartData(data, options = {}) {
    const {
      label = 'Data',
      color = CHART_COLORS.PRIMARY,
      type = 'line',
      fill = false
    } = options;
    
    const entries = Object.entries(data).sort((a, b) => {
      // Sort by key (usually dates)
      return a[0].localeCompare(b[0]);
    });
    
    return {
      labels: entries.map(([key]) => key),
      datasets: [{
        label,
        data: entries.map(([, value]) => value),
        borderColor: color,
        backgroundColor: fill ? `${color}20` : color,
        fill,
        tension: type === 'line' ? 0.4 : 0
      }]
    };
  }
  
  // Process keyword data
  processKeywordData(keywords, options = {}) {
    const {
      groupBy = 'position_range',
      sortBy = 'position',
      sortOrder = 'asc'
    } = options;
    
    if (!keywords || !Array.isArray(keywords)) {
      return { grouped: {}, summary: {} };
    }
    
    // Sort keywords
    const sorted = this.sortKeywords(keywords, sortBy, sortOrder);
    
    // Group keywords
    const grouped = this.groupKeywords(sorted, groupBy);
    
    // Calculate summary statistics
    const summary = this.calculateKeywordSummary(keywords);
    
    return { keywords: sorted, grouped, summary };
  }
  
  // Sort keywords
  sortKeywords(keywords, sortBy, sortOrder) {
    return [...keywords].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity;
      
      // Sort
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }
  
  // Group keywords
  groupKeywords(keywords, groupBy) {
    const grouped = {};
    
    keywords.forEach(keyword => {
      let key;
      
      switch (groupBy) {
        case 'position_range':
          key = this.getPositionRange(keyword.position);
          break;
        case 'search_volume_range':
          key = this.getSearchVolumeRange(keyword.search_volume);
          break;
        case 'url':
          key = keyword.url || 'No URL';
          break;
        case 'group':
          key = keyword.group_name || 'Ungrouped';
          break;
        default:
          key = keyword[groupBy] || 'Unknown';
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(keyword);
    });
    
    return grouped;
  }
  
  // Get position range
  getPositionRange(position) {
    if (position === null || position === undefined) {
      return POSITION_RANGES.NOT_RANKING.label;
    }
    
    const range = Object.values(POSITION_RANGES).find(
      r => position >= r.min && (r.max === null || position <= r.max)
    );
    
    return range?.label || 'Unknown';
  }
  
  // Get search volume range
  getSearchVolumeRange(volume) {
    if (!volume || volume === 0) return 'No Volume';
    if (volume < 10) return '<10';
    if (volume < 100) return '10-100';
    if (volume < 1000) return '100-1K';
    if (volume < 10000) return '1K-10K';
    return '10K+';
  }
  
  // Calculate keyword summary
  calculateKeywordSummary(keywords) {
    const summary = {
      total: keywords.length,
      tracked: 0,
      ranking: 0,
      topTen: 0,
      improved: 0,
      declined: 0,
      avgPosition: 0,
      totalVolume: 0,
      avgDifficulty: 0
    };
    
    let positionSum = 0;
    let positionCount = 0;
    let difficultySum = 0;
    let difficultyCount = 0;
    
    keywords.forEach(keyword => {
      if (keyword.position !== null && keyword.position !== undefined) {
        summary.tracked++;
        
        if (keyword.position <= 100) {
          summary.ranking++;
          positionSum += keyword.position;
          positionCount++;
          
          if (keyword.position <= 10) {
            summary.topTen++;
          }
        }
      }
      
      if (keyword.position_change) {
        if (keyword.position_change < 0) {
          summary.improved++;
        } else if (keyword.position_change > 0) {
          summary.declined++;
        }
      }
      
      if (keyword.search_volume) {
        summary.totalVolume += keyword.search_volume;
      }
      
      if (keyword.difficulty !== null && keyword.difficulty !== undefined) {
        difficultySum += keyword.difficulty;
        difficultyCount++;
      }
    });
    
    summary.avgPosition = positionCount > 0 ? Math.round(positionSum / positionCount) : 0;
    summary.avgDifficulty = difficultyCount > 0 ? Math.round(difficultySum / difficultyCount) : 0;
    
    return summary;
  }
  
  // Process competitor data
  processCompetitorData(competitors, metrics = ['traffic', 'keywords', 'backlinks']) {
    if (!competitors || !Array.isArray(competitors)) {
      return { chart: null, comparison: [] };
    }
    
    // Prepare chart data
    const chartData = {
      labels: competitors.map(c => c.domain),
      datasets: []
    };
    
    // Add dataset for each metric
    metrics.forEach((metric, index) => {
      chartData.datasets.push({
        label: metric.charAt(0).toUpperCase() + metric.slice(1),
        data: competitors.map(c => c[metric] || 0),
        backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length],
        borderColor: CHART_PALETTE[index % CHART_PALETTE.length],
        borderWidth: 2
      });
    });
    
    // Calculate comparison percentages
    const ownData = competitors.find(c => c.isOwn);
    const comparison = competitors
      .filter(c => !c.isOwn)
      .map(competitor => {
        const comp = { domain: competitor.domain };
        
        metrics.forEach(metric => {
          if (ownData?.[metric] && competitor[metric]) {
            comp[`${metric}_diff`] = ((competitor[metric] - ownData[metric]) / ownData[metric]) * 100;
          }
        });
        
        return comp;
      });
    
    return { chart: chartData, comparison };
  }
  
  // Process technical issues
  processTechnicalIssues(issues) {
    if (!issues || !Array.isArray(issues)) {
      return { grouped: {}, summary: {}, priorities: [] };
    }
    
    // Group by severity
    const grouped = {};
    const summary = {
      total: issues.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    issues.forEach(issue => {
      const severity = issue.severity || 'info';
      
      if (!grouped[severity]) {
        grouped[severity] = [];
      }
      grouped[severity].push(issue);
      
      if (summary[severity] !== undefined) {
        summary[severity]++;
      }
    });
    
    // Calculate priorities
    const priorities = this.calculateIssuePriorities(issues);
    
    return { grouped, summary, priorities };
  }
  
  // Calculate issue priorities
  calculateIssuePriorities(issues) {
    const scored = issues.map(issue => ({
      ...issue,
      priorityScore: this.calculatePriorityScore(issue)
    }));
    
    // Sort by priority score
    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Get top priorities
    return scored.slice(0, 10);
  }
  
  // Calculate priority score
  calculatePriorityScore(issue) {
    const severityScores = {
      critical: 100,
      high: 50,
      medium: 20,
      low: 5,
      info: 1
    };
    
    const impactScores = {
      high: 3,
      medium: 2,
      low: 1
    };
    
    const effortScores = {
      low: 3,
      medium: 2,
      high: 1
    };
    
    const severity = severityScores[issue.severity] || 1;
    const impact = impactScores[issue.impact] || 1;
    const effort = effortScores[issue.effort] || 1;
    const affected = Math.log(issue.affectedPages || 1) + 1;
    
    return severity * impact * effort * affected;
  }
  
  // Process time series data
  processTimeSeriesData(data, interval = 'day') {
    if (!data || !Array.isArray(data)) {
      return { series: [], summary: {} };
    }
    
    // Sort by date
    const sorted = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Fill gaps in time series
    const filled = this.fillTimeSeriesGaps(sorted, interval);
    
    // Calculate moving averages
    const withAverages = this.addMovingAverages(filled);
    
    // Calculate trends
    const trends = this.calculateTrends(filled);
    
    return {
      series: withAverages,
      summary: {
        start: filled[0]?.date,
        end: filled[filled.length - 1]?.date,
        dataPoints: filled.length,
        trends
      }
    };
  }
  
  // Fill gaps in time series
  fillTimeSeriesGaps(data, interval) {
    if (data.length < 2) return data;
    
    const filled = [];
    const start = new Date(data[0].date);
    const end = new Date(data[data.length - 1].date);
    
    const current = new Date(start);
    let dataIndex = 0;
    
    while (current <= end) {
      const currentDate = formatDate(current, 'yyyy-MM-dd');
      const dataDate = formatDate(data[dataIndex]?.date, 'yyyy-MM-dd');
      
      if (currentDate === dataDate) {
        filled.push(data[dataIndex]);
        dataIndex++;
      } else {
        // Fill gap with zero or interpolated value
        filled.push({
          date: new Date(current),
          value: 0,
          interpolated: true
        });
      }
      
      // Increment date based on interval
      switch (interval) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          current.setDate(current.getDate() + 1);
      }
    }
    
    return filled;
  }
  
  // Add moving averages
  addMovingAverages(data, periods = [7, 30]) {
    return data.map((item, index) => {
      const result = { ...item };
      
      periods.forEach(period => {
        const start = Math.max(0, index - period + 1);
        const subset = data.slice(start, index + 1);
        const sum = subset.reduce((acc, d) => acc + (d.value || 0), 0);
        result[`ma${period}`] = subset.length > 0 ? sum / subset.length : 0;
      });
      
      return result;
    });
  }
  
  // Calculate trends
  calculateTrends(data) {
    if (data.length < 2) {
      return { direction: 'stable', change: 0, percentage: 0 };
    }
    
    const first = data[0].value || 0;
    const last = data[data.length - 1].value || 0;
    const change = last - first;
    const percentage = first > 0 ? (change / first) * 100 : 0;
    
    // Simple linear regression for trend direction
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + (d.value || 0), 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * (d.value || 0), 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return {
      direction: slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable',
      change: Math.round(change),
      percentage: Math.round(percentage * 10) / 10,
      slope: Math.round(slope * 1000) / 1000
    };
  }
  
  // Export data for download
  exportData(data, format = 'csv') {
    switch (format) {
      case 'csv':
        return this.exportAsCSV(data);
      case 'json':
        return this.exportAsJSON(data);
      case 'xlsx':
        return this.exportAsExcel(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  // Export as CSV
  exportAsCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');
    
    return csv;
  }
  
  // Export as JSON
  exportAsJSON(data) {
    return JSON.stringify(data, null, 2);
  }
  
  // Export as Excel (returns data structure for xlsx library)
  exportAsExcel(data) {
    // This would be used with a library like xlsx
    return {
      data,
      headers: data.length > 0 ? Object.keys(data[0]) : []
    };
  }
}

// Create singleton instance
const dataProcessor = new DataProcessor();

export default dataProcessor;