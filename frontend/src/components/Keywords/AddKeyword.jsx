import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useData } from '../../context/DataContext';
import { useKeywordTracking } from '../../hooks/useKeywordTracking';
import { validateKeyword } from '../../utils/validators';
import { XMarkIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';
import styles from './Keywords.module.css';

const AddKeyword = ({ onClose, websiteId }) => {
  const { addKeyword } = useData();
  const { 
    keywordGroups, 
    getKeywordSuggestions, 
    bulkAddKeywords,
    createKeywordGroup 
  } = useKeywordTracking(websiteId);
  
  // State
  const [mode, setMode] = useState('single'); // 'single', 'bulk', 'suggestions'
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');
  const [groupId, setGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [seedKeyword, setSeedKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  
  // Get keyword suggestions
  const handleGetSuggestions = async () => {
    if (!seedKeyword.trim()) {
      setErrors({ seed: 'Please enter a seed keyword' });
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const results = await getKeywordSuggestions(seedKeyword, {
        limit: 20,
        includeRelated: true,
        includeQuestions: true
      });
      
      setSuggestions(results);
      setSelectedSuggestions([]);
    } catch (error) {
      setErrors({ general: 'Failed to get suggestions' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle suggestion selection
  const toggleSuggestion = (suggestion) => {
    setSelectedSuggestions(prev => {
      const isSelected = prev.some(s => s.keyword === suggestion.keyword);
      if (isSelected) {
        return prev.filter(s => s.keyword !== suggestion.keyword);
      } else {
        return [...prev, suggestion];
      }
    });
  };
  
  // Validate single keyword
  const validateSingle = () => {
    const newErrors = {};
    
    const keywordValidation = validateKeyword(keyword);
    if (!keywordValidation.isValid) {
      newErrors.keyword = keywordValidation.error;
    }
    
    if (url && !url.startsWith('http')) {
      newErrors.url = 'URL must start with http:// or https://';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Validate bulk keywords
  const validateBulk = () => {
    const newErrors = {};
    
    if (!bulkKeywords.trim()) {
      newErrors.bulk = 'Please enter at least one keyword';
      setErrors(newErrors);
      return false;
    }
    
    const keywords = bulkKeywords.split('\n').filter(k => k.trim());
    if (keywords.length === 0) {
      newErrors.bulk = 'Please enter at least one keyword';
    } else if (keywords.length > 100) {
      newErrors.bulk = 'Maximum 100 keywords at a time';
    }
    
    // Validate each keyword
    const invalidKeywords = [];
    keywords.forEach(k => {
      const validation = validateKeyword(k);
      if (!validation.isValid) {
        invalidKeywords.push(k);
      }
    });
    
    if (invalidKeywords.length > 0) {
      newErrors.bulk = `Invalid keywords: ${invalidKeywords.slice(0, 3).join(', ')}${invalidKeywords.length > 3 ? '...' : ''}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle single keyword submission
  const handleSingleSubmit = async () => {
    if (!validateSingle()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // Create new group if needed
      let finalGroupId = groupId;
      if (showNewGroupInput && newGroupName) {
        const result = await createKeywordGroup({ name: newGroupName });
        if (result.success) {
          finalGroupId = result.group.id;
        }
      }
      
      const result = await addKeyword({
        keyword: keyword.trim(),
        url: url.trim() || null,
        group_id: finalGroupId || null
      });
      
      if (result.success) {
        onClose();
      } else {
        setErrors({ general: result.error || 'Failed to add keyword' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to add keyword' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle bulk submission
  const handleBulkSubmit = async () => {
    if (!validateBulk()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const keywords = bulkKeywords
        .split('\n')
        .filter(k => k.trim())
        .map(k => ({
          keyword: k.trim(),
          group_id: groupId || null
        }));
      
      const result = await bulkAddKeywords(keywords);
      
      if (result.success) {
        onClose();
      } else {
        setErrors({ general: result.error || 'Failed to add keywords' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to add keywords' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle suggestions submission
  const handleSuggestionsSubmit = async () => {
    if (selectedSuggestions.length === 0) {
      setErrors({ suggestions: 'Please select at least one keyword' });
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const keywords = selectedSuggestions.map(s => ({
        keyword: s.keyword,
        search_volume: s.volume || null,
        difficulty: s.difficulty || null,
        group_id: groupId || null
      }));
      
      const result = await bulkAddKeywords(keywords);
      
      if (result.success) {
        onClose();
      } else {
        setErrors({ general: result.error || 'Failed to add keywords' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to add keywords' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission based on mode
  const handleSubmit = (e) => {
    e.preventDefault();
    
    switch (mode) {
      case 'single':
        handleSingleSubmit();
        break;
      case 'bulk':
        handleBulkSubmit();
        break;
      case 'suggestions':
        handleSuggestionsSubmit();
        break;
    }
  };
  
  return (
    <div className={styles.modal}>
      <div className={styles.modalOverlay} onClick={onClose} />
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Add Keywords</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <XMarkIcon className={styles.closeIcon} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {/* Mode Tabs */}
          <div className={styles.modeTabs}>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`${styles.modeTab} ${mode === 'single' ? styles.active : ''}`}
            >
              Single Keyword
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`${styles.modeTab} ${mode === 'bulk' ? styles.active : ''}`}
            >
              Bulk Add
            </button>
            <button
              type="button"
              onClick={() => setMode('suggestions')}
              className={`${styles.modeTab} ${mode === 'suggestions' ? styles.active : ''}`}
            >
              Get Suggestions
            </button>
          </div>
          
          {/* Single Keyword Mode */}
          {mode === 'single' && (
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <label htmlFor="keyword" className={styles.label}>
                  Keyword <span className={styles.required}>*</span>
                </label>
                <input
                  id="keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Enter keyword to track"
                  className={`${styles.input} ${errors.keyword ? styles.error : ''}`}
                  disabled={isLoading}
                />
                {errors.keyword && (
                  <span className={styles.errorMessage}>{errors.keyword}</span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="url" className={styles.label}>
                  Target URL (Optional)
                </label>
                <input
                  id="url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className={`${styles.input} ${errors.url ? styles.error : ''}`}
                  disabled={isLoading}
                />
                {errors.url && (
                  <span className={styles.errorMessage}>{errors.url}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Bulk Mode */}
          {mode === 'bulk' && (
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <label htmlFor="bulkKeywords" className={styles.label}>
                  Keywords (One per line) <span className={styles.required}>*</span>
                </label>
                <textarea
                  id="bulkKeywords"
                  value={bulkKeywords}
                  onChange={(e) => setBulkKeywords(e.target.value)}
                  placeholder="Enter keywords, one per line&#10;seo tools&#10;keyword research&#10;website optimization"
                  rows={8}
                  className={`${styles.textarea} ${errors.bulk ? styles.error : ''}`}
                  disabled={isLoading}
                />
                {errors.bulk && (
                  <span className={styles.errorMessage}>{errors.bulk}</span>
                )}
                <div className={styles.helpText}>
                  Enter up to 100 keywords, one per line
                </div>
              </div>
            </div>
          )}
          
          {/* Suggestions Mode */}
          {mode === 'suggestions' && (
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <label htmlFor="seedKeyword" className={styles.label}>
                  Seed Keyword
                </label>
                <div className={styles.inputGroup}>
                  <input
                    id="seedKeyword"
                    type="text"
                    value={seedKeyword}
                    onChange={(e) => setSeedKeyword(e.target.value)}
                    placeholder="Enter a seed keyword"
                    className={`${styles.input} ${errors.seed ? styles.error : ''}`}
                    disabled={isLoading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGetSuggestions();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGetSuggestions}
                    className={styles.suggestButton}
                    disabled={isLoading || !seedKeyword.trim()}
                  >
                    <SparklesIcon className={styles.buttonIcon} />
                    Get Suggestions
                  </button>
                </div>
                {errors.seed && (
                  <span className={styles.errorMessage}>{errors.seed}</span>
                )}
              </div>
              
              {/* Suggestions List */}
              {suggestions.length > 0 && (
                <div className={styles.suggestionsContainer}>
                  <div className={styles.suggestionsHeader}>
                    <span>Select keywords to add ({selectedSuggestions.length} selected)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSuggestions(suggestions)}
                      className={styles.selectAllButton}
                    >
                      Select All
                    </button>
                  </div>
                  <div className={styles.suggestionsList}>
                    {suggestions.map((suggestion, index) => (
                      <div 
                        key={index}
                        className={`${styles.suggestionItem} ${
                          selectedSuggestions.some(s => s.keyword === suggestion.keyword) 
                            ? styles.selected : ''
                        }`}
                        onClick={() => toggleSuggestion(suggestion)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.some(s => s.keyword === suggestion.keyword)}
                          onChange={() => {}}
                          className={styles.checkbox}
                        />
                        <span className={styles.suggestionKeyword}>{suggestion.keyword}</span>
                        {suggestion.volume && (
                          <span className={styles.suggestionVolume}>
                            Vol: {suggestion.volume.toLocaleString()}
                          </span>
                        )}
                        {suggestion.difficulty && (
                          <span className={styles.suggestionDifficulty}>
                            Diff: {suggestion.difficulty}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.suggestions && (
                    <span className={styles.errorMessage}>{errors.suggestions}</span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Group Selection (for all modes) */}
          <div className={styles.formGroup}>
            <label htmlFor="group" className={styles.label}>
              Keyword Group (Optional)
            </label>
            {!showNewGroupInput ? (
              <div className={styles.inputGroup}>
                <select
                  id="group"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className={styles.select}
                  disabled={isLoading}
                >
                  <option value="">No Group</option>
                  {keywordGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewGroupInput(true)}
                  className={styles.newGroupButton}
                >
                  New Group
                </button>
              </div>
            ) : (
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter new group name"
                  className={styles.input}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewGroupInput(false);
                    setNewGroupName('');
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {/* Error Messages */}
          {errors.general && (
            <div className={styles.errorAlert}>
              {errors.general}
            </div>
          )}
          
          {/* Actions */}
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isLoading || (mode === 'suggestions' && selectedSuggestions.length === 0)}
            >
              {isLoading ? 'Adding...' : 
               mode === 'single' ? 'Add Keyword' :
               mode === 'bulk' ? `Add ${bulkKeywords.split('\n').filter(k => k.trim()).length} Keywords` :
               `Add ${selectedSuggestions.length} Keywords`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AddKeyword.propTypes = {
  onClose: PropTypes.func.isRequired,
  websiteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default AddKeyword;