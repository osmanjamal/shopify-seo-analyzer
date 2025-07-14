import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, AlertTriangle, CheckCircle, Clock, Volume2, VolumeX, Send } from 'lucide-react';
import styles from './Settings.module.css';

const NotificationSettings = () => {
  const [notifications, setNotifications] = useState({
    email: {
      enabled: true,
      recipients: [],
      newRecipient: '',
      frequency: 'immediate',
      types: {
        technicalIssues: true,
        keywordChanges: true,
        performanceAlerts: true,
        weeklyReports: true,
        monthlyReports: true,
        competitorAlerts: false
      }
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '',
      mentions: '@channel',
      types: {
        technicalIssues: true,
        keywordChanges: true,
        performanceAlerts: true,
        dailySummary: false,
        competitorAlerts: false
      }
    },
    alerts: {
      performanceThreshold: {
        enabled: true,
        scoreBelow: 70,
        trafficDrop: 20,
        keywordDrop: 5
      },
      technicalIssues: {
        enabled: true,
        criticalOnly: false,
        maxAlerts: 10
      },
      schedule: {
        quietHours: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York'
      }
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ email: false, slack: false });
  const [message, setMessage] = useState({ type: '', text: '' });

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch('/api/settings/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load notification settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(notifications)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save notification settings' });
    } finally {
      setSaving(false);
    }
  };

  const addEmailRecipient = () => {
    const email = notifications.email.newRecipient.trim();
    if (email && email.includes('@')) {
      setNotifications(prev => ({
        ...prev,
        email: {
          ...prev.email,
          recipients: [...prev.email.recipients, email],
          newRecipient: ''
        }
      }));
    }
  };

  const removeEmailRecipient = (email) => {
    setNotifications(prev => ({
      ...prev,
      email: {
        ...prev.email,
        recipients: prev.email.recipients.filter(r => r !== email)
      }
    }));
  };

  const testNotification = async (type) => {
    setTesting({ ...testing, [type]: true });
    
    try {
      const response = await fetch('/api/settings/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type, settings: notifications[type] })
      });

      if (!response.ok) {
        throw new Error('Test failed');
      }

      setMessage({ type: 'success', text: `Test ${type} notification sent!` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to send test ${type} notification` });
    } finally {
      setTesting({ ...testing, [type]: false });
    }
  };

  const handleToggle = (section, subsection, field) => {
    if (subsection) {
      setNotifications(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [field]: !prev[section][subsection][field]
          }
        }
      }));
    } else {
      setNotifications(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: !prev[section][field]
        }
      }));
    }
  };

  const handleChange = (section, field, value, subsection = null) => {
    if (subsection) {
      setNotifications(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [field]: value
          }
        }
      }));
    } else {
      setNotifications(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading notification settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <h1>Notification Settings</h1>
        <p className={styles.headerDescription}>
          Configure how and when you receive alerts about your SEO performance
        </p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'success' && <CheckCircle className={styles.messageIcon} />}
          {message.type === 'error' && <AlertTriangle className={styles.messageIcon} />}
          {message.text}
        </div>
      )}

      {/* Email Notifications */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><Mail className={styles.sectionIcon} /> Email Notifications</h2>
          <div className={styles.toggleSwitch}>
            <input
              type="checkbox"
              id="emailEnabled"
              checked={notifications.email.enabled}
              onChange={() => handleToggle('email', null, 'enabled')}
            />
            <label htmlFor="emailEnabled"></label>
          </div>
        </div>

        {notifications.email.enabled && (
          <>
            <div className={styles.subsection}>
              <h3>Recipients</h3>
              <div className={styles.recipientsList}>
                {notifications.email.recipients.map((email, index) => (
                  <div key={index} className={styles.recipientTag}>
                    <span>{email}</span>
                    <button 
                      onClick={() => removeEmailRecipient(email)}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.addRecipient}>
                <input
                  type="email"
                  placeholder="Add email recipient"
                  value={notifications.email.newRecipient}
                  onChange={(e) => handleChange('email', 'newRecipient', e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                />
                <button onClick={addEmailRecipient} className={styles.addButton}>
                  Add
                </button>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3>Frequency</h3>
              <select
                value={notifications.email.frequency}
                onChange={(e) => handleChange('email', 'frequency', e.target.value)}
                className={styles.select}
              >
                <option value="immediate">Immediate</option>
                <option value="hourly">Hourly Digest</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Summary</option>
              </select>
            </div>

            <div className={styles.subsection}>
              <h3>Notification Types</h3>
              <div className={styles.checkboxGroup}>
                {Object.entries(notifications.email.types).map(([type, enabled]) => (
                  <label key={type} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggle('email', 'types', type)}
                    />
                    <span>{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              className={styles.testButton}
              onClick={() => testNotification('email')}
              disabled={testing.email || notifications.email.recipients.length === 0}
            >
              <Send className={styles.buttonIcon} />
              {testing.email ? 'Sending...' : 'Send Test Email'}
            </button>
          </>
        )}
      </div>

      {/* Slack Notifications */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><MessageSquare className={styles.sectionIcon} /> Slack Notifications</h2>
          <div className={styles.toggleSwitch}>
            <input
              type="checkbox"
              id="slackEnabled"
              checked={notifications.slack.enabled}
              onChange={() => handleToggle('slack', null, 'enabled')}
            />
            <label htmlFor="slackEnabled"></label>
          </div>
        </div>

        {notifications.slack.enabled && (
          <>
            <div className={styles.inputGroup}>
              <label>Webhook URL</label>
              <input
                type="text"
                value={notifications.slack.webhookUrl}
                onChange={(e) => handleChange('slack', 'webhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Channel</label>
              <input
                type="text"
                value={notifications.slack.channel}
                onChange={(e) => handleChange('slack', 'channel', e.target.value)}
                placeholder="#seo-alerts"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Mentions</label>
              <select
                value={notifications.slack.mentions}
                onChange={(e) => handleChange('slack', 'mentions', e.target.value)}
                className={styles.select}
              >
                <option value="">No mentions</option>
                <option value="@here">@here</option>
                <option value="@channel">@channel</option>
              </select>
            </div>

            <div className={styles.subsection}>
              <h3>Notification Types</h3>
              <div className={styles.checkboxGroup}>
                {Object.entries(notifications.slack.types).map(([type, enabled]) => (
                  <label key={type} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggle('slack', 'types', type)}
                    />
                    <span>{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              className={styles.testButton}
              onClick={() => testNotification('slack')}
              disabled={testing.slack || !notifications.slack.webhookUrl}
            >
              <Send className={styles.buttonIcon} />
              {testing.slack ? 'Sending...' : 'Send Test Message'}
            </button>
          </>
        )}
      </div>

      {/* Alert Settings */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><AlertTriangle className={styles.sectionIcon} /> Alert Thresholds</h2>
        </div>

        <div className={styles.subsection}>
          <h3>Performance Alerts</h3>
          <div className={styles.thresholdGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={notifications.alerts.performanceThreshold.enabled}
                onChange={() => handleToggle('alerts', 'performanceThreshold', 'enabled')}
              />
              <span>Enable performance alerts</span>
            </label>
            
            {notifications.alerts.performanceThreshold.enabled && (
              <>
                <div className={styles.thresholdInput}>
                  <label>Alert when SEO score falls below</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={notifications.alerts.performanceThreshold.scoreBelow}
                    onChange={(e) => handleChange('alerts', 'scoreBelow', parseInt(e.target.value), 'performanceThreshold')}
                  />
                  <span>%</span>
                </div>

                <div className={styles.thresholdInput}>
                  <label>Alert on traffic drop of</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={notifications.alerts.performanceThreshold.trafficDrop}
                    onChange={(e) => handleChange('alerts', 'trafficDrop', parseInt(e.target.value), 'performanceThreshold')}
                  />
                  <span>% or more</span>
                </div>

                <div className={styles.thresholdInput}>
                  <label>Alert when keyword positions drop by</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={notifications.alerts.performanceThreshold.keywordDrop}
                    onChange={(e) => handleChange('alerts', 'keywordDrop', parseInt(e.target.value), 'performanceThreshold')}
                  />
                  <span>positions</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Quiet Hours</h3>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notifications.alerts.schedule.quietHours}
              onChange={() => handleToggle('alerts', 'schedule', 'quietHours')}
            />
            <span>Enable quiet hours (no notifications during specified time)</span>
          </label>

          {notifications.alerts.schedule.quietHours && (
            <div className={styles.quietHoursSettings}>
              <div className={styles.timeInputGroup}>
                <label>From</label>
                <input
                  type="time"
                  value={notifications.alerts.schedule.startTime}
                  onChange={(e) => handleChange('alerts', 'startTime', e.target.value, 'schedule')}
                />
              </div>
              <div className={styles.timeInputGroup}>
                <label>To</label>
                <input
                  type="time"
                  value={notifications.alerts.schedule.endTime}
                  onChange={(e) => handleChange('alerts', 'endTime', e.target.value, 'schedule')}
                />
              </div>
              <div className={styles.timeInputGroup}>
                <label>Timezone</label>
                <select
                  value={notifications.alerts.schedule.timezone}
                  onChange={(e) => handleChange('alerts', 'timezone', e.target.value, 'schedule')}
                  className={styles.select}
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.actionButtons}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;