import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Clock, Filter, HardDrive, Cloud, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './Settings.module.css';

const ExportSettings = () => {
  const [exportSettings, setExportSettings] = useState({
    formats: {
      pdf: true,
      excel: true,
      csv: true,
      json: false
    },
    schedule: {
      enabled: false,
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      dayOfMonth: 1,
      time: '09:00',
      timezone: 'America/New_York'
    },
    content: {
      overview: true,
      keywords: true,
      technical: true,
      analytics: true,
      competitors: false,
      recommendations: true,
      historicalData: true,
      dateRange: 'last30days'
    },
    delivery: {
      method: 'email',
      emailRecipients: [],
      cloudStorage: {
        provider: 'none',
        path: '/seo-reports/',
        credentials: {}
      }
    },
    retention: {
      enabled: true,
      days: 90,
      autoDelete: false
    },
    branding: {
      includelogo: true,
      customHeader: '',
      customFooter: '',
      primaryColor: '#5b47fb'
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newRecipient, setNewRecipient] = useState('');
  const [exportHistory, setExportHistory] = useState([]);

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' }
  ];

  const dateRangeOptions = [
    { value: 'last7days', label: 'Last 7 days' },
    { value: 'last30days', label: 'Last 30 days' },
    { value: 'last90days', label: 'Last 90 days' },
    { value: 'lastYear', label: 'Last year' },
    { value: 'allTime', label: 'All time' }
  ];

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  useEffect(() => {
    fetchExportSettings();
    fetchExportHistory();
  }, []);

  const fetchExportSettings = async () => {
    try {
      const response = await fetch('/api/settings/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch export settings');
      }

      const data = await response.json();
      setExportSettings(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load export settings' });
    } finally {
      setLoading(false);
    }
  };

  const fetchExportHistory = async () => {
    try {
      const response = await fetch('/api/exports/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch export history');
      }

      const data = await response.json();
      setExportHistory(data);
    } catch (error) {
      console.error('Failed to load export history');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/settings/export', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(exportSettings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Export settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save export settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportNow = async () => {
    setExporting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/exports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          formats: exportSettings.formats,
          content: exportSettings.content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seo-report-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'Export generated successfully!' });
      fetchExportHistory();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate export' });
    } finally {
      setExporting(false);
    }
  };

  const handleToggle = (section, field) => {
    setExportSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field]
      }
    }));
  };

  const handleChange = (section, field, value) => {
    setExportSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const addEmailRecipient = () => {
    if (newRecipient && newRecipient.includes('@')) {
      setExportSettings(prev => ({
        ...prev,
        delivery: {
          ...prev.delivery,
          emailRecipients: [...prev.delivery.emailRecipients, newRecipient]
        }
      }));
      setNewRecipient('');
    }
  };

  const removeEmailRecipient = (email) => {
    setExportSettings(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        emailRecipients: prev.delivery.emailRecipients.filter(r => r !== email)
      }
    }));
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading export settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <h1>Export Settings</h1>
        <p className={styles.headerDescription}>
          Configure automated reports and data exports
        </p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'success' && <CheckCircle className={styles.messageIcon} />}
          {message.type === 'error' && <AlertCircle className={styles.messageIcon} />}
          {message.text}
        </div>
      )}

      {/* Export Formats */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><FileText className={styles.sectionIcon} /> Export Formats</h2>
        </div>
        
        <div className={styles.checkboxGroup}>
          {Object.entries(exportSettings.formats).map(([format, enabled]) => (
            <label key={format} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => handleToggle('formats', format)}
              />
              <span>{format.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Schedule Settings */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><Calendar className={styles.sectionIcon} /> Scheduled Exports</h2>
          <div className={styles.toggleSwitch}>
            <input
              type="checkbox"
              id="scheduleEnabled"
              checked={exportSettings.schedule.enabled}
              onChange={() => handleToggle('schedule', 'enabled')}
            />
            <label htmlFor="scheduleEnabled"></label>
          </div>
        </div>

        {exportSettings.schedule.enabled && (
          <div className={styles.scheduleSettings}>
            <div className={styles.inputGroup}>
              <label>Frequency</label>
              <select
                value={exportSettings.schedule.frequency}
                onChange={(e) => handleChange('schedule', 'frequency', e.target.value)}
                className={styles.select}
              >
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {exportSettings.schedule.frequency === 'weekly' && (
              <div className={styles.inputGroup}>
                <label>Day of Week</label>
                <select
                  value={exportSettings.schedule.dayOfWeek}
                  onChange={(e) => handleChange('schedule', 'dayOfWeek', parseInt(e.target.value))}
                  className={styles.select}
                >
                  {daysOfWeek.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {exportSettings.schedule.frequency === 'monthly' && (
              <div className={styles.inputGroup}>
                <label>Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={exportSettings.schedule.dayOfMonth}
                  onChange={(e) => handleChange('schedule', 'dayOfMonth', parseInt(e.target.value))}
                />
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>Time</label>
              <input
                type="time"
                value={exportSettings.schedule.time}
                onChange={(e) => handleChange('schedule', 'time', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Timezone</label>
              <select
                value={exportSettings.schedule.timezone}
                onChange={(e) => handleChange('schedule', 'timezone', e.target.value)}
                className={styles.select}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content Settings */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><Filter className={styles.sectionIcon} /> Export Content</h2>
        </div>

        <div className={styles.subsection}>
          <h3>Include in Export</h3>
          <div className={styles.checkboxGroup}>
            {Object.entries(exportSettings.content).map(([key, enabled]) => {
              if (key === 'dateRange') return null;
              return (
                <label key={key} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToggle('content', key)}
                  />
                  <span>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>Date Range</label>
          <select
            value={exportSettings.content.dateRange}
            onChange={(e) => handleChange('content', 'dateRange', e.target.value)}
            className={styles.select}
          >
            {dateRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delivery Settings */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><Cloud className={styles.sectionIcon} /> Delivery Method</h2>
        </div>

        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="deliveryMethod"
              value="email"
              checked={exportSettings.delivery.method === 'email'}
              onChange={(e) => handleChange('delivery', 'method', e.target.value)}
            />
            <span>Email</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="deliveryMethod"
              value="download"
              checked={exportSettings.delivery.method === 'download'}
              onChange={(e) => handleChange('delivery', 'method', e.target.value)}
            />
            <span>Direct Download</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="deliveryMethod"
              value="cloud"
              checked={exportSettings.delivery.method === 'cloud'}
              onChange={(e) => handleChange('delivery', 'method', e.target.value)}
            />
            <span>Cloud Storage</span>
          </label>
        </div>

        {exportSettings.delivery.method === 'email' && (
          <div className={styles.subsection}>
            <h3>Email Recipients</h3>
            <div className={styles.recipientsList}>
              {exportSettings.delivery.emailRecipients.map((email, index) => (
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
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
              />
              <button onClick={addEmailRecipient} className={styles.addButton}>
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Retention */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><HardDrive className={styles.sectionIcon} /> Data Retention</h2>
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={exportSettings.retention.enabled}
            onChange={() => handleToggle('retention', 'enabled')}
          />
          <span>Enable automatic data retention policy</span>
        </label>

        {exportSettings.retention.enabled && (
          <div className={styles.retentionSettings}>
            <div className={styles.inputGroup}>
              <label>Keep exports for</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={exportSettings.retention.days}
                  onChange={(e) => handleChange('retention', 'days', parseInt(e.target.value))}
                />
                <span>days</span>
              </div>
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={exportSettings.retention.autoDelete}
                onChange={() => handleToggle('retention', 'autoDelete')}
              />
              <span>Automatically delete old exports</span>
            </label>
          </div>
        )}
      </div>

      {/* Recent Exports */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2><Clock className={styles.sectionIcon} /> Recent Exports</h2>
        </div>

        <div className={styles.exportHistory}>
          {exportHistory.length > 0 ? (
            exportHistory.slice(0, 5).map((export_, index) => (
              <div key={index} className={styles.exportItem}>
                <div className={styles.exportInfo}>
                  <span className={styles.exportDate}>
                    {new Date(export_.createdAt).toLocaleDateString()}
                  </span>
                  <span className={styles.exportSize}>{export_.size}</span>
                </div>
                <a href={export_.url} download className={styles.downloadLink}>
                  <Download className={styles.downloadIcon} />
                  Download
                </a>
              </div>
            ))
          ) : (
            <p className={styles.noExports}>No recent exports</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.exportNowButton}
          onClick={handleExportNow}
          disabled={exporting}
        >
          <Download className={styles.buttonIcon} />
          {exporting ? 'Generating Export...' : 'Export Now'}
        </button>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Export Settings'}
        </button>
      </div>
    </div>
  );
};

export default ExportSettings;