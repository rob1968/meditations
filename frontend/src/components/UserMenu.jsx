import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedLanguages } from '../data/languages';

const UserMenu = ({ 
  user, 
  credits, 
  unreadCount = 0,
  currentPage = 'create', // New prop to determine current context
  onViewProfile,
  onViewCredits,
  onViewStats,
  onViewNotifications,
  onViewSettings,
  onViewCommunity,
  onViewMyAudio,
  onViewJournal,
  onLogout 
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const menuRef = useRef(null);

  // Get localized language names
  const availableLanguages = getLocalizedLanguages(t);
  const currentLanguage = availableLanguages.find(lang => lang.code === i18n.language) || availableLanguages[0];

  // Handle language change
  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('selectedLanguage', languageCode);
    setLanguageOpen(false);
    setIsOpen(false); // Close main menu too
  };


  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setLanguageOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuClick = (action) => {
    setIsOpen(false);
    if (action) action();
  };

  // Define menu items for different contexts
  const getMenuItems = () => {
    if (currentPage === 'profile') {
      // On profile page, show sections of the profile page
      return [
        {
          id: 'profile-info',
          icon: '👤',
          label: t('profile', 'Profile'),
          action: () => {
            // Scroll to profile info section
            const element = document.querySelector('.profile-info-section');
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
          description: t('viewProfileDesc', 'View your profile and statistics')
        },
        {
          id: 'logout',
          icon: '🚪',
          label: t('logout', 'Logout'),
          action: onLogout,
          description: t('logoutDesc', 'Sign out of your account'),
          className: 'logout-item'
        }
      ];
    }
    
    // For all other pages, show only items NOT in bottom navbar
    return [
      {
        id: 'profile',
        icon: '👤',
        label: t('viewProfile', 'View Profile'),
        action: onViewProfile,
        description: t('viewProfileDesc', 'View your profile and statistics'),
        showOn: ['create', 'myAudio', 'community', 'inbox', 'journal', 'journalHub', 'admin', 'credits', 'statistics']
      },
      {
        id: 'credits',
        icon: '💳',
        label: t('tokens', 'Tokens'),
        action: onViewCredits,
        description: t('creditsDesc', 'Manage your tokens'),
        badge: credits?.credits,
        showOn: ['create', 'myAudio', 'community', 'inbox', 'journal', 'journalHub', 'admin']
      },
      {
        id: 'statistics',
        icon: '📊',
        label: t('statistics', 'Statistics'),
        action: onViewStats,
        description: t('statisticsDesc', 'View your meditation statistics'),
        showOn: ['create', 'myAudio', 'community', 'inbox', 'journal', 'journalHub', 'admin', 'credits', 'statistics']
      },
      {
        id: 'logout',
        icon: '🚪',
        label: t('logout', 'Logout'),
        action: onLogout,
        description: t('logoutDesc', 'Sign out of your account'),
        className: 'logout-item',
        showOn: ['create', 'myAudio', 'community', 'inbox', 'journal', 'journalHub', 'admin', 'credits', 'statistics']
      }
    ];
  };

  const allMenuItems = getMenuItems();

  // Filter menu items based on current page
  const menuItems = currentPage === 'profile' 
    ? allMenuItems // On profile page, show all profile section items
    : allMenuItems.filter(item => {
        // Don't show an item if it's the current page (except for logout and settings which are always useful)
        if (item.id === currentPage && item.id !== 'logout' && item.id !== 'settings') {
          return false;
        }
        return item.showOn && item.showOn.includes(currentPage);
      });

  return (
    <div className={`user-menu ${currentPage === 'profile' ? 'profile-sections-menu' : ''}`} ref={menuRef}>
      <button 
        className={`user-menu-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={user?.username || 'User Menu'}
      >
        <div className="user-avatar">👤</div>
        <span className="user-name">{user?.username}</span>
        <span className={`menu-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-info">
              <div className="user-avatar-large">
                {currentPage === 'profile' ? '📋' : '👤'}
              </div>
              <div className="user-details">
                <div className="user-display-name">
                  {currentPage === 'profile' 
                    ? t('profileInformation', 'Profile Sections')
                    : user?.username
                  }
                </div>
                <div className="user-member-since">
                  {currentPage === 'profile' 
                    ? t('selectSectionToView', 'Select a section to view')
                    : `${t('memberSince', 'Member since')} ${new Date(user?.createdAt).toLocaleDateString()}`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Language Selector Section */}
          <div className="user-menu-language-section">
            <div className="menu-language-header">
              <span className="language-icon">🌐</span>
              <span>{t('selectUILanguage', 'UI Language')}</span>
            </div>
            <div className="menu-language-selector">
              <div 
                className={`menu-language-button ${languageOpen ? 'open' : ''}`} 
                onClick={() => setLanguageOpen(!languageOpen)}
              >
                <span>{currentLanguage.nativeName}</span>
                <span className="language-arrow">▼</span>
              </div>
              {languageOpen && (
                <div className="menu-language-options">
                  {availableLanguages.map(language => (
                    <div 
                      key={language.code}
                      className={`menu-language-option ${i18n.language === language.code ? 'selected' : ''}`}
                      onClick={() => handleLanguageChange(language.code)}
                    >
                      <span className="language-name">{language.nativeName}</span>
                      <span className="language-localized">{language.localizedName}</span>
                      {i18n.language === language.code && <span className="selected-check">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="user-menu-items">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className={`user-menu-item ${item.className || ''}`}
                onClick={() => handleMenuClick(item.action)}
                title={item.description}
              >
                <div className="menu-item-icon">{item.icon}</div>
                <div className="menu-item-content">
                  <div className="menu-item-label">{item.label}</div>
                  <div className="menu-item-description">{item.description}</div>
                </div>
                {item.badge && (
                  <div className="menu-item-badge">{item.badge}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;