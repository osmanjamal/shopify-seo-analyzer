import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from './Dashboard.module.css';

const ScoreCircle = ({ 
  score, 
  size = 200, 
  strokeWidth = 15,
  showLabel = true,
  animate = true,
  duration = 1000 
}) => {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const [offset, setOffset] = useState(0);
  const animationRef = useRef(null);
  
  // Calculate circle dimensions
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash offset for the score
  const targetOffset = circumference - (score / 100) * circumference;
  
  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // amber
    if (score >= 50) return '#3b82f6'; // blue
    return '#ef4444'; // red
  };
  
  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    return 'Poor';
  };
  
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  
  // Animate score counter
  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      setOffset(targetOffset);
      return;
    }
    
    let startTime = null;
    let startScore = displayScore;
    let startOffset = offset;
    
    const animateValue = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Update score
      const currentScore = Math.round(startScore + (score - startScore) * eased);
      setDisplayScore(currentScore);
      
      // Update offset
      const currentOffset = startOffset + (targetOffset - startOffset) * eased;
      setOffset(currentOffset);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateValue);
      }
    };
    
    animationRef.current = requestAnimationFrame(animateValue);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [score, animate, duration, targetOffset]);
  
  return (
    <div className={styles.scoreCircleContainer} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className={styles.scoreCircleSvg}
        aria-label={`SEO Score: ${score} out of 100`}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          className={styles.scoreCircleBackground}
        />
        
        {/* Score circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className={styles.scoreCircleProgress}
          style={{
            transition: animate ? 'stroke-dashoffset 0.5s ease-out' : 'none'
          }}
        />
        
        {/* Score text */}
        <g className={styles.scoreCircleText}>
          <text
            x={center}
            y={center - 10}
            textAnchor="middle"
            className={styles.scoreNumber}
            style={{ fill: scoreColor }}
          >
            {displayScore}
          </text>
          <text
            x={center}
            y={center + 15}
            textAnchor="middle"
            className={styles.scoreMax}
          >
            / 100
          </text>
          {showLabel && (
            <text
              x={center}
              y={center + 35}
              textAnchor="middle"
              className={styles.scoreLabel}
              style={{ fill: scoreColor }}
            >
              {scoreLabel}
            </text>
          )}
        </g>
      </svg>
      
      {/* Decorative elements */}
      <div className={styles.scoreCircleGlow} style={{ backgroundColor: scoreColor }}></div>
    </div>
  );
};

ScoreCircle.propTypes = {
  score: PropTypes.number.isRequired,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  showLabel: PropTypes.bool,
  animate: PropTypes.bool,
  duration: PropTypes.number
};

// Mini score circle variant
export const MiniScoreCircle = ({ score, size = 60 }) => {
  const center = size / 2;
  const radius = center - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    if (score >= 50) return '#3b82f6';
    return '#ef4444';
  };
  
  return (
    <div className={styles.miniScoreCircle} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={4}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
        <text
          x={center}
          y={center + 4}
          textAnchor="middle"
          className={styles.miniScoreText}
        >
          {score}
        </text>
      </svg>
    </div>
  );
};

MiniScoreCircle.propTypes = {
  score: PropTypes.number.isRequired,
  size: PropTypes.number
};

// Score bar variant
export const ScoreBar = ({ score, label, showPercentage = true }) => {
  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    if (score >= 50) return '#3b82f6';
    return '#ef4444';
  };
  
  return (
    <div className={styles.scoreBar}>
      {label && <span className={styles.scoreBarLabel}>{label}</span>}
      <div className={styles.scoreBarTrack}>
        <div 
          className={styles.scoreBarFill}
          style={{ 
            width: `${score}%`,
            backgroundColor: getScoreColor(score)
          }}
        >
          {showPercentage && (
            <span className={styles.scoreBarPercentage}>{score}%</span>
          )}
        </div>
      </div>
    </div>
  );
};

ScoreBar.propTypes = {
  score: PropTypes.number.isRequired,
  label: PropTypes.string,
  showPercentage: PropTypes.bool
};

export default ScoreCircle;