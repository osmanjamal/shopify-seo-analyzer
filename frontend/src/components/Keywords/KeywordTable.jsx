import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { useKeywordTracking } from '../../hooks/useKeywordTracking';
import KeywordChart from './KeywordChart';
import AddKeyword from './AddKeyword';
import Loading from '../Common/Loading';
import { 
  formatNumber, 
  formatPosition, 
  formatPositionChange,
  formatSearchVolume,
  formatDate,
  formatCompetition
} from '../../utils/formatters';
import { POSITION_RANGES, DEFAULT_PAGINATION } from '../../utils/constants';
import { 
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ChartBarIcon,
  PlusIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import styles from './Keywords.module.css';

const KeywordTable = () => {
  const navigate = useNavigate();
  const { showToast, selectedWebsite } = useApp();
  const { dataLoading } = useData();
  const {
    keywords,
    keywordGroups,
    selectedKeywords,
    keywordMetrics,
    isTracking,
    getKeywords,
    trackKeywordPositions,
    bulkDeleteKeywords,
    exportKeywords,
    importKeywords,
    selectKeyword,
    selectAllKeywords,
    clearSelection
  } = useKeywordTracking(selectedWebsite?.id);
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('position');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGINATION.PAGE_SIZE);
  
  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    return getKeywords({
      sortBy,
      sortOrder,
      filterBy,
      groupId: selectedGroup,
      searchTerm
    });
  }, [keywords, sortBy, sortOrder, filterBy, selectedGroup, searchTerm, getKeywords]);
  
  // Pagination
  const paginatedKeywords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredKeywords.slice(start, end);
  }, [filteredKeywords, currentPage, pageSize]);
  
  const totalPages = Math.ceil(filteredKeywords.length / pageSize);
  
  // Handle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  // Handle filter by position range
  const handleFilterByRange = (range) => {
    if (filterBy.positionRange === range) {
      setFilterBy({ ...filterBy, positionRange: null });
    } else {
      setFilterBy({ ...filterBy, positionRange: range });
      setCurrentPage(1);
    }
  };
  
  // Handle bulk track
  const handleBulkTrack = async () => {
    if (selectedKeywords.length === 0) {
      showToast('Please select keywords to track', 'warning');
      return;
    }
    
    const result = await trackKeywordPositions(selectedKeywords.map(k => k.id));
    if (result.success) {
      clearSelection();
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedKeywords.length === 0) {
      showToast('Please select keywords to delete', 'warning');
      return;
    }
    
    const result = await bulkDeleteKeywords(selectedKeywords.map(k => k.id));
    if (result.success) {
      clearSelection();
    }
  };
  
  // Handle export
  const handleExport = async (format = 'csv') => {
    const result = await exportKeywords(format);
    if (!result.success) {
      showToast('Failed to export keywords', 'error');
    }
  };
  
  // Handle import
  const handleImport = async (file) => {
    const result = await importKeywords(file);
    if (result.success) {
      setShowImportModal(false);
      showToast(`Imported ${result.imported} keywords`, 'success');
    }
  };
  
  // Handle select all on page
  const handleSelectAllOnPage = () => {
    const allSelected = paginatedKeywords.every(k => 
      selectedKeywords.some(sk => sk.id === k.id)
    );
    
    if (allSelected) {
      // Deselect all on page
      const pageIds = paginatedKeywords.map(k => k.id);
      const newSelection = selectedKeywords.filter(sk => 
        !pageIds.includes(sk.id)
      );
      selectedKeywords.forEach(k => selectKeyword(k));
    } else {
      // Select all on page
      paginatedKeywords.forEach(k => {
        if (!selectedKeywords.some(sk => sk.id === k.id)) {
          selectKeyword(k);
        }
      });
    }
  };
  
  // Check if all on page are selected
  const allOnPageSelected = paginatedKeywords.length > 0 && 
    paginatedKeywords.every(k => selectedKeywords.some(sk => sk.id === k.id));
  
  // Table columns
  const columns = [
    { key: 'keyword', label: 'Keyword', sortable: true },
    { key: 'position', label: 'Position', sortable: true },
    { key: 'position_change', label: 'Change', sortable: true },
    { key: 'search_volume', label: 'Volume', sortable: true },
    { key: 'difficulty', label: 'Difficulty', sortable: true },
    { key: 'url', label: 'URL', sortable: true },
    { key: 'last_checked', label: 'Last Checked', sortable: true }
  ];
  
  if (!selectedWebsite) {
    return (
      <div className={styles.noWebsite}>
        <h2>Select a Website</h2>
        <p>Please select a website to manage keywords</p>
      </div>
    );
  }
  
  return (
    <div className={styles.keywordsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Keywords</h1>
          <p className={styles.subtitle}>
            Track and monitor your keyword rankings
          </p>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={() => setShowAddModal(true)}
            className={styles.primaryButton}
          >
            <PlusIcon className={styles.buttonIcon} />
            Add Keywords
          </button>
        </div>
      </div>
      
      {/* Metrics Summary */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{formatNumber(keywordMetrics.total)}</div>
          <div className={styles.metricLabel}>Total Keywords</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{formatNumber(keywordMetrics.tracked)}</div>
          <div className={styles.metricLabel}>Tracked</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{formatNumber(keywordMetrics.topTen)}</div>
          <div className={styles.metricLabel}>Top 10</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{formatNumber(keywordMetrics.improved)}</div>
          <div className={styles.metricLabel}>Improved</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{formatSearchVolume(keywordMetrics.totalVolume)}</div>
          <div className={styles.metricLabel}>Total Volume</div>
        </div>
      </div>
      
      {/* Position Range Filter */}
      <div className={styles.positionFilter}>
        {Object.entries(POSITION_RANGES).map(([key, range]) => {
          const count = keywords.filter(k => {
            const pos = k.position;
            if (!pos && range.min > 100) return true;
            return pos >= range.min && (range.max === null || pos <= range.max);
          }).length;
          
          return (
            <button
              key={key}
              onClick={() => handleFilterByRange(key)}
              className={`${styles.filterButton} ${filterBy.positionRange === key ? styles.active : ''}`}
              style={{ borderColor: range.color }}
            >
              <span>{range.label}</span>
              <span className={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </div>
      
      {/* Actions Bar */}
      <div className={styles.actionsBar}>
        <div className={styles.actionsLeft}>
          {/* Search */}
          <div className={styles.searchBox}>
            <MagnifyingGlassIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          {/* Group Filter */}
          {keywordGroups.length > 0 && (
            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value || null)}
              className={styles.groupSelect}
            >
              <option value="">All Groups</option>
              {keywordGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.keyword_count})
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className={styles.actionsRight}>
          {/* Selection Actions */}
          {selectedKeywords.length > 0 && (
            <div className={styles.selectionActions}>
              <span className={styles.selectionCount}>
                {selectedKeywords.length} selected
              </span>
              <button
                onClick={handleBulkTrack}
                className={styles.actionButton}
                disabled={isTracking}
              >
                <ArrowPathIcon className={styles.buttonIcon} />
                Track
              </button>
              <button
                onClick={handleBulkDelete}
                className={`${styles.actionButton} ${styles.danger}`}
              >
                <TrashIcon className={styles.buttonIcon} />
                Delete
              </button>
              <button
                onClick={clearSelection}
                className={styles.textButton}
              >
                Clear
              </button>
            </div>
          )}
          
          {/* Export/Import */}
          <button
            onClick={() => handleExport('csv')}
            className={styles.actionButton}
          >
            <ArrowDownTrayIcon className={styles.buttonIcon} />
            Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className={styles.actionButton}
          >
            <ArrowUpTrayIcon className={styles.buttonIcon} />
            Import
          </button>
          
          {/* Chart View */}
          <button
            onClick={() => setShowChartModal(true)}
            className={styles.actionButton}
          >
            <ChartBarIcon className={styles.buttonIcon} />
            Charts
          </button>
        </div>
      </div>
      
      {/* Keywords Table */}
      <div className={styles.tableContainer}>
        {dataLoading.keywords ? (
          <Loading message="Loading keywords..." />
        ) : filteredKeywords.length === 0 ? (
          <div className={styles.emptyState}>
            <MagnifyingGlassIcon className={styles.emptyIcon} />
            <h3>No keywords found</h3>
            <p>Add keywords to start tracking your rankings</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className={styles.primaryButton}
            >
              Add Your First Keywords
            </button>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={handleSelectAllOnPage}
                      className={styles.checkbox}
                    />
                  </th>
                  {columns.map(column => (
                    <th 
                      key={column.key}
                      className={column.sortable ? styles.sortable : ''}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className={styles.thContent}>
                        <span>{column.label}</span>
                        {sortBy === column.key && (
                          <span className={styles.sortIcon}>
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedKeywords.map(keyword => {
                  const positionData = formatPosition(keyword.position);
                  const changeData = formatPositionChange(keyword.position_change);
                  const competitionData = formatCompetition(keyword.difficulty);
                  const isSelected = selectedKeywords.some(sk => sk.id === keyword.id);
                  
                  return (
                    <tr 
                      key={keyword.id}
                      className={isSelected ? styles.selected : ''}
                    >
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => selectKeyword(keyword)}
                          className={styles.checkbox}
                        />
                      </td>
                      <td>
                        <div className={styles.keywordCell}>
                          <span className={styles.keywordText}>{keyword.keyword}</span>
                          {keyword.group_name && (
                            <span className={styles.groupBadge}>{keyword.group_name}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span 
                          className={styles.positionBadge}
                          style={{ color: positionData.color }}
                        >
                          {positionData.text}
                        </span>
                      </td>
                      <td>
                        {changeData.text !== '-' && (
                          <div className={`${styles.change} ${styles[changeData.color]}`}>
                            <span>{changeData.icon}</span>
                            <span>{changeData.text}</span>
                          </div>
                        )}
                      </td>
                      <td>{formatSearchVolume(keyword.search_volume)}</td>
                      <td>
                        <span 
                          className={styles.difficultyBadge}
                          style={{ color: competitionData.color }}
                        >
                          {competitionData.text}
                        </span>
                      </td>
                      <td>
                        {keyword.url && (
                          <a 
                            href={keyword.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.urlLink}
                          >
                            {keyword.url.replace(/^https?:\/\/[^\/]+/, '')}
                          </a>
                        )}
                      </td>
                      <td className={styles.dateCell}>
                        {keyword.last_checked ? formatDate(keyword.last_checked, 'MMM dd') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <div className={styles.paginationInfo}>
                  Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredKeywords.length)} of{' '}
                  {filteredKeywords.length} keywords
                </div>
                <div className={styles.paginationControls}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={styles.paginationButton}
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={styles.paginationButton}
                  >
                    Previous
                  </button>
                  <span className={styles.paginationPages}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={styles.paginationButton}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={styles.paginationButton}
                  >
                    Last
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={styles.pageSizeSelect}
                  >
                    {DEFAULT_PAGINATION.PAGE_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size}>
                        {size} per page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modals */}
      {showAddModal && (
        <AddKeyword 
          onClose={() => setShowAddModal(false)}
          websiteId={selectedWebsite.id}
        />
      )}
      
      {showChartModal && (
        <KeywordChart
          keywords={keywords}
          onClose={() => setShowChartModal(false)}
        />
      )}
      
      {showImportModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Import Keywords</h3>
            <p>Upload a CSV file with keywords to import</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleImport(file);
                }
              }}
              className={styles.fileInput}
            />
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowImportModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordTable;