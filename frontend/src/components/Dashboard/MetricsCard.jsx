import React from 'react';
import PropTypes from 'prop-types';
import { formatPercentageChange } from '../../utils/formatters';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import styles from './Dashboard.module.css';

// Icon mapping
const iconMap = {
  traffic: UserGroupIcon,
  keywords: MagnifyingGlassIcon,
  trophy: TrophyIcon,
  alert: ExclamationTriangleIcon,
  speed: BoltIcon,
  conversion: ShoppingCartIcon,
  chart: ChartBarIcon,
  click: CursorArrowRaysIcon,
  document: DocumentTextIcon
};

const MetricsCard = ({ 
  title, 
  value, 
  change, 
  subtitle, 
  icon = 'chart', 
  status = 'default',
  onClick,
  loading = false 
}) => {
  // Get icon component
  const IconComponent = iconMap[icon] || ChartBarIcon;
  
  // Process change data
  const changeData = change !== null && change !== undefined 
    ? formatPercentageChange(change) 
    : null;
  
  // Determine card status class
  const getStatusClass = () => {
    if (status !== 'default') return styles[`status-${status}`];
    if (changeData) {
      return changeData.isPositive ? styles['status-success'] : 
             changeData.isNegative ? styles['status-error'] : '';
    }
    return '';
  };
  
  // Trend icon
  const TrendIcon = changeData?.isPositive ? ArrowTrendingUpIcon : 
                   changeData?.isNegative ? ArrowTrendingDownIcon : null;
  
  const cardClasses = [
    styles.metricsCard,
    getStatusClass(),
    onClick ? styles.clickable : '',
    loading ? styles.loading : ''
  ].filter(Boolean).join(' ');
  
  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };
  
  const handleKeyPress = (e) => {
    if (onClick && !loading && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };
  
  return (
    <div 
      className={cardClasses}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : -1}
      aria-label={`${title}: ${value}`}
    >
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <IconComponent className={styles.icon} />
        </div>
        <h3 className={styles.cardTitle}>{title}</h3>
      </div>
      
      {/* Value */}
      <div className={styles.cardContent}>
        {loading ? (
          <div className={styles.cardSkeleton}>
            <div className={styles.skeletonValue}></div>
            <div className={styles.skeletonSubtitle}></div>
          </div>
        ) : (
          <>
            <div className={styles.cardValue}>{value}</div>
            
            {/* Change indicator */}
            {changeData && (
              <div className={`${styles.cardChange} ${styles[changeData.color]}`}>
                {TrendIcon && <TrendIcon className={styles.trendIcon} />}
                <span>{changeData.text}</span>
              </div>
            )}
            
            {/* Subtitle */}
            {subtitle && (
              <div className={styles.cardSubtitle}>{subtitle}</div>
            )}
          </>
        )}
      </div>
      
      {/* Click indicator */}
      {onClick && !loading && (
        <div className={styles.cardClickIndicator}>
          <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none">
            <path 
              d="M9 5l7 7-7 7" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

MetricsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.number,
  subtitle: PropTypes.string,
  icon: PropTypes.oneOf(Object.keys(iconMap)),
  status: PropTypes.oneOf(['default', 'success', 'warning', 'error', 'info']),
  onClick: PropTypes.func,
  loading: PropTypes.bool
};

// Mini metrics card variant
export const MiniMetricsCard = ({ title, value, icon }) => {
  const IconComponent = iconMap[icon] || ChartBarIcon;
  
  return (
    <div className={styles.miniMetricsCard}>
      <IconComponent className={styles.miniIcon} />
      <div className={styles.miniContent}>
        <span className={styles.miniValue}>{value}</span>
        <span className={styles.miniTitle}>{title}</span>
      </div>
    </div>
  );
};

MiniMetricsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.oneOf(Object.keys(iconMap))
};

export default MetricsCard;