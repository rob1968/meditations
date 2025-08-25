import React, { useEffect } from 'react';
// CSS styles are now in the global app.css

const Alert = ({ 
  message, 
  type = 'success', 
  visible, 
  onClose, 
  duration = 2000,
  position = 'inline' 
}) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '✅';
    }
  };

  return (
    <div className={`alert alert-${type} alert-${position}`}>
      <span className="alert-icon">{getIcon()}</span>
      <span className="alert-message">{message}</span>
    </div>
  );
};

export default Alert;