import React, { useState, useEffect } from 'react';
import { Key, Shield, AlertCircle, CheckCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import styles from './Settings.module.css';

const ApiSettings = () => {
  const [settings, setSettings] = useState({
    google: {
      searchConsoleApiKey: '',
      analyticsApiKey: '',
      analyticsViewId: '',
      pagespeedApiKey: '',
      oauthClientId: '',
      oauthClientSecret: ''
    },
    shopify: {
      shopDomain: '',
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      webhookSecret: ''
    },
    notifications: {
      slackWebhook: '',
      emailApiKey: '',
      senderEmail: ''
    }
  });

  const [showSecrets, setShowSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingApi, setTestingApi] = useState({});
  const [testResults, setTestResults] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/api', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/settings/api', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const testApiConnection = async (apiType) => {
    setTestingApi({ [apiType]: true });
    setTestResults({ ...testResults, [apiType]: null });

    try {
      const response = await fetch(`/api/settings/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ apiType, settings: settings[apiType.split('-')[0]] })
      });

      const result = await response.json();
      setTestResults({ ...testResults, [apiType]: result });
    } catch (error) {
      setTestResults({ 
        ...testResults, 
        [apiType]: { success: false, message: 'Connection test failed' }
      });
    } finally {
      setTestingApi({ [apiType]: false });
    }
  };

  const toggleSecretVisibility = (field) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'info', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <h1>API Settings</h1>
        <p className={styles.headerDescription}>
          Configure your API integrations for Google services, Shopify, and notifications
        </p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'success' && <CheckCircle className={styles.messageIcon} />}
          {message.type === 'error' && <AlertCircle className={styles.messageIcon} />}
          {message.text}
        </div>
      )}

      {/* Google APIs Section */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2>Google APIs</h2>
          <a 
            href="https://console.cloud.google.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            Google Cloud Console <ExternalLink className={styles.linkIcon} />
          </a>
        </div>

        <div className={styles.settingsGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="searchConsoleApiKey">Search Console API Key</label>
            <div className={styles.inputWrapper}>
              <Key className={styles.inputIcon} />
              <input
                id="searchConsoleApiKey"
                type={showSecrets['searchConsoleApiKey'] ? 'text' : 'password'}
                value={settings.google.searchConsoleApiKey}
                onChange={(e) => handleChange('google', 'searchConsoleApiKey', e.target.value)}
                placeholder="Enter your Search Console API key"
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => toggleSecretVisibility('searchConsoleApiKey')}
              >
                {showSecrets['searchConsoleApiKey'] ? <EyeOff /> : <Eye />}
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => copyToClipboard(settings.google.searchConsoleApiKey)}
              >
                <Copy />
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="analyticsApiKey">Analytics API Key</label>
            <div className={styles.inputWrapper}>
              <Key className={styles.inputIcon} />
              <input
                id="analyticsApiKey"
                type={showSecrets['analyticsApiKey'] ? 'text' : 'password'}
                value={settings.google.analyticsApiKey}
                onChange={(e) => handleChange('google', 'analyticsApiKey', e.target.value)}
                placeholder="Enter your Analytics API key"
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => toggleSecretVisibility('analyticsApiKey')}
              >
                {showSecrets['analyticsApiKey'] ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="analyticsViewId">Analytics View ID</label>
            <input
              id="analyticsViewId"
              type="text"
              value={settings.google.analyticsViewId}
              onChange={(e) => handleChange('google', 'analyticsViewId', e.target.value)}
              placeholder="e.g., 123456789"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="pagespeedApiKey">PageSpeed API Key</label>
            <div className={styles.inputWrapper}>
              <Key className={styles.inputIcon} />
              <input
                id="pagespeedApiKey"
                type={showSecrets['pagespeedApiKey'] ? 'text' : 'password'}
                value={settings.google.pagespeedApiKey}
                onChange={(e) => handleChange('google', 'pagespeedApiKey', e.target.value)}
                placeholder="Enter your PageSpeed API key"
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => toggleSecretVisibility('pagespeedApiKey')}
              >
                {showSecrets['pagespeedApiKey'] ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.testSection}>
          <button
            className={styles.testButton}
            onClick={() => testApiConnection('google-apis')}
            disabled={testingApi['google-apis']}
          >
            {testingApi['google-apis'] ? 'Testing...' : 'Test Google APIs Connection'}
          </button>
          {testResults['google-apis'] && (
            <div className={`${styles.testResult} ${testResults['google-apis'].success ? styles.success : styles.error}`}>
              {testResults['google-apis'].message}
            </div>
          )}
        </div>
      </div>

      {/* Shopify API Section */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2>Shopify API</h2>
          <a 
            href="https://partners.shopify.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            Shopify Partners <ExternalLink className={styles.linkIcon} />
          </a>
        </div>

        <div className={styles.settingsGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="shopDomain">Shop Domain</label>
            <input
              id="shopDomain"
              type="text"
              value={settings.shopify.shopDomain}
              onChange={(e) => handleChange('shopify', 'shopDomain', e.target.value)}
              placeholder="yourshop.myshopify.com"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="shopifyApiKey">API Key</label>
            <div className={styles.inputWrapper}>
              <Key className={styles.inputIcon} />
              <input
                id="shopifyApiKey"
                type={showSecrets['shopifyApiKey'] ? 'text' : 'password'}
                value={settings.shopify.apiKey}
                onChange={(e) => handleChange('shopify', 'apiKey', e.target.value)}
                placeholder="Enter your Shopify API key"
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => toggleSecretVisibility('shopifyApiKey')}
              >
                {showSecrets['shopifyApiKey'] ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="shopifyApiSecret">API Secret</label>
            <div className={styles.inputWrapper}>
              <Shield className={styles.inputIcon} />
              <input
                id="shopifyApiSecret"
                type={showSecrets['shopifyApiSecret'] ? 'text' : 'password'}
                value={settings.shopify.apiSecret}
                onChange={(e) => handleChange('shopify', 'apiSecret', e.target.value)}
                placeholder="Enter your Shopify API secret"
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => toggleSecretVisibility('shopifyApiSecret')}
              >
                {showSecrets['shopifyApiSecret'] ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="shopifyAccessToken">Access Token</label>
            <div className={styles.inputWrapper}>
              <Key className={styles.inputIcon} />
              <input
                id="shopifyAccessToken"
                type={showSecrets['shopifyAccessToken'] ? 'text' : 'password'}
                value={settings.shopify.accessToken}
                onChange={(e) => handleChange('shopify', 'accessToken', e.target.value)}
                placeholder="Enter your Shopify access token"
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => toggleSecretVisibility('shopifyAccessToken')}
              >
                {showSecrets['shopifyAccessToken'] ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.testSection}>
          <button
            className={styles.testButton}
            onClick={() => testApiConnection('shopify-api')}
            disabled={testingApi['shopify-api']}
          >
            {testingApi['shopify-api'] ? 'Testing...' : 'Test Shopify Connection'}
          </button>
          {testResults['shopify-api'] && (
            <div className={`${styles.testResult} ${testResults['shopify-api'].success ? styles.success : styles.error}`}>
              {testResults['shopify-api'].message}
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
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};

export default ApiSettings;