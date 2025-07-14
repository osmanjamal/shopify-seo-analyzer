import React, { useState } from 'react';
import { 
  LayoutDashboard, Search, BarChart3, Settings, Globe, 
  AlertTriangle, TrendingUp, ShoppingCart, ChevronLeft,
  ChevronRight, Target, FileText, Users, HelpCircle
} from 'lucide-react';
import styles from './Common.module.css';

const Sidebar = ({ isCollapsed, onToggle, activeRoute, onNavigate }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    {
      id: 'keywords',
      label: 'Keywords',
      icon: Target,
      path: '/keywords',
      badge: '12',
      subitems: [
        { id: 'keyword-tracking', label: 'Tracking', path: '/keywords/tracking' },
        { id: 'keyword-research', label: 'Research', path: '/keywords/research' },
        { id: 'keyword-opportunities', label: 'Opportunities', path: '/keywords/opportunities' }
      ]
    },
    {
      id: 'technical',
      label: 'Technical SEO',
      icon: AlertTriangle,
      path: '/technical',
      badge: '5',
      badgeType: 'warning',
      subitems: [
        { id: 'site-audit', label: 'Site Audit', path: '/technical/audit' },
        { id: 'page-speed', label: 'Page Speed', path: '/technical/speed' },
        { id: 'structured-data', label: 'Structured Data', path: '/technical/structured' }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
      subitems: [
        { id: 'traffic', label: 'Traffic Overview', path: '/analytics/traffic' },
        { id: 'conversions', label: 'Conversions', path: '/analytics/conversions' },
        { id: 'realtime', label: 'Real-time', path: '/analytics/realtime' }
      ]
    },
    {
      id: 'shopify',
      label: 'Shopify',
      icon: ShoppingCart,
      path: '/shopify',
      subitems: [
        { id: 'products', label: 'Product SEO', path: '/shopify/products' },
        { id: 'collections', label: 'Collections', path: '/shopify/collections' },
        { id: 'performance', label: 'Store Performance', path: '/shopify/performance' }
      ]
    },
    {
      id: 'competitors',
      label: 'Competitors',
      icon: TrendingUp,
      path: '/competitors'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      path: '/reports'
    }
  ];

  const bottomMenuItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings'
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      path: '/help'
    }
  ];

  const handleItemClick = (item) => {
    if (item.subitems) {
      setExpandedSection(expandedSection === item.id ? null : item.id);
    } else {
      onNavigate(item.path);
    }
  };

  const handleSubitemClick = (path) => {
    onNavigate(path);
  };

  const isItemActive = (item) => {
    if (activeRoute === item.path) return true;
    if (item.subitems) {
      return item.subitems.some(subitem => activeRoute === subitem.path);
    }
    return false;
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'warning':
        return styles.badgeWarning;
      case 'danger':
        return styles.badgeDanger;
      default:
        return styles.badge;
    }
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          {!isCollapsed && (
            <>
              <Globe className={styles.logoIcon} />
              <span className={styles.logoText}>SEO Analyzer</span>
            </>
          )}
        </div>
        <button 
          className={styles.collapseButton}
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      <nav className={styles.sidebarNav}>
        <div className={styles.navSection}>
          {menuItems.map(item => (
            <div key={item.id}>
              <div
                className={`${styles.navItem} ${isItemActive(item) ? styles.active : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <div className={styles.navItemContent}>
                  <item.icon className={styles.navIcon} />
                  {!isCollapsed && (
                    <>
                      <span className={styles.navLabel}>{item.label}</span>
                      {item.badge && (
                        <span className={`${getBadgeClass(item.badgeType)}`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!isCollapsed && item.subitems && (
                  <ChevronRight 
                    className={`${styles.chevron} ${expandedSection === item.id ? styles.expanded : ''}`}
                  />
                )}
              </div>

              {!isCollapsed && item.subitems && expandedSection === item.id && (
                <div className={styles.subitems}>
                  {item.subitems.map(subitem => (
                    <div
                      key={subitem.id}
                      className={`${styles.subitem} ${activeRoute === subitem.path ? styles.active : ''}`}
                      onClick={() => handleSubitemClick(subitem.path)}
                    >
                      {subitem.label}
                    </div>
                  ))}
                </div>
              )}

              {isCollapsed && item.subitems && (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipContent}>
                    <div className={styles.tooltipTitle}>{item.label}</div>
                    {item.subitems.map(subitem => (
                      <div
                        key={subitem.id}
                        className={styles.tooltipItem}
                        onClick={() => handleSubitemClick(subitem.path)}
                      >
                        {subitem.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.navDivider}></div>

        <div className={styles.navSection}>
          {bottomMenuItems.map(item => (
            <div
              key={item.id}
              className={`${styles.navItem} ${activeRoute === item.path ? styles.active : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <item.icon className={styles.navIcon} />
              {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
              
              {isCollapsed && (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipContent}>
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {!isCollapsed && (
        <div className={styles.sidebarFooter}>
          <div className={styles.storageInfo}>
            <div className={styles.storageHeader}>
              <span>Data Usage</span>
              <span>2.4 GB / 5 GB</span>
            </div>
            <div className={styles.storageBar}>
              <div className={styles.storageProgress} style={{ width: '48%' }}></div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;