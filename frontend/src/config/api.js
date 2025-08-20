// API Configuration - Use same protocol and host as frontend
const getApiUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Use same protocol and host as current page (automatic HTTPS support)
  return `${window.location.protocol}//${window.location.host}`;
};

export const API_BASE_URL = getApiUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  PI_LOGIN: '/api/auth/pi-login',
  USER_MEDITATIONS: (userId) => `/api/user-meditations/list/${userId}`,
  USER_STATS: (userId) => `/api/auth/user/${userId}/stats`,
  UPLOAD_IMAGE: (meditationId) => `/api/user-meditations/meditation/${meditationId}/upload-image`,
  DELETE_IMAGE: (meditationId) => `/api/user-meditations/meditation/${meditationId}/custom-image`,
  
  // Meditation endpoints
  GENERATE_TEXT: '/api/meditation/generate-text',
  GENERATE_MEDITATION: '/api/meditation',
  GET_VOICES: '/api/meditation/voices',
  VOICE_PREVIEW: '/api/meditation/voice-preview',
  GOOGLE_VOICE_PREVIEW: '/api/google-voice-preview',
  SAVE_MEDITATION: '/api/user-meditations/save',
  CUSTOM_BACKGROUND_UPLOAD: '/api/meditation/custom-background/upload',
  
  // AI Coach endpoints
  AI_COACH: '/api/ai-coach',
  AI_COACH_CHAT: '/api/ai-coach/chat',
  AI_COACH_ASSESS_CRISIS: '/api/ai-coach/assess-crisis',
  
  // Journal endpoints
  JOURNAL_CREATE: '/api/journal/create',
  JOURNAL_ENTRIES: (userId) => `/api/journal/entries/${userId}`,
  JOURNAL_VOICE_CLONE_UPLOAD: '/api/journal/voice-clone/upload',
  JOURNAL_TRANSCRIBE: '/api/journal/transcribe',
  AI_COACH_CHECK_NONSENSE: '/api/ai-coach/check-nonsense',
  
  // User endpoints
  USER_CREDITS: (userId) => `/api/users/${userId}/credits`,
  UPDATE_PROFILE: (userId) => `/api/users/${userId}/update-profile`,
  
  // Community endpoints
  COMMUNITY_MEDITATIONS: '/api/community/shared-meditations',
  COMMUNITY_MEDITATION: (id) => `/api/community/meditation/${id}`,
  COMMUNITY_LIKE: (id) => `/api/community/meditations/${id}/like`,
  COMMUNITY_PLAY: (id) => `/api/community/meditations/${id}/play`,
  COMMUNITY_SHARE: '/api/community/share',
  
  // Notifications endpoints
  NOTIFICATIONS_MARK_READ: '/api/notifications/mark-read',
  NOTIFICATIONS_LIST: (userId) => `/api/notifications/${userId}`,
  
  // Addictions endpoints
  ADDICTIONS_TRACK: '/api/addictions/track',
  ADDICTIONS_LIST: (userId) => `/api/addictions/${userId}`,
  ADDICTIONS_CREATE: '/api/addictions/create',
  
  // Emergency contacts endpoints
  EMERGENCY_CONTACTS: '/api/emergency-contacts',
  EMERGENCY_CONTACTS_USER: (userId) => `/api/emergency-contacts/${userId}`,
  
  // Pi Payment endpoints
  PI_PAYMENTS_APPROVE: '/api/pi-payments/approve',
  PI_PAYMENTS_COMPLETE: '/api/pi-payments/complete',
  
  // Asset endpoints - serve via API to ensure access
  MEDITATION_AUDIO: (filename) => `/api/meditation/audio/${filename}`,
  CUSTOM_IMAGE: (filename) => `/assets/images/custom/${filename}`,
  DEFAULT_IMAGE: (type) => `/assets/images/${type}.jpg`,
};

// Helper function to get full URL
export const getFullUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to get asset URL
export const getAssetUrl = (assetPath) => {
  return `${API_BASE_URL}${assetPath}`;
};

// NOTE: getAuthHeaders moved to /src/utils/userUtils.js for consistent user ID handling
// Use: import { getAuthHeaders } from '../utils/userUtils'; getAuthHeaders(user);

// Helper function for authenticated requests
export const apiRequest = async (url, options = {}, userId) => {
  const defaultHeaders = userId ? {
    'Content-Type': 'application/json',
    'x-user-id': userId
  } : { 'Content-Type': 'application/json' };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const response = await fetch(getFullUrl(url), config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};