import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedLanguages } from '../data/languages';

const PageHeader = ({ user, onProfileClick, title, subtitle, showBackButton = false, onBackClick, unreadCount = 0, onInboxClick, onCreateClick }) => {
  const { t, i18n } = useTranslation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Get localized language names
  const availableLanguages = getLocalizedLanguages(t);
  const currentLanguage = availableLanguages.find(lang => lang.code === i18n.language) || availableLanguages[0];

  // Handle language change
  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('selectedLanguage', languageCode);
    setLanguageMenuOpen(false);
    // Keep the main profile menu open after language selection
  };



  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Profile menu items
  const profileMenuItems = [
    { id: 'inbox', icon: '📬', label: t('inbox', 'Inbox'), badge: unreadCount },
    { id: 'profile', icon: '👤', label: t('profile', 'Profile') },
    { id: 'credits', icon: '💎', label: t('tokens', 'Tokens') },
    { id: 'statistics', icon: '📊', label: t('statistics', 'Statistics') }
  ];

  const handleProfileMenuSelect = (sectionId) => {
    setProfileMenuOpen(false);
    
    if (sectionId === 'create' && onCreateClick) {
      // Handle create click separately
      onCreateClick();
    } else if (sectionId === 'inbox' && onInboxClick) {
      // Handle inbox click separately
      onInboxClick();
    } else if (onProfileClick) {
      // Call the original onProfileClick with the section parameter
      onProfileClick(sectionId);
    }
  };

  // Close panel when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && profileMenuOpen) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [profileMenuOpen]);

  console.log('PageHeader rendering with user:', user?.username, 'profileMenuOpen:', profileMenuOpen);
  
  return (
    <div className="page-header">
      <div className="page-header-left">
        {showBackButton && onBackClick && (
          <button 
            className="back-button" 
            onClick={onBackClick}
            title={t('back', 'Back')}
          >
            ← {t('back', 'Back')}
          </button>
        )}
        {user && onProfileClick && (
          <>
            <button 
              className="hamburger-menu-button" 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              title={t('menu', 'Menu')}
            >
              <div className="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
            
            {/* Slide-out Profile Panel */}
            {profileMenuOpen && (
              <>
                <div 
                  className="profile-overlay" 
                  onClick={() => setProfileMenuOpen(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 2147483645,
                    display: 'block'
                  }}
                />
                <div className="profile-slide-panel" ref={profileDropdownRef} style={{ 
                  position: 'fixed', 
                  top: '0', 
                  right: '0', 
                  height: '100vh', 
                  width: '300px', 
                  background: 'rgba(15, 20, 25, 0.95)', 
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  zIndex: 2147483646,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1,
                  transform: 'translateX(0)',
                  transition: 'transform 0.3s ease',
                  padding: '20px',
                  boxSizing: 'border-box',
                  overflowY: 'auto'
                }}>
                  <div className="profile-panel-header">
                    <div className="profile-panel-avatar">
                      <div className="panel-avatar-circle">
                        <span className="panel-avatar-initial">{user?.username?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div className="panel-user-info">
                        <h3 className="panel-username">{user?.username}</h3>
                        <p className="panel-member-since">{t('memberSince', 'Member since')} {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      className="panel-close-btn"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Language Selector Section - Right under header */}
                  <div className="profile-panel-language">
                    <div className="panel-language-header">
                      <div className="panel-item-icon">🌐</div>
                      <span className="panel-language-title">{t('uiLanguage', 'UI Language')}</span>
                      <div className="panel-language-selector">
                        <button 
                          className={`panel-language-button ${languageMenuOpen ? 'open' : ''}`}
                          onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span className="panel-language-flag" style={{ fontSize: '24px', lineHeight: '1' }}>{currentLanguage.flag}</span>
                          <span className="panel-language-current">{currentLanguage.nativeName}</span>
                          <span className="panel-language-arrow">▼</span>
                        </button>
                        {languageMenuOpen && (
                          <div className="panel-language-options" style={{
                            position: 'absolute',
                            top: '100%',
                            right: '0',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            minWidth: '200px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}>
                            {availableLanguages.map(language => (
                              <button
                                key={language.code}
                                className={`panel-language-option ${i18n.language === language.code ? 'selected' : ''}`}
                                onClick={() => handleLanguageChange(language.code)}
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  border: 'none',
                                  background: i18n.language === language.code ? 'var(--accent-color)' : 'transparent',
                                  color: i18n.language === language.code ? 'white' : 'var(--text-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease',
                                  borderBottom: '1px solid var(--border-color)'
                                }}
                                onMouseEnter={(e) => {
                                  if (i18n.language !== language.code) {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (i18n.language !== language.code) {
                                    e.target.style.background = 'transparent';
                                  }
                                }}
                              >
                                <span className="language-flag" style={{ fontSize: '24px', lineHeight: '1' }}>{language.flag}</span>
                                <span className="language-name">{language.nativeName}</span>
                                {i18n.language === language.code && <span className="language-check" style={{ marginLeft: 'auto' }}>✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="profile-panel-divider"></div>
                  
                  <div className="profile-panel-menu">
                    {profileMenuItems.map(item => (
                      <button
                        key={item.id}
                        className="profile-panel-item"
                        onClick={() => handleProfileMenuSelect(item.id)}
                      >
                        <div className="panel-item-icon-container">
                          <div className="panel-item-icon">{item.icon}</div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <div className="panel-item-badge">{item.badge}</div>
                          )}
                        </div>
                        <div className="panel-item-content">
                          <span className="panel-item-label">{item.label}</span>
                          <span className="panel-item-arrow">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="page-header-center">
        {title && (
          <div className="page-title-section">
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
        )}
      </div>

      <div className="page-header-right">
        {/* Language selector removed - now in profile page */}
      </div>
    </div>
  );
};

export default PageHeader;