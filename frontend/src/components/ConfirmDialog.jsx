import React from 'react';
import { useTranslation } from 'react-i18next';
// CSS styles are now in the global app.css

const ConfirmDialog = ({ 
  message,
  title, 
  visible, 
  isOpen,
  onConfirm, 
  onCancel,
  onClose,
  confirmText,
  cancelText
}) => {
  const { t } = useTranslation();
  // Force this component to be included in bundle
  if (typeof window !== 'undefined') {
    window.__CONFIRM_DIALOG_LOADED__ = true;
  }
  
  // Support both visible and isOpen props for compatibility
  const isVisible = visible || isOpen;
  if (!isVisible) return null;

  // Handle both onCancel and onClose for compatibility
  const handleClose = onCancel || onClose;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        {title && <h3 className="confirm-title">{title}</h3>}
        <div className="confirm-message">{message}</div>
        <div className="confirm-buttons">
          <button 
            className="confirm-btn confirm-yes" 
            onClick={onConfirm}
          >
            ✅ {confirmText || t('confirm', 'Confirm')}
          </button>
          <button 
            className="confirm-btn confirm-no" 
            onClick={handleClose}
          >
            ❌ {cancelText || t('cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;