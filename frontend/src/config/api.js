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
  
  // AI Coach endpoints
  AI_COACH: '/api/ai-coach',
  
  // User endpoints
  USER_CREDITS: (userId) => `/api/users/${userId}/credits`,
  
  // Community endpoints
  COMMUNITY_MEDITATIONS: '/api/community/shared-meditations',
  COMMUNITY_MEDITATION: (id) => `/api/community/meditation/${id}`,
  COMMUNITY_LIKE: (id) => `/api/community/meditations/${id}/like`,
  COMMUNITY_PLAY: (id) => `/api/community/meditations/${id}/play`,
  
  // Asset endpoints
  MEDITATION_AUDIO: (filename) => `/assets/meditations/${filename}`,
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