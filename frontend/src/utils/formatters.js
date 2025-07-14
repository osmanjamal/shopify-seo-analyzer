import { format, formatDistance, formatRelative, parseISO, isValid } from 'date-fns';
import { POSITION_RANGES, ISSUE_TYPES } from './constants';

// Number formatting
export const formatNumber = (number, options = {}) => {
  const {
    decimals = 0,
    locale = 'en-US',
    notation = 'standard',
    compactDisplay = 'short'
  } = options;
  
  if (number === null || number === undefined || isNaN(number)) {
    return '-';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation,
    compactDisplay
  }).format(number);
};

// Format large numbers with abbreviations (1K, 1M, etc.)
export const formatCompactNumber = (number) => {
  return formatNumber(number, { notation: 'compact', decimals: 1 });
};

// Currency formatting
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Percentage formatting
export const formatPercentage = (value, decimals = 1, includeSign = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  const formatted = formatNumber(value, { decimals });
  return includeSign ? `${formatted}%` : formatted;
};

// Format percentage change with color
export const formatPercentageChange = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return { text: '-', color: 'neutral' };
  }
  
  const formatted = formatNumber(Math.abs(value), { decimals });
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  
  return {
    text: `${sign}${formatted}%`,
    color: value > 0 ? 'success' : value < 0 ? 'error' : 'neutral',
    isPositive: value > 0,
    isNegative: value < 0
  };
};

// Date formatting
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return '-';
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return '-';
    
    return format(parsedDate, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '-';
  }
};

// Format date with time
export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return '-';
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return '-';
    
    return formatDistance(parsedDate, new Date(), { addSuffix: true });
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return '-';
  }
};

// Format time duration
export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || seconds < 0) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined || bytes < 0) return '-';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${formatNumber(size, { decimals: 2 })} ${units[unitIndex]}`;
};

// Format URL (remove protocol and trailing slash)
export const formatUrl = (url, options = {}) => {
  const { removeProtocol = true, removeWww = true, removeTrailingSlash = true } = options;
  
  if (!url) return '-';
  
  let formatted = url;
  
  if (removeProtocol) {
    formatted = formatted.replace(/^https?:\/\//, '');
  }
  
  if (removeWww) {
    formatted = formatted.replace(/^www\./, '');
  }
  
  if (removeTrailingSlash) {
    formatted = formatted.replace(/\/$/, '');
  }
  
  return formatted;
};

// Format keyword position
export const formatPosition = (position) => {
  if (position === null || position === undefined) {
    return { text: 'Not ranking', color: 'error' };
  }
  
  if (position > 100) {
    return { text: '100+', color: 'error' };
  }
  
  // Find the appropriate range
  const range = Object.values(POSITION_RANGES).find(
    r => position >= r.min && (r.max === null || position <= r.max)
  );
  
  return {
    text: position.toString(),
    color: range?.color || '#6b7280',
    range: range?.label || 'Unknown'
  };
};

// Format position change
export const formatPositionChange = (change) => {
  if (change === null || change === undefined || change === 0) {
    return { text: '-', color: 'neutral', icon: null };
  }
  
  const absChange = Math.abs(change);
  const improved = change < 0; // Negative means position improved (moved up)
  
  return {
    text: absChange.toString(),
    color: improved ? 'success' : 'error',
    icon: improved ? '↑' : '↓',
    improved
  };
};

// Format SEO score
export const formatSeoScore = (score) => {
  if (score === null || score === undefined) return { text: '-', color: 'neutral' };
  
  const roundedScore = Math.round(score);
  let color = 'error';
  let label = 'Poor';
  
  if (roundedScore >= 90) {
    color = 'success';
    label = 'Excellent';
  } else if (roundedScore >= 70) {
    color = 'warning';
    label = 'Good';
  } else if (roundedScore >= 50) {
    color = 'info';
    label = 'Average';
  }
  
  return {
    text: roundedScore.toString(),
    color,
    label,
    percentage: roundedScore
  };
};

// Format issue severity
export const formatIssueSeverity = (severity) => {
  const issue = ISSUE_TYPES[severity?.toUpperCase()] || ISSUE_TYPES.INFO;
  
  return {
    text: severity?.charAt(0).toUpperCase() + severity?.slice(1).toLowerCase() || 'Info',
    color: issue.color,
    weight: issue.weight
  };
};

// Format page load time
export const formatLoadTime = (milliseconds) => {
  if (milliseconds === null || milliseconds === undefined) return '-';
  
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  
  return `${(milliseconds / 1000).toFixed(2)}s`;
};

// Format bounce rate
export const formatBounceRate = (rate) => {
  if (rate === null || rate === undefined) return '-';
  
  const formatted = formatPercentage(rate, 1);
  let status = 'error';
  
  if (rate < 30) {
    status = 'success';
  } else if (rate < 50) {
    status = 'warning';
  }
  
  return {
    text: formatted,
    status
  };
};

// Truncate text
export const truncateText = (text, maxLength = 50, ellipsis = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
};

// Format meta title
export const formatMetaTitle = (title, maxLength = 60) => {
  if (!title) return { text: 'No title', status: 'error' };
  
  const length = title.length;
  let status = 'success';
  
  if (length < 30) {
    status = 'warning';
  } else if (length > maxLength) {
    status = 'error';
  }
  
  return {
    text: title,
    length,
    status,
    truncated: truncateText(title, maxLength)
  };
};

// Format meta description
export const formatMetaDescription = (description, maxLength = 160) => {
  if (!description) return { text: 'No description', status: 'error' };
  
  const length = description.length;
  let status = 'success';
  
  if (length < 120) {
    status = 'warning';
  } else if (length > maxLength) {
    status = 'error';
  }
  
  return {
    text: description,
    length,
    status,
    truncated: truncateText(description, maxLength)
  };
};

// Pluralize word
export const pluralize = (count, singular, plural = null) => {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
};

// Format list with proper grammar
export const formatList = (items, conjunction = 'and') => {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};

// Format search volume
export const formatSearchVolume = (volume) => {
  if (volume === null || volume === undefined) return '-';
  
  if (volume === 0) return '0';
  if (volume < 10) return '<10';
  
  return formatCompactNumber(volume);
};

// Format competition level
export const formatCompetition = (level) => {
  if (!level) return { text: '-', color: 'neutral' };
  
  const normalized = level.toLowerCase();
  
  switch (normalized) {
    case 'low':
      return { text: 'Low', color: 'success' };
    case 'medium':
      return { text: 'Medium', color: 'warning' };
    case 'high':
      return { text: 'High', color: 'error' };
    default:
      return { text: level, color: 'neutral' };
  }
};

// Format HTTP status code
export const formatHttpStatus = (status) => {
  if (!status) return { text: '-', color: 'neutral' };
  
  let color = 'neutral';
  let description = 'Unknown';
  
  if (status >= 200 && status < 300) {
    color = 'success';
    description = 'OK';
  } else if (status >= 300 && status < 400) {
    color = 'info';
    description = 'Redirect';
  } else if (status >= 400 && status < 500) {
    color = 'warning';
    description = 'Client Error';
  } else if (status >= 500) {
    color = 'error';
    description = 'Server Error';
  }
  
  return {
    text: status.toString(),
    color,
    description
  };
};

// Format robots directive
export const formatRobotsDirective = (directive) => {
  if (!directive) return { text: 'index, follow', status: 'success' };
  
  const normalized = directive.toLowerCase();
  let status = 'success';
  
  if (normalized.includes('noindex') || normalized.includes('nofollow')) {
    status = 'warning';
  }
  
  return {
    text: directive,
    status,
    isIndexable: !normalized.includes('noindex'),
    isFollowable: !normalized.includes('nofollow')
  };
};

export default {
  formatNumber,
  formatCompactNumber,
  formatCurrency,
  formatPercentage,
  formatPercentageChange,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  formatFileSize,
  formatUrl,
  formatPosition,
  formatPositionChange,
  formatSeoScore,
  formatIssueSeverity,
  formatLoadTime,
  formatBounceRate,
  truncateText,
  formatMetaTitle,
  formatMetaDescription,
  pluralize,
  formatList,
  formatSearchVolume,
  formatCompetition,
  formatHttpStatus,
  formatRobotsDirective
};