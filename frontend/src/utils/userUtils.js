/**
 * User ID utilities for consistent frontend user handling
 * 
 * Frontend standard: use user.id (MongoDB _id gets serialized to id)
 * Backend standard: use user._id (native MongoDB ObjectId)
 */

/**
 * Get user ID consistently across the frontend
 * @param {Object} user - User object 
 * @returns {string|null} - User ID or null if not found
 */
export const getUserId = (user) => {
  if (!user) return null;
  
  // Prefer id (standard frontend format), fallback to _id (raw MongoDB format)
  return user.id || user._id || null;
};

/**
 * Check if current user is the organizer of an activity
 * @param {Object} activity - Activity object
 * @param {Object} user - Current user object
 * @returns {boolean} - True if user is organizer
 */
export const isActivityOrganizer = (activity, user) => {
  if (!activity?.organizer || !user) return false;
  
  const userId = getUserId(user);
  
  // Handle both object format {_id: '...', id: '...'} and string format
  let organizerId;
  if (typeof activity.organizer === 'string') {
    organizerId = activity.organizer;
  } else {
    organizerId = getUserId(activity.organizer);
  }
  
  return userId && organizerId && userId === organizerId;
};

/**
 * Check if current user is a participant in an activity
 * @param {Object} activity - Activity object
 * @param {Object} user - Current user object
 * @returns {boolean} - True if user is participant
 */
export const isActivityParticipant = (activity, user) => {
  if (!activity?.participants || !user) return false;
  
  const userId = getUserId(user);
  if (!userId) return false;
  
  return activity.participants.some(participant => {
    // Handle both object format {_id: '...', id: '...'} and string format
    let participantUserId;
    const userRef = participant.user || participant;
    if (typeof userRef === 'string') {
      participantUserId = userRef;
    } else {
      participantUserId = getUserId(userRef);
    }
    return participantUserId === userId;
  });
};

/**
 * Get authenticated headers for API requests
 * @param {Object} user - User object
 * @returns {Object} - Headers object with x-user-id
 */
export const getAuthHeaders = (user) => {
  const userId = getUserId(user);
  
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId || ''
  };
};

/**
 * Get authenticated headers for multipart/form-data requests
 * Does NOT set Content-Type header (browser will set it with boundary)
 * @param {Object} user - User object
 * @returns {Object} - Headers object with x-user-id
 */
export const getMultipartAuthHeaders = (user) => {
  const userId = getUserId(user);
  
  return {
    'x-user-id': userId || ''
  };
};

/**
 * Check if user object is valid (has an ID)
 * @param {Object} user - User object
 * @returns {boolean} - True if user has valid ID
 */
export const isValidUser = (user) => {
  return Boolean(getUserId(user));
};