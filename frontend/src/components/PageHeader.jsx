import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const PageHeader = ({ user, onProfileClick, title, subtitle, showBackButton = false, onBackClick, unreadCount = 0, onInboxClick, onCreateClick }) => {
  const { t } = useTranslation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileDropdownRef = useRef(null);


  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
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
    { id: 'credits', icon: '💎', label: t('credits', 'Credits') },
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
                />
                <div className="profile-slide-panel" ref={profileDropdownRef}>
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