import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ProfileInfo from './ProfileInfo';
import Credits from './Credits';
import Statistics from './Statistics';

const ProfileContainer = ({ user, onLogout, onBackToCreate, selectedSection = 'profile', onUserUpdate }) => {
  const { t, i18n } = useTranslation();
  const [languageOpen, setLanguageOpen] = useState(false);
  const dropdownRef = useRef(null);

  const uiLanguages = [
    { value: 'en', label: '🇺🇸 English', flag: '🇺🇸' },
    { value: 'nl', label: '🇳🇱 Nederlands', flag: '🇳🇱' },
    { value: 'de', label: '🇩🇪 Deutsch', flag: '🇩🇪' },
    { value: 'fr', label: '🇫🇷 Français', flag: '🇫🇷' },
    { value: 'es', label: '🇪🇸 Español', flag: '🇪🇸' },
    { value: 'it', label: '🇮🇹 Italiano', flag: '🇮🇹' },
    { value: 'pt', label: '🇵🇹 Português', flag: '🇵🇹' },
    { value: 'ru', label: '🇷🇺 Русский', flag: '🇷🇺' },
    { value: 'zh', label: '🇨🇳 中文', flag: '🇨🇳' },
    { value: 'ja', label: '🇯🇵 日本語', flag: '🇯🇵' },
    { value: 'ko', label: '🇰🇷 한국어', flag: '🇰🇷' },
    { value: 'hi', label: '🇮🇳 हिन्दी', flag: '🇮🇳' },
    { value: 'ar', label: '🇸🇦 العربية', flag: '🇸🇦' }
  ];

  const currentLanguage = uiLanguages.find(lang => lang.value === i18n.language) || uiLanguages[0];

  const handleLanguageChange = (languageValue) => {
    i18n.changeLanguage(languageValue);
    localStorage.setItem('selectedLanguage', languageValue);
    setLanguageOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setLanguageOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderContent = () => {
    switch (selectedSection) {
      case 'profile':
        return <ProfileInfo user={user} onUserUpdate={onUserUpdate} />;
      case 'credits':
        return <Credits user={user} />;
      case 'statistics':
        return <Statistics user={user} />;
      default:
        return <ProfileInfo user={user} />;
    }
  };


  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-top">
          <button 
            className="back-to-create-btn" 
            onClick={onBackToCreate}
            title={t('backToCreate', 'Back to Create')}
          >
            ← {t('backToCreate', 'Back')}
          </button>
        </div>
        
        <div className="profile-user-info">
          <div className="profile-avatar">👤</div>
          <h2>{user.username}</h2>
          <p>{t('memberSince', 'Member since')} {new Date(user.createdAt).toLocaleDateString()}</p>
          
          {/* UI Language Selector */}
          <div className="profile-language-selector" ref={dropdownRef}>
            <div className="profile-language-label">
              <span className="language-icon">🌐</span>
              <span>{t('uiLanguage', 'UI Language')}</span>
            </div>
            <div className="profile-custom-select">
              <div 
                className={`profile-select-button ${languageOpen ? 'open' : ''}`} 
                onClick={() => setLanguageOpen(!languageOpen)}
              >
                <span>{currentLanguage.flag}</span>
                <span>{currentLanguage.label.split(' ')[1]}</span>
                <span>▼</span>
              </div>
              {languageOpen && (
                <div className="profile-select-options open">
                  {uiLanguages.map(language => (
                    <div 
                      key={language.value}
                      className={`profile-select-option ${i18n.language === language.value ? 'selected' : ''}`}
                      onClick={() => handleLanguageChange(language.value)}
                    >
                      <span>{language.flag}</span>
                      <span>{language.label.split(' ')[1]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        {renderContent()}
      </div>

      <div className="profile-actions">
        <button 
          onClick={onLogout} 
          className="logout-button-full"
        >
          {t('logout', 'Logout')}
        </button>
      </div>
    </div>
  );
};

export default ProfileContainer;