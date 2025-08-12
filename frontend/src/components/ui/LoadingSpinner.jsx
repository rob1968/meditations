import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LoadingSpinner.module.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  className = '',
  text
}) => {
  const { t } = useTranslation();
  const displayText = text || t('loading', 'Loading...');
  
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={`${styles.spinner} ${styles[size]}`}></div>
      {displayText && <p className={styles.text}>{displayText}</p>}
    </div>
  );
};

export default LoadingSpinner;