import React from 'react';
import { useTranslation } from 'react-i18next';
// CSS styles are now in the global app.css

const LoadingSpinner = ({ 
  size = 'medium', 
  className = '',
  text
}) => {
  const { t } = useTranslation();
  const displayText = text || t('loading', 'Loading...');
  
  return (
    <div className={`loading-spinner-container ${className}`}>
      <div className={`loading-spinner loading-spinner-${size}`}></div>
      {displayText && <p className="loading-spinner-text">{displayText}</p>}
    </div>
  );
};

export default LoadingSpinner;