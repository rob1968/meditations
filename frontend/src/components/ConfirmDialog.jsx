import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/ConfirmDialog.css';

const ConfirmDialog = ({ 
  message, 
  visible, 
  onConfirm, 
  onCancel,
  confirmText,
  cancelText
}) => {
  const { t } = useTranslation();
  // Force this component to be included in bundle
  if (typeof window !== 'undefined') {
    window.__CONFIRM_DIALOG_LOADED__ = true;
  }
  
  if (!visible) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <p className="confirm-message">{message}</p>
        <div className="confirm-buttons">
          <button 
            className="confirm-btn confirm-yes" 
            onClick={onConfirm}
          >
            ✅ {confirmText || t('confirm', 'Bevestigen')}
          </button>
          <button 
            className="confirm-btn confirm-no" 
            onClick={onCancel}
          >
            ❌ {cancelText || t('cancel', 'Annuleren')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;