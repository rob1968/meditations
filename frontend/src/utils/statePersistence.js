import React from 'react';

/**
 * State Persistence Utility
 * Handles saving and loading component state to/from localStorage
 * Ensures users stay on the same page/tab after refresh
 */

// Key prefixes for different types of state
const KEYS = {
  MAIN_TAB: 'app_activeTab',
  MEET_TAB: 'meet_activeTab',
  JOURNAL_TAB: 'journal_activeTab',
  COMMUNITY_TAB: 'community_activeTab',
  USER_PREFS: 'user_preferences',
  FORM_STATE: 'form_state_',
  VIEW_STATE: 'view_state_'
};

/**
 * Save state to localStorage with error handling
 */
export const saveState = (key, value) => {
  try {
    const stateData = {
      value,
      timestamp: Date.now(),
      version: '1.0'
    };
    localStorage.setItem(key, JSON.stringify(stateData));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
};

/**
 * Load state from localStorage with error handling and expiration
 */
export const loadState = (key, defaultValue = null, maxAge = 7 * 24 * 60 * 60 * 1000) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    
    const stateData = JSON.parse(stored);
    
    // Check if state is expired (default: 7 days)
    if (stateData.timestamp && Date.now() - stateData.timestamp > maxAge) {
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return stateData.value !== undefined ? stateData.value : defaultValue;
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
    // Clean up corrupted data
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore cleanup errors
    }
    return defaultValue;
  }
};

/**
 * Remove state from localStorage
 */
export const clearState = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear state from localStorage:', error);
  }
};

/**
 * Hook for persistent state that automatically saves/loads
 */
export const usePersistentState = (key, initialValue, options = {}) => {
  const { maxAge = 7 * 24 * 60 * 60 * 1000, saveOnChange = true } = options;
  
  // Load initial state from localStorage
  const [state, setState] = React.useState(() => {
    return loadState(key, initialValue, maxAge);
  });
  
  // Save state whenever it changes (if enabled)
  React.useEffect(() => {
    if (saveOnChange && state !== initialValue) {
      saveState(key, state);
    }
  }, [state, key, saveOnChange, initialValue]);
  
  return [state, setState];
};

/**
 * App-specific state persistence functions
 */

// Main app tab persistence
export const saveMainTab = (tab) => saveState(KEYS.MAIN_TAB, tab);
export const loadMainTab = () => loadState(KEYS.MAIN_TAB, 'journal');

// Meet hub tab persistence  
export const saveMeetTab = (tab) => saveState(KEYS.MEET_TAB, tab);
export const loadMeetTab = () => loadState(KEYS.MEET_TAB, 'discover');

// Journal tab persistence
export const saveJournalTab = (tab) => saveState(KEYS.JOURNAL_TAB, tab);
export const loadJournalTab = () => loadState(KEYS.JOURNAL_TAB, 'today');

// Community tab persistence
export const saveCommunityTab = (tab) => saveState(KEYS.COMMUNITY_TAB, tab);
export const loadCommunityTab = () => loadState(KEYS.COMMUNITY_TAB, 'shared');

// Dashboard tab persistence (UnifiedDashboard)
export const saveDashboardTab = (tab) => saveState('dashboard_activeTab', tab);
export const loadDashboardTab = () => loadState('dashboard_activeTab', 'mine');

// Admin tab persistence (AdminDashboard)
export const saveAdminTab = (tab) => saveState('admin_activeTab', tab);
export const loadAdminTab = () => loadState('admin_activeTab', 'pending');

// User preferences persistence
export const saveUserPreferences = (prefs) => saveState(KEYS.USER_PREFS, prefs);
export const loadUserPreferences = () => loadState(KEYS.USER_PREFS, {});

// Form state persistence (for longer forms)
export const saveFormState = (formId, formData) => saveState(KEYS.FORM_STATE + formId, formData);
export const loadFormState = (formId) => loadState(KEYS.FORM_STATE + formId, {});
export const clearFormState = (formId) => clearState(KEYS.FORM_STATE + formId);

// View state persistence (scroll position, expanded items, etc.)
export const saveViewState = (viewId, viewData) => saveState(KEYS.VIEW_STATE + viewId, viewData);
export const loadViewState = (viewId) => loadState(KEYS.VIEW_STATE + viewId, {});

/**
 * Clean up old or corrupted state data
 */
export const cleanupState = () => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    keys.forEach(key => {
      if (key.startsWith('app_') || key.startsWith('meet_') || key.startsWith('journal_') || 
          key.startsWith('community_') || key.startsWith('form_state_') || key.startsWith('view_state_')) {
        try {
          const stored = localStorage.getItem(key);
          const stateData = JSON.parse(stored);
          
          if (stateData.timestamp && now - stateData.timestamp > maxAge) {
            localStorage.removeItem(key);
            console.log('Cleaned up expired state:', key);
          }
        } catch (e) {
          // Remove corrupted data
          localStorage.removeItem(key);
          console.log('Cleaned up corrupted state:', key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to cleanup state:', error);
  }
};

// Auto-cleanup on import (run once when app loads)
cleanupState();

export default {
  saveState,
  loadState,
  clearState,
  usePersistentState,
  saveMainTab,
  loadMainTab,
  saveMeetTab,
  loadMeetTab,
  saveJournalTab,
  loadJournalTab,
  saveCommunityTab,
  loadCommunityTab,
  saveDashboardTab,
  loadDashboardTab,
  saveAdminTab,
  loadAdminTab,
  saveUserPreferences,
  loadUserPreferences,
  saveFormState,
  loadFormState,
  clearFormState,
  saveViewState,
  loadViewState,
  cleanupState
};