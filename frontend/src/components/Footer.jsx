import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-links">
          <button 
            className="footer-link"
            onClick={() => onNavigate('privacy')}
          >
            {t('privacyPolicy', 'Privacy Policy')}
          </button>
          <span className="footer-separator">•</span>
          <button 
            className="footer-link"
            onClick={() => onNavigate('terms')}
          >
            {t('termsOfService', 'Terms of Service')}
          </button>
          <span className="footer-separator">•</span>
          <button 
            className="footer-link"
            onClick={() => onNavigate('contact')}
          >
            {t('contact', 'Contact')}
          </button>
        </div>
        <div className="footer-copyright">
          <p>© 2024 PiHappy Meditation. {t('allRightsReserved', 'All rights reserved.')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;