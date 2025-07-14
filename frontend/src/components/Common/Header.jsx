import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, Settings, LogOut, Menu, Moon, Sun, HelpCircle } from 'lucide-react';
import styles from './Common.module.css';

const Header = ({ onMenuToggle, user, onLogout, darkMode, onThemeToggle }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'warning',
      title: 'Technical Issue Detected',
      message: 'Missing meta descriptions on 5 pages',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: 'Keyword Ranking Improved',
      message: '"SEO Tools" moved up 3 positions',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      type: 'info',
      title: 'Weekly Report Ready',
      message: 'Your SEO performance report is available',
      time: '3 hours ago',
      read: true
    }
  ]);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implement search functionality
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning':
        return styles.warningIcon;
      case 'success':
        return styles.successIcon;
      case 'info':
        return styles.infoIcon;
      default:
        return '';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button 
          className={styles.menuToggle}
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu />
        </button>

        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search keywords, pages, or analytics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* Theme Toggle */}
        <button 
          className={styles.headerButton}
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun /> : <Moon />}
        </button>

        {/* Help Button */}
        <button 
          className={styles.headerButton}
          aria-label="Help"
        >
          <HelpCircle />
        </button>

        {/* Notifications */}
        <div className={styles.notificationContainer} ref={notificationRef}>
          <button 
            className={styles.headerButton}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell />
            {unreadCount > 0 && (
              <span className={styles.notificationBadge}>{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className={styles.notificationDropdown}>
              <div className={styles.dropdownHeader}>
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    className={styles.markAllRead}
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className={styles.notificationList}>
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className={`${styles.notificationIcon} ${getNotificationIcon(notification.type)}`}>
                        <div className={styles.iconDot}></div>
                      </div>
                      <div className={styles.notificationContent}>
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className={styles.notificationTime}>{notification.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyNotifications}>
                    <p>No new notifications</p>
                  </div>
                )}
              </div>

              <div className={styles.dropdownFooter}>
                <a href="/notifications" className={styles.viewAllLink}>
                  View all notifications
                </a>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className={styles.userMenuContainer} ref={userMenuRef}>
          <button 
            className={styles.userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className={styles.userAvatar}
              />
            ) : (
              <div className={styles.userInitials}>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className={styles.userDropdown}>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user?.name || 'User'}</div>
                <div className={styles.userEmail}>{user?.email || 'user@example.com'}</div>
              </div>

              <div className={styles.dropdownDivider}></div>

              <a href="/profile" className={styles.dropdownItem}>
                <User className={styles.dropdownIcon} />
                <span>My Profile</span>
              </a>

              <a href="/settings" className={styles.dropdownItem}>
                <Settings className={styles.dropdownIcon} />
                <span>Settings</span>
              </a>

              <div className={styles.dropdownDivider}></div>

              <button 
                className={styles.dropdownItem}
                onClick={onLogout}
              >
                <LogOut className={styles.dropdownIcon} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;