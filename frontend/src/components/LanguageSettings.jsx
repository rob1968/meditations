import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedLanguages } from '../data/languages';

const LanguageSettings = ({ user }) => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  
  // Get localized language names
  const availableLanguages = getLocalizedLanguages(t);
  const currentLanguage = availableLanguages.find(lang => lang.code === i18n.language) || availableLanguages[0];

  // Handle language change
  const handleLanguageChange = (languageCode) => {
    setSelectedLanguage(languageCode);
    i18n.changeLanguage(languageCode);
    localStorage.setItem('selectedLanguage', languageCode);
  };

  return (
    <div className="language-settings">
      <div className="language-settings-header">
        <h3>🌐 {t('uiLanguage', 'UI Language')}</h3>
        <p className="language-description">
          {t('selectUILanguageDesc', 'Choose your preferred language for the user interface')}
        </p>
      </div>

      <div className="current-language-display">
        <div className="current-language-info">
          <div className="current-language-icon">🌐</div>
          <div className="current-language-details">
            <h4>{t('currentLanguage', 'Current Language')}</h4>
            <p className="current-language-name">{currentLanguage.nativeName}</p>
            <p className="current-language-localized">{currentLanguage.localizedName}</p>
          </div>
        </div>
      </div>

      <div className="language-options">
        <h4>{t('availableLanguages', 'Available Languages')}</h4>
        <div className="language-grid">
          {availableLanguages.map(language => (
            <button
              key={language.code}
              className={`language-option ${selectedLanguage === language.code ? 'selected' : ''}`}
              onClick={() => handleLanguageChange(language.code)}
            >
              <div className="language-option-flag">{language.flag}</div>
              <div className="language-option-info">
                <div className="language-option-native">{language.nativeName}</div>
                <div className="language-option-localized">{language.localizedName}</div>
              </div>
              {selectedLanguage === language.code && (
                <div className="language-selected-check">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="language-info">
        <div className="language-note">
          <span className="info-icon">ℹ️</span>
          <p>{t('languageChangeNote', 'Language changes are applied immediately and saved automatically.')}</p>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;