import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import Loading from '../Common/Loading';
import { formatUrl, formatDate } from '../../utils/formatters';
import { 
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import styles from './Technical.module.css';

// Schema type information
const schemaTypes = {
  Article: { icon: DocumentTextIcon, description: 'News, blog posts, or articles' },
  Product: { icon: DocumentTextIcon, description: 'E-commerce product information' },
  Organization: { icon: DocumentTextIcon, description: 'Company or organization details' },
  Person: { icon: DocumentTextIcon, description: 'Individual person information' },
  WebSite: { icon: DocumentTextIcon, description: 'Website metadata' },
  BreadcrumbList: { icon: DocumentTextIcon, description: 'Navigation breadcrumbs' },
  FAQPage: { icon: DocumentTextIcon, description: 'Frequently asked questions' },
  HowTo: { icon: DocumentTextIcon, description: 'Step-by-step instructions' },
  Recipe: { icon: DocumentTextIcon, description: 'Cooking recipes' },
  Event: { icon: DocumentTextIcon, description: 'Events and happenings' },
  LocalBusiness: { icon: DocumentTextIcon, description: 'Local business information' },
  Review: { icon: DocumentTextIcon, description: 'Reviews and ratings' },
  VideoObject: { icon: DocumentTextIcon, description: 'Video content' }
};

const StructuredData = ({ onClose }) => {
  const { showToast, selectedWebsite } = useApp();
  const [url, setUrl] = useState(selectedWebsite?.domain ? `https://${selectedWebsite.domain}` : '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedSchemas, setExpandedSchemas] = useState(new Set());
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [activeTab, setActiveTab] = useState('found'); // 'found', 'errors', 'recommendations'
  
  // Analyze structured data
  const analyzeStructuredData = async () => {
    if (!url) {
      showToast('Please enter a URL', 'error');
      return;
    }
    
    setIsAnalyzing(true);
    setResults(null);
    
    try {
      const response = await api.post('/technical/structured-data', { url });
      
      if (response.data) {
        setResults(response.data);
        showToast('Structured data analysis completed!', 'success');
      }
    } catch (error) {
      showToast('Failed to analyze structured data', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Toggle schema expansion
  const toggleSchemaExpansion = (index) => {
    setExpandedSchemas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  // Copy JSON to clipboard
  const copyToClipboard = (data) => {
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy to clipboard', 'error');
    });
  };
  
  // Run analysis on mount if URL is provided
  useEffect(() => {
    if (url) {
      analyzeStructuredData();
    }
  }, []);
  
  // Render JSON tree
  const renderJsonTree = (data, level = 0) => {
    if (data === null) return <span className={styles.jsonNull}>null</span>;
    if (typeof data === 'boolean') return <span className={styles.jsonBoolean}>{data.toString()}</span>;
    if (typeof data === 'number') return <span className={styles.jsonNumber}>{data}</span>;
    if (typeof data === 'string') return <span className={styles.jsonString}>"{data}"</span>;
    
    if (Array.isArray(data)) {
      return (
        <span>
          [
          {data.map((item, index) => (
            <div key={index} style={{ marginLeft: level * 20 + 'px' }}>
              {renderJsonTree(item, level + 1)}
              {index < data.length - 1 && ','}
            </div>
          ))}
          ]
        </span>
      );
    }
    
    if (typeof data === 'object') {
      return (
        <span>
          {'{'}
          {Object.entries(data).map(([key, value], index, arr) => (
            <div key={key} style={{ marginLeft: level * 20 + 'px' }}>
              <span className={styles.jsonKey}>"{key}"</span>: {renderJsonTree(value, level + 1)}
              {index < arr.length - 1 && ','}
            </div>
          ))}
          {'}'}
        </span>
      );
    }
    
    return null;
  };
  
  return (
    <div className={styles.modal}>
      <div className={styles.modalOverlay} onClick={onClose} />
      <div className={styles.modalContent} style={{ maxWidth: '1000px' }}>
        <div className={styles.modalHeader}>
          <h3>Structured Data Testing Tool</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <XMarkIcon className={styles.closeIcon} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* URL Input */}
          <div className={styles.structuredDataControls}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to test"
              className={styles.input}
              disabled={isAnalyzing}
            />
            <button
              onClick={analyzeStructuredData}
              className={styles.analyzeButton}
              disabled={isAnalyzing || !url}
            >
              <ArrowPathIcon className={`${styles.buttonIcon} ${isAnalyzing ? styles.spinning : ''}`} />
              {isAnalyzing ? 'Testing...' : 'Test URL'}
            </button>
          </div>
          
          {/* Results */}
          {isAnalyzing ? (
            <div className={styles.loadingContainer}>
              <Loading message="Analyzing structured data..." />
            </div>
          ) : results ? (
            <>
              {/* Summary */}
              <div className={styles.structuredDataSummary}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>
                    {results.errors.length === 0 ? (
                      <CheckCircleIcon className={styles.successIcon} />
                    ) : (
                      <ExclamationTriangleIcon className={styles.warningIcon} />
                    )}
                  </div>
                  <div className={styles.summaryContent}>
                    <h4>{results.schemas.length} Schema{results.schemas.length !== 1 ? 's' : ''} Found</h4>
                    <p>
                      {results.errors.length === 0 
                        ? 'No errors detected' 
                        : `${results.errors.length} error${results.errors.length !== 1 ? 's' : ''} found`}
                    </p>
                  </div>
                </div>
                
                {/* Schema Types Overview */}
                <div className={styles.schemaTypesOverview}>
                  {results.schemaTypes.map((type, index) => (
                    <div key={index} className={styles.schemaTypeBadge}>
                      <CodeBracketIcon className={styles.schemaTypeIcon} />
                      <span>{type}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Tabs */}
              <div className={styles.tabs}>
                <button
                  onClick={() => setActiveTab('found')}
                  className={`${styles.tab} ${activeTab === 'found' ? styles.active : ''}`}
                >
                  Detected Items ({results.schemas.length})
                </button>
                <button
                  onClick={() => setActiveTab('errors')}
                  className={`${styles.tab} ${activeTab === 'errors' ? styles.active : ''}`}
                >
                  Errors ({results.errors.length})
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`${styles.tab} ${activeTab === 'recommendations' ? styles.active : ''}`}
                >
                  Recommendations
                </button>
              </div>
              
              {/* Tab Content */}
              <div className={styles.tabContent}>
                {/* Found Schemas */}
                {activeTab === 'found' && (
                  <div className={styles.schemasSection}>
                    {results.schemas.length === 0 ? (
                      <div className={styles.emptySchemas}>
                        <DocumentTextIcon className={styles.emptyIcon} />
                        <p>No structured data found on this page</p>
                      </div>
                    ) : (
                      results.schemas.map((schema, index) => {
                        const isExpanded = expandedSchemas.has(index);
                        const schemaInfo = schemaTypes[schema.type] || {};
                        
                        return (
                          <div key={index} className={styles.schemaCard}>
                            <div 
                              className={styles.schemaHeader}
                              onClick={() => toggleSchemaExpansion(index)}
                            >
                              <div className={styles.schemaInfo}>
                                <CodeBracketIcon className={styles.schemaIcon} />
                                <div>
                                  <h5>{schema.type}</h5>
                                  {schemaInfo.description && (
                                    <p className={styles.schemaDescription}>
                                      {schemaInfo.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className={styles.schemaActions}>
                                {schema.valid ? (
                                  <span className={styles.validBadge}>
                                    <CheckCircleIcon className={styles.validIcon} />
                                    Valid
                                  </span>
                                ) : (
                                  <span className={styles.invalidBadge}>
                                    <XCircleIcon className={styles.invalidIcon} />
                                    Invalid
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronDownIcon className={styles.expandIcon} />
                                ) : (
                                  <ChevronRightIcon className={styles.expandIcon} />
                                )}
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className={styles.schemaContent}>
                                {/* Properties Summary */}
                                <div className={styles.propertiesSummary}>
                                  <h6>Properties</h6>
                                  <div className={styles.propertyList}>
                                    {Object.entries(schema.properties || {}).map(([key, value]) => (
                                      <div key={key} className={styles.propertyItem}>
                                        <span className={styles.propertyKey}>{key}:</span>
                                        <span className={styles.propertyValue}>
                                          {typeof value === 'object' ? JSON.stringify(value) : value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* JSON View */}
                                <div className={styles.jsonView}>
                                  <div className={styles.jsonHeader}>
                                    <h6>JSON-LD</h6>
                                    <button
                                      onClick={() => copyToClipboard(schema.data)}
                                      className={styles.copyButton}
                                    >
                                      <ClipboardDocumentIcon className={styles.copyIcon} />
                                      Copy
                                    </button>
                                  </div>
                                  <pre className={styles.jsonCode}>
                                    {renderJsonTree(schema.data)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                
                {/* Errors */}
                {activeTab === 'errors' && (
                  <div className={styles.errorsSection}>
                    {results.errors.length === 0 ? (
                      <div className={styles.noErrors}>
                        <CheckCircleIcon className={styles.successIcon} />
                        <h4>No Errors Found</h4>
                        <p>All structured data on this page is valid.</p>
                      </div>
                    ) : (
                      results.errors.map((error, index) => (
                        <div key={index} className={styles.errorCard}>
                          <div className={styles.errorHeader}>
                            <XCircleIcon className={styles.errorIcon} />
                            <h5>{error.type}</h5>
                          </div>
                          <p className={styles.errorMessage}>{error.message}</p>
                          {error.path && (
                            <div className={styles.errorPath}>
                              <span>Path:</span> {error.path}
                            </div>
                          )}
                          {error.value && (
                            <div className={styles.errorValue}>
                              <span>Value:</span> {JSON.stringify(error.value)}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                {/* Recommendations */}
                {activeTab === 'recommendations' && (
                  <div className={styles.recommendationsSection}>
                    <div className={styles.recommendationCard}>
                      <div className={styles.recommendationHeader}>
                        <InformationCircleIcon className={styles.infoIcon} />
                        <h5>Add Product Schema</h5>
                      </div>
                      <p>
                        Since this is an e-commerce site, consider adding Product schema to your product pages.
                        This helps search engines understand your products and can enable rich results.
                      </p>
                      <div className={styles.schemaExample}>
                        <h6>Example:</h6>
                        <pre>{`{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Product Name",
  "image": ["image1.jpg", "image2.jpg"],
  "description": "Product description",
  "sku": "12345",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}`}</pre>
                      </div>
                    </div>
                    
                    <div className={styles.recommendationCard}>
                      <div className={styles.recommendationHeader}>
                        <InformationCircleIcon className={styles.infoIcon} />
                        <h5>Implement BreadcrumbList</h5>
                      </div>
                      <p>
                        Add BreadcrumbList schema to help users understand page hierarchy and enable
                        breadcrumb rich results in search.
                      </p>
                    </div>
                    
                    <div className={styles.recommendationCard}>
                      <div className={styles.recommendationHeader}>
                        <InformationCircleIcon className={styles.infoIcon} />
                        <h5>Add Organization Schema</h5>
                      </div>
                      <p>
                        Include Organization schema on your homepage to provide search engines with
                        information about your business.
                      </p>
                    </div>
                    
                    <div className={styles.recommendationCard}>
                      <div className={styles.recommendationHeader}>
                        <InformationCircleIcon className={styles.infoIcon} />
                        <h5>Consider FAQ Schema</h5>
                      </div>
                      <p>
                        If you have FAQ content, implement FAQPage schema to potentially get FAQ
                        rich results in search.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyResults}>
              <DocumentTextIcon className={styles.emptyIcon} />
              <h3>Test Your Structured Data</h3>
              <p>Enter a URL above to validate structured data and get recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

StructuredData.propTypes = {
  onClose: PropTypes.func.isRequired
};

// Mock API call for demonstration
const api = {
  post: async (url, data) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock data
    return {
      data: {
        schemas: [
          {
            type: 'WebSite',
            valid: true,
            properties: {
              name: 'Example Store',
              url: 'https://example.com',
              potentialAction: 'SearchAction'
            },
            data: {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              'name': 'Example Store',
              'url': 'https://example.com',
              'potentialAction': {
                '@type': 'SearchAction',
                'target': 'https://example.com/search?q={search_term_string}',
                'query-input': 'required name=search_term_string'
              }
            }
          },
          {
            type: 'Organization',
            valid: true,
            properties: {
              name: 'Example Company',
              logo: 'https://example.com/logo.png',
              url: 'https://example.com'
            },
            data: {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              'name': 'Example Company',
              'url': 'https://example.com',
              'logo': 'https://example.com/logo.png',
              'sameAs': [
                'https://facebook.com/example',
                'https://twitter.com/example'
              ]
            }
          }
        ],
        schemaTypes: ['WebSite', 'Organization'],
        errors: [],
        warnings: []
      }
    };
  }
};

export default StructuredData;