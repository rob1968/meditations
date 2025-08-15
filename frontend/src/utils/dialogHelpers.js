/**
 * Dialog Helper Utilities
 * 
 * This file provides standardized helper functions for showing dialogs
 * across the meditation app. Use these instead of browser alerts/confirms.
 */

/**
 * Standard confirmation dialog helper
 * @param {string} message - The confirmation message to display
 * @param {function} onConfirm - Function to call when user confirms
 * @param {function} showConfirmDialog - The component's showConfirmDialog function
 * @param {object} t - Translation function from useTranslation hook
 * @param {string} confirmText - Optional custom confirm button text
 * @param {string} cancelText - Optional custom cancel button text
 */
export const showStandardConfirm = (
  message, 
  onConfirm, 
  showConfirmDialog, 
  t, 
  confirmText = null, 
  cancelText = null
) => {
  const defaultConfirmText = confirmText || t('confirm', 'Confirm');
  const defaultCancelText = cancelText || t('cancel', 'Cancel');
  
  showConfirmDialog(message, onConfirm, defaultConfirmText, defaultCancelText);
};

/**
 * Standard alert helper 
 * @param {string} message - The alert message to display
 * @param {string} type - Alert type: 'success', 'error', 'warning', 'info'
 * @param {function} showAlert - The component's showAlert function
 */
export const showStandardAlert = (message, type = 'success', showAlert) => {
  showAlert(message, type);
};

/**
 * Quick delete confirmation helper
 * @param {string} itemName - Name of item being deleted
 * @param {function} onConfirm - Function to call when user confirms
 * @param {function} showConfirmDialog - The component's showConfirmDialog function
 * @param {object} t - Translation function from useTranslation hook
 */
export const showDeleteConfirm = (itemName, onConfirm, showConfirmDialog, t) => {
  const message = t('confirmDelete', `Are you sure you want to delete "${itemName}"?`);
  showStandardConfirm(message, onConfirm, showConfirmDialog, t);
};

/**
 * Quick success message helper
 * @param {string} action - The action that was successful (e.g., 'uploaded', 'deleted', 'saved')
 * @param {function} showAlert - The component's showAlert function
 * @param {object} t - Translation function from useTranslation hook
 */
export const showSuccessAlert = (action, showAlert, t) => {
  const message = t(`${action}Success`, `${action} successful!`);
  showStandardAlert(message, 'success', showAlert);
};

/**
 * Quick error message helper
 * @param {string} action - The action that failed (e.g., 'upload', 'delete', 'save')
 * @param {function} showAlert - The component's showAlert function
 * @param {object} t - Translation function from useTranslation hook
 * @param {string} details - Optional error details
 */
export const showErrorAlert = (action, showAlert, t, details = null) => {
  const baseMessage = t(`${action}Failed`, `${action} failed. Please try again.`);
  const message = details ? `${baseMessage} ${details}` : baseMessage;
  showStandardAlert(message, 'error', showAlert);
};

// Prevent accidental usage of browser functions
if (typeof window !== 'undefined') {
  // Development warning helper
  window.__showDialogHelp = () => {
    console.log(`
🎯 DIALOG HELPERS AVAILABLE:

Import: import { showStandardConfirm, showStandardAlert, showDeleteConfirm, showSuccessAlert, showErrorAlert } from '../utils/dialogHelpers';

✅ INSTEAD OF: window.confirm("Delete this?")
✅ USE: showDeleteConfirm("Item Name", onConfirm, showConfirmDialog, t)

✅ INSTEAD OF: alert("Success!")  
✅ USE: showSuccessAlert("upload", showAlert, t)

✅ INSTEAD OF: alert("Error!")
✅ USE: showErrorAlert("upload", showAlert, t)

✅ CUSTOM CONFIRM:
showStandardConfirm("Custom message?", onConfirm, showConfirmDialog, t)

✅ CUSTOM ALERT:
showStandardAlert("Custom message", "warning", showAlert)
    `);
  };
}