import React from 'react';
import styles from './Common.module.css';

const Loading = ({ 
  size = 'medium', 
  text = 'Loading...', 
  fullScreen = false,
  overlay = false,
  type = 'spinner' 
}) => {
  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className={`${styles.spinner} ${styles[`spinner-${size}`]}`}>
            <div className={styles.spinnerCircle}></div>
          </div>
        );
      
      case 'dots':
        return (
          <div className={styles.dotsLoader}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        );
      
      case 'bars':
        return (
          <div className={styles.barsLoader}>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${styles.pulseLoader} ${styles[`pulse-${size}`]}`}>
            <div className={styles.pulse}></div>
            <div className={styles.pulse}></div>
          </div>
        );
      
      case 'skeleton':
        return (
          <div className={styles.skeletonLoader}>
            <div className={styles.skeletonHeader}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText} style={{ width: '60%' }}></div>
          </div>
        );
      
      default:
        return (
          <div className={`${styles.spinner} ${styles[`spinner-${size}`]}`}>
            <div className={styles.spinnerCircle}></div>
          </div>
        );
    }
  };

  const content = (
    <div className={`${styles.loadingContainer} ${styles[`loading-${size}`]}`}>
      {renderLoader()}
      {text && <p className={styles.loadingText}>{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={styles.loadingFullScreen}>
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className={styles.loadingOverlay}>
        {content}
      </div>
    );
  }

  return content;
};

// Specialized loading components
export const CardSkeleton = ({ count = 1 }) => {
  return (
    <div className={styles.cardSkeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.cardSkeleton}>
          <div className={styles.skeletonHeader}></div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText} style={{ width: '70%' }}></div>
          </div>
          <div className={styles.skeletonFooter}>
            <div className={styles.skeletonButton}></div>
            <div className={styles.skeletonButton}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className={styles.tableSkeleton}>
      <div className={styles.tableSkeletonHeader}>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className={styles.skeletonCell}></div>
        ))}
      </div>
      <div className={styles.tableSkeletonBody}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className={styles.tableSkeletonRow}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className={styles.skeletonCell}></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChartSkeleton = () => {
  return (
    <div className={styles.chartSkeleton}>
      <div className={styles.chartSkeletonHeader}>
        <div className={styles.skeletonText} style={{ width: '200px' }}></div>
        <div className={styles.skeletonButton}></div>
      </div>
      <div className={styles.chartSkeletonBody}>
        <div className={styles.chartSkeletonBars}>
          {Array.from({ length: 7 }).map((_, index) => (
            <div 
              key={index} 
              className={styles.chartSkeletonBar}
              style={{ height: `${Math.random() * 60 + 40}%` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MetricSkeleton = ({ count = 4 }) => {
  return (
    <div className={styles.metricSkeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.metricSkeleton}>
          <div className={styles.metricSkeletonIcon}></div>
          <div className={styles.metricSkeletonContent}>
            <div className={styles.skeletonText} style={{ width: '60%' }}></div>
            <div className={styles.skeletonNumber}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Loading;