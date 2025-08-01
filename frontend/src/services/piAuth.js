/**
 * Pi Network Authentication Service
 * 
 * This service handles:
 * - Pi Network user authentication
 * - Integration with backend authentication
 * - User session management for Pi users
 * - Error handling and fallbacks
 */

import axios from 'axios';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { 
  isPiBrowser, 
  isPiSDKAvailable, 
  waitForPiSDK, 
  initializePiSDK,
  authenticateWithPi, 
  getPiUser,
  debugPiEnvironment 
} from '../utils/piDetection';

class PiAuthService {
  constructor() {
    this.isInitialized = false;
    this.isAuthenticating = false;
    this.currentUser = null;
  }

  // Initialize Pi authentication service following working example pattern
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    console.log('[PiAuth Service] Initializing Pi Authentication Service...');
    
    try {
      // Debug current environment
      debugPiEnvironment();
      
      // Pi authentication available in all browsers
      console.log('[PiAuth Service] Pi authentication available');

      // Wait for SDK to load with proper timing like working example
      console.log('[PiAuth Service] Checking Pi SDK...');
      await waitForPiSDK(5000); // 5 second timeout
      
      // Initialize Pi SDK properly (this was missing!)
      console.log('[PiAuth Service] Initializing Pi SDK...');
      await initializePiSDK();
      
      // Add a 500ms delay like the working example to ensure SDK is ready
      console.log('[PiAuth Service] SDK initialized, waiting 500ms for readiness...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.isInitialized = true;
      console.log('[PiAuth Service] Pi Authentication Service initialized successfully');
      return true;
    } catch (error) {
      console.error('[PiAuth Service] Failed to initialize Pi Authentication Service:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // Check if Pi authentication is available
  isAvailable() {
    return this.isInitialized && isPiSDKAvailable();
  }

  // Authenticate user with Pi Network following working example pattern
  async authenticateUser() {
    if (this.isAuthenticating) {
      throw new Error('Authentication already in progress');
    }

    if (!this.isAvailable()) {
      throw new Error('Pi authentication is not available');
    }

    try {
      this.isAuthenticating = true;
      console.log('[PiAuth Service] Starting Pi authentication...');

      // Use the working scopes from the example: payments and username
      const scopes = ['payments', 'username'];
      console.log('[PiAuth Service] Using scopes:', scopes);

      // Authenticate with Pi Network with reasonable timeout
      const authTimeout = 30000; // 30 seconds - give more time like original
      const authPromise = authenticateWithPi(scopes);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Pi authentication timeout after 30 seconds')), authTimeout)
      );

      const piAuth = await Promise.race([authPromise, timeoutPromise]);
      
      console.log('Pi authentication successful:', {
        hasUser: !!piAuth.user,
        hasAccessToken: !!piAuth.accessToken,
        userId: piAuth.user?.uid ? '[PRESENT]' : '[MISSING]',
        username: piAuth.user?.username ? '[PRESENT]' : '[MISSING]'
      });

      // Validate Pi authentication response
      if (!piAuth) {
        throw new Error('No authentication response received from Pi Network');
      }

      if (!piAuth.user) {
        throw new Error('No user data received from Pi Network');
      }

      if (!piAuth.accessToken) {
        throw new Error('No access token received from Pi Network');
      }

      // Extract and validate user data
      const piUserData = {
        piUserId: piAuth.user?.uid,
        piUsername: piAuth.user?.username,
        accessToken: piAuth.accessToken,
      };

      // Enhanced validation of Pi user data
      if (!piUserData.piUserId || typeof piUserData.piUserId !== 'string') {
        throw new Error('Invalid or missing Pi user ID');
      }

      if (!piUserData.piUsername || typeof piUserData.piUsername !== 'string') {
        throw new Error('Invalid or missing Pi username');
      }

      if (!piUserData.accessToken || typeof piUserData.accessToken !== 'string') {
        throw new Error('Invalid or missing Pi access token');
      }

      // Additional validation for reasonable data lengths
      if (piUserData.piUserId.length > 100) {
        throw new Error('Pi user ID is too long');
      }

      if (piUserData.piUsername.length > 50) {
        throw new Error('Pi username is too long');
      }

      console.log('Pi user data validated successfully');

      // Send Pi authentication data to our backend with enhanced error handling
      const backendAuth = await this.authenticateWithBackend(piUserData);
      
      // Validate backend response
      if (!backendAuth.success) {
        throw new Error(backendAuth.error || 'Backend authentication failed');
      }

      if (!backendAuth.user) {
        throw new Error('No user data received from backend');
      }

      // Store user data
      this.currentUser = {
        ...backendAuth.user,
        authMethod: 'pi',
        piData: piUserData
      };

      console.log('Pi authentication completed successfully');

      return {
        success: true,
        user: this.currentUser,
        token: backendAuth.token,
        credits: backendAuth.credits
      };

    } catch (error) {
      console.error('Pi authentication failed:', error);
      
      // Provide more specific error messages based on error type
      if (error.message.includes('timeout')) {
        throw new Error('Pi authentication timed out. Please try again.');
      } else if (error.message.includes('user cancelled') || error.message.includes('cancelled')) {
        throw new Error('Pi authentication was cancelled by user.');
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        throw new Error('Network error during Pi authentication. Please check your connection.');
      } else {
        throw error;
      }
    } finally {
      this.isAuthenticating = false;
    }
  }

  // Authenticate Pi user with our backend with enhanced error handling and timeout
  async authenticateWithBackend(piUserData) {
    try {
      console.log('Authenticating Pi user with backend...');

      // Create axios request with timeout
      const backendTimeout = 15000; // 15 seconds
      const requestConfig = {
        timeout: backendTimeout,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const requestData = {
        piUserId: piUserData.piUserId,
        piUsername: piUserData.piUsername,
        accessToken: piUserData.accessToken,
        authMethod: 'pi'
      };

      // Validate request data before sending
      if (!requestData.piUserId || !requestData.piUsername || !requestData.accessToken) {
        throw new Error('Missing required authentication data for backend request');
      }

      console.log('[PiAuth] Making backend request to:', getFullUrl(API_ENDPOINTS.PI_LOGIN));
      console.log('[PiAuth] Request data:', { 
        ...requestData, 
        accessToken: '[REDACTED]' // Don't log the actual token
      });
      console.log('[PiAuth] Request config:', requestConfig);

      const response = await axios.post(
        getFullUrl(API_ENDPOINTS.PI_LOGIN), 
        requestData, 
        requestConfig
      );

      console.log('[PiAuth] Backend response status:', response.status);
      console.log('[PiAuth] Backend response data:', response.data);

      // Validate response structure
      if (!response.data) {
        throw new Error('No response data received from backend');
      }

      if (!response.data.success) {
        const errorMessage = response.data.error || 'Backend authentication failed';
        const errorCode = response.data.errorCode || 'UNKNOWN_ERROR';
        throw new Error(`${errorMessage} (${errorCode})`);
      }

      // Validate response contains required fields
      if (!response.data.user) {
        throw new Error('No user data received from backend');
      }

      if (!response.data.user.id) {
        throw new Error('Invalid user data received from backend');
      }

      console.log('Backend authentication successful for user:', response.data.user.username);
      return response.data;

    } catch (error) {
      console.error('[PiAuth] Backend authentication error:', error);
      console.error('[PiAuth] Error details:', {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request made but no response' : 'No request made'
      });
      
      // Handle specific error types with more detail
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Backend authentication timed out. Please try again.');
      }
      
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        console.log('[PiAuth] Server error response:', { statusCode, errorData });
        
        if (statusCode >= 400 && statusCode < 500) {
          // Client error
          const message = errorData?.error || `Authentication failed (${statusCode})`;
          const errorCode = errorData?.errorCode || 'CLIENT_ERROR';
          throw new Error(`${message} (${errorCode})`);
        } else if (statusCode >= 500) {
          // Server error
          throw new Error(`Server error during authentication (${statusCode}). Please try again later.`);
        }
      } else if (error.request) {
        // Network error - no response received
        console.log('[PiAuth] Network error - request made but no response received');
        console.log('[PiAuth] Request details:', error.request);
        throw new Error('Network error: Unable to connect to authentication server. Check your internet connection.');
      }
      
      // Re-throw if it's already our custom error
      if (error.message.includes('(') && error.message.includes(')')) {
        throw error;
      }
      
      throw new Error(`Failed to authenticate with backend: ${error.message}`);
    }
  }

  // Get current authenticated user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated via Pi
  isAuthenticated() {
    return this.currentUser !== null && this.currentUser.authMethod === 'pi';
  }

  // Logout Pi user
  logout() {
    this.currentUser = null;
    console.log('Pi user logged out');
  }

  // Auto-authenticate if possible (for app startup)
  async autoAuthenticate() {
    if (!this.isAvailable()) {
      return { success: false, reason: 'Pi authentication not available' };
    }

    try {
      console.log('Attempting Pi auto-authentication...');
      const result = await this.authenticateUser();
      console.log('Pi auto-authentication successful');
      return result;
    } catch (error) {
      console.log('Pi auto-authentication failed:', error.message);
      return { success: false, reason: error.message };
    }
  }

  // Handle Pi payment creation (for future use)
  async createPayment(paymentData) {
    if (!this.isAvailable()) {
      throw new Error('Pi payments not available');
    }

    if (!this.isAuthenticated()) {
      throw new Error('User must be authenticated to make payments');
    }

    try {
      // Implementation for Pi payments
      // This would integrate with the Pi payment system
      console.log('Creating Pi payment:', paymentData);
      
      // For now, return a placeholder
      return {
        success: true,
        message: 'Pi payments not implemented yet',
        paymentData
      };
    } catch (error) {
      console.error('Pi payment creation failed:', error);
      throw error;
    }
  }

  // Get authentication status info
  getAuthStatus() {
    return {
      isSDKAvailable: isPiSDKAvailable(),
      isInitialized: this.isInitialized,
      isAvailable: this.isAvailable(),
      isAuthenticated: this.isAuthenticated(),
      isAuthenticating: this.isAuthenticating,
      currentUser: this.currentUser ? {
        id: this.currentUser.id,
        username: this.currentUser.username,
        authMethod: this.currentUser.authMethod,
        piUsername: this.currentUser.piData?.piUsername
      } : null
    };
  }
}

// Create singleton instance
const piAuthService = new PiAuthService();

export default piAuthService;