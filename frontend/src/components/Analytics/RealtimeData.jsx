import React, { useState, useEffect } from 'react';
import { Activity, Users, Eye, TrendingUp, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import styles from './Analytics.module.css';

const RealtimeData = ({ websiteId }) => {
  const [realtimeData, setRealtimeData] = useState({
    activeUsers: 0,
    pageViews: 0,
    sessions: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    newUsers: 0,
    usersByDevice: {
      desktop: 0,
      mobile: 0,
      tablet: 0
    },
    topPages: [],
    usersByCountry: [],
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let intervalId;
    
    const fetchRealtimeData = async () => {
      try {
        const response = await fetch(`/api/analytics/realtime/${websiteId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch realtime data');
        }

        const data = await response.json();
        setRealtimeData({
          ...data,
          lastUpdated: new Date()
        });
        setError(null);
        setIsConnected(true);
      } catch (err) {
        setError(err.message);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchRealtimeData();

    // Set up polling every 5 seconds
    intervalId = setInterval(fetchRealtimeData, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [websiteId]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'desktop':
        return <Monitor className={styles.deviceIcon} />;
      case 'mobile':
        return <Smartphone className={styles.deviceIcon} />;
      case 'tablet':
        return <Tablet className={styles.deviceIcon} />;
      default:
        return <Monitor className={styles.deviceIcon} />;
    }
  };

  if (loading && !realtimeData.lastUpdated) {
    return (
      <div className={styles.realtimeContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Connecting to real-time analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.realtimeContainer}>
      <div className={styles.realtimeHeader}>
        <div className={styles.titleSection}>
          <h2>Real-Time Analytics</h2>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
            <span>{isConnected ? 'Live' : 'Disconnected'}</span>
          </div>
        </div>
        {realtimeData.lastUpdated && (
          <div className={styles.lastUpdated}>
            Last updated: {realtimeData.lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>Error loading real-time data: {error}</p>
        </div>
      )}

      <div className={styles.realtimeGrid}>
        {/* Active Users Card */}
        <div className={`${styles.metricCard} ${styles.activeUsersCard}`}>
          <div className={styles.metricHeader}>
            <Users className={styles.metricIcon} />
            <h3>Active Users</h3>
          </div>
          <div className={styles.metricValue}>
            <span className={styles.bigNumber}>{realtimeData.activeUsers}</span>
            <span className={styles.metricLabel}>Right now</span>
          </div>
          <div className={styles.metricTrend}>
            <TrendingUp className={styles.trendIcon} />
            <span>Live on your site</span>
          </div>
        </div>

        {/* Page Views Card */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Eye className={styles.metricIcon} />
            <h3>Page Views</h3>
          </div>
          <div className={styles.metricValue}>
            <span className={styles.number}>{realtimeData.pageViews}</span>
            <span className={styles.metricLabel}>Last 30 minutes</span>
          </div>
        </div>

        {/* Sessions Card */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Activity className={styles.metricIcon} />
            <h3>Active Sessions</h3>
          </div>
          <div className={styles.metricValue}>
            <span className={styles.number}>{realtimeData.sessions}</span>
            <span className={styles.metricLabel}>Current sessions</span>
          </div>
        </div>

        {/* Average Session Duration */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Activity className={styles.metricIcon} />
            <h3>Avg. Session Duration</h3>
          </div>
          <div className={styles.metricValue}>
            <span className={styles.number}>{formatDuration(realtimeData.avgSessionDuration)}</span>
            <span className={styles.metricLabel}>Per session</span>
          </div>
        </div>
      </div>

      <div className={styles.realtimeDetails}>
        {/* Device Distribution */}
        <div className={styles.detailCard}>
          <h3>Users by Device</h3>
          <div className={styles.deviceList}>
            {Object.entries(realtimeData.usersByDevice).map(([device, count]) => (
              <div key={device} className={styles.deviceItem}>
                {getDeviceIcon(device)}
                <span className={styles.deviceName}>{device.charAt(0).toUpperCase() + device.slice(1)}</span>
                <span className={styles.deviceCount}>{count}</span>
                <div className={styles.deviceBar}>
                  <div 
                    className={styles.deviceBarFill}
                    style={{ 
                      width: `${(count / realtimeData.activeUsers) * 100 || 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div className={styles.detailCard}>
          <h3>Top Active Pages</h3>
          <div className={styles.pagesList}>
            {realtimeData.topPages.length > 0 ? (
              realtimeData.topPages.map((page, index) => (
                <div key={index} className={styles.pageItem}>
                  <span className={styles.pageRank}>{index + 1}</span>
                  <div className={styles.pageInfo}>
                    <span className={styles.pagePath}>{page.path}</span>
                    <span className={styles.pageTitle}>{page.title}</span>
                  </div>
                  <span className={styles.pageUsers}>{page.activeUsers} users</span>
                </div>
              ))
            ) : (
              <p className={styles.noData}>No active pages at the moment</p>
            )}
          </div>
        </div>

        {/* Users by Country */}
        <div className={styles.detailCard}>
          <h3>Users by Location</h3>
          <div className={styles.locationList}>
            {realtimeData.usersByCountry.length > 0 ? (
              realtimeData.usersByCountry.map((country, index) => (
                <div key={index} className={styles.locationItem}>
                  <Globe className={styles.locationIcon} />
                  <span className={styles.locationName}>{country.name}</span>
                  <span className={styles.locationCount}>{country.users} users</span>
                  <div className={styles.locationBar}>
                    <div 
                      className={styles.locationBarFill}
                      style={{ 
                        width: `${(country.users / realtimeData.activeUsers) * 100 || 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.noData}>No location data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className={styles.activityFeed}>
        <h3>Live Activity Feed</h3>
        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>Just now</span>
            <span className={styles.activityText}>New visitor from United States</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>2s ago</span>
            <span className={styles.activityText}>Page view: /products/seo-tool</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>5s ago</span>
            <span className={styles.activityText}>New session started (Mobile)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeData;