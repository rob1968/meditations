/**
 * Pi Network Browser Detection and SDK Wrapper
 * 
 * This utility handles:
 * - Detection of Pi Browser environment
 * - Pi SDK initialization
 * - Safe Pi SDK method calls with fallbacks
 */

// Check if we're running in Pi Browser
export const isPiBrowser = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Log user agent for debugging
  console.log('[Pi Detection] User Agent:', navigator.userAgent);
  
  // Check for Pi Browser specific identifiers
  const piIdentifiers = [
    'pi browser',
    'pi-browser',
    'pibrowser',
    'pi network',
    'pinetwork',
    'minepi',
    'pi_browser',
    'pi.browser'
  ];
  
  // Also check for Pi SDK availability as indication of Pi Browser
  const hasPiSDK = typeof window !== 'undefined' && window.Pi;
  
  // Check URL hostname patterns that might indicate Pi Browser
  const isPiHostname = window.location.hostname.includes('pi') || 
                      window.location.hostname.includes('minepi');
  
  const userAgentMatch = piIdentifiers.some(identifier => userAgent.includes(identifier));
  
  // More aggressive detection: if Pi SDK is available, likely Pi Browser
  const result = userAgentMatch || hasPiSDK || isPiHostname;
  
  console.log('[Pi Detection] Results:', {
    userAgent: userAgent.substring(0, 100) + '...',
    userAgentMatch,
    hasPiSDK,
    isPiHostname,
    finalResult: result
  });
  
  return result;
};

// Check if Pi SDK is loaded and available
export const isPiSDKAvailable = () => {
  return typeof window !== 'undefined' && 
         window.Pi && 
         typeof window.Pi.init === 'function';
};

// Wait for Pi SDK to be ready with timeout
export const waitForPiSDK = (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const checkInterval = 250; // Check every 250ms
    let elapsed = 0;
    
    const checkSDK = () => {
      if (typeof window !== 'undefined' && window.Pi) {
        console.log('[Pi SDK] SDK loaded successfully after', elapsed + 'ms');
        console.log('[Pi SDK] Available methods:', Object.keys(window.Pi));
        resolve(true);
        return;
      }
      
      elapsed += checkInterval;
      if (elapsed >= timeout) {
        reject(new Error(`Pi SDK failed to load within ${timeout}ms timeout`));
        return;
      }
      
      setTimeout(checkSDK, checkInterval);
    };
    
    checkSDK();
  });
};

// Initialize Pi SDK with proper configuration
export const initializePiSDK = () => {
  return new Promise((resolve, reject) => {
    if (typeof window.Pi === 'undefined') {
      console.error('[Pi Init] Pi SDK (window.Pi) is undefined. SDK script likely failed to load.');
      reject(new Error('Pi SDK not loaded. Please ensure the SDK script can load.'));
      return;
    }
    
    try {
      console.log('[Pi Init] Initializing Pi SDK...');
      
      // Initialize Pi SDK (this is the missing piece!)
      window.Pi.init({
        version: "2.0", // Specify the Pi SDK version
        // sandbox: false  // Use production mode (removed sandbox parameter as requested)
      });
      
      console.log('[Pi Init] Pi SDK initialized successfully');
      resolve(true);
    } catch (error) {
      console.error('[Pi Init] Error initializing Pi SDK:', error);
      reject(error);
    }
  });
};

// Safe Pi SDK authentication wrapper following working example pattern
export const authenticateWithPi = (scopes = ['payments', 'username', 'wallet_address']) => {
  return new Promise(async (resolve, reject) => {
    // Ensure Pi SDK is loaded before attempting to use it
    if (typeof window.Pi === 'undefined') {
      console.error('[Pi Auth] Pi SDK (window.Pi) is undefined. SDK script likely failed to load.');
      reject(new Error('Pi SDK not loaded. Please ensure the SDK script can load.'));
      return;
    }
    
    console.log('[Pi Auth] Pi SDK (window.Pi) is loaded:', window.Pi);
    console.log('[Pi Auth] Starting Pi authentication with scopes:', scopes);
    
    try {
      // Initialize Pi SDK first if not already done
      console.log('[Pi Auth] Ensuring Pi SDK is initialized...');
      await initializePiSDK();
      
      // Callback for incomplete payments (required by Pi SDK)
      function onIncompletePaymentFound(payment) {
        console.log('[Pi Auth] Incomplete payment found:', payment);
        // Handle incomplete payments if needed
        // For now, we'll just log it since we're focusing on authentication
      }
      
      // Authenticate the user following the working example pattern
      console.log('[Pi Auth] Attempting Pi.authenticate...', {
        timestamp: new Date().toISOString(),
        scopes: scopes
      });
      
      const authStartTime = Date.now();
      window.Pi.authenticate(scopes, onIncompletePaymentFound)
        .then(auth => {
          const duration = Date.now() - authStartTime;
          console.log('[Pi Auth] Pi Authentication successful (frontend):', {
            duration: `${duration}ms`,
            hasAuth: !!auth,
            hasUser: !!auth?.user,
            hasAccessToken: !!auth?.accessToken
          });
          resolve(auth);
        })
        .catch(err => {
          const duration = Date.now() - authStartTime;
          console.error('[Pi Auth] Pi.authenticate call failed:', {
            error: err,
            duration: `${duration}ms`,
            message: err.message || err
          });
          reject(new Error(`Pi Authentication failed: ${err.message || err}`));
        });
    } catch (error) {
      console.error('[Pi Auth] Error during Pi authentication:', error);
      reject(error);
    }
  });
};

// Get Pi user information safely
export const getPiUser = () => {
  return new Promise((resolve, reject) => {
    if (!isPiSDKAvailable()) {
      reject(new Error('Pi SDK is not available'));
      return;
    }
    
    try {
      // First authenticate to get user data
      authenticateWithPi(['username'])
        .then(auth => {
          // Extract user information from auth response
          const piUser = {
            uid: auth.user?.uid || null,
            username: auth.user?.username || null,
            accessToken: auth.accessToken || null,
            // Add other user fields as needed
          };
          resolve(piUser);
        })
        .catch(reject);
    } catch (error) {
      console.error('Error getting Pi user:', error);
      reject(error);
    }
  });
};

// Pi SDK wrapper for payments (for future use)
export const createPiPayment = (paymentData) => {
  return new Promise((resolve, reject) => {
    if (!isPiSDKAvailable()) {
      reject(new Error('Pi SDK is not available'));
      return;
    }
    
    try {
      window.Pi.createPayment(paymentData, {
        onReadyForServerApproval: (paymentId) => {
          console.log('Payment ready for server approval:', paymentId);
          resolve({ paymentId, status: 'pending_approval' });
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          console.log('Payment ready for completion:', paymentId, txid);
          resolve({ paymentId, txid, status: 'pending_completion' });
        },
        onCancel: (paymentId) => {
          console.log('Payment cancelled:', paymentId);
          reject(new Error('Payment cancelled by user'));
        },
        onError: (error, payment) => {
          console.error('Payment error:', error, payment);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error creating Pi payment:', error);
      reject(error);
    }
  });
};

// Check microphone support with Pi Browser specific handling
export const checkMicrophoneSupport = () => {
  const isInPiBrowser = isPiBrowser();
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasMediaRecorder = !!window.MediaRecorder;
  
  return {
    isSupported: hasGetUserMedia && hasMediaRecorder,
    isPiBrowser: isInPiBrowser,
    hasGetUserMedia,
    hasMediaRecorder,
    userAgent: navigator.userAgent,
    // Pi Browser might have different permission requirements
    needsSpecialHandling: isInPiBrowser
  };
};

// Pi Browser specific getUserMedia with fallbacks
export const getPiBrowserUserMedia = async (constraints = { audio: true }) => {
  const micSupport = checkMicrophoneSupport();
  
  console.log('[Pi Detection] Microphone support check:', micSupport);
  
  if (!micSupport.isSupported) {
    throw new Error(`Microphone not supported. getUserMedia: ${micSupport.hasGetUserMedia}, MediaRecorder: ${micSupport.hasMediaRecorder}`);
  }
  
  try {
    // For Pi Browser, try with simplified constraints first
    if (micSupport.isPiBrowser) {
      console.log('[Pi Detection] Attempting Pi Browser optimized getUserMedia...');
      
      // Try with basic constraints first for Pi Browser
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Pi Detection] Pi Browser basic audio access successful');
        return stream;
      } catch (basicError) {
        console.log('[Pi Detection] Pi Browser basic access failed, trying enhanced constraints:', basicError);
      }
    }
    
    // Regular getUserMedia with enhanced constraints
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('[Pi Detection] Standard getUserMedia successful');
    return stream;
    
  } catch (error) {
    console.error('[Pi Detection] getUserMedia failed:', error);
    
    // Enhanced error handling for Pi Browser
    if (micSupport.isPiBrowser) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Pi Browser: Microfoon toegang geweigerd. Ga naar Pi Browser instellingen en sta microfoon toe voor deze app.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('Pi Browser: Geen microfoon gevonden. Controleer of je apparaat een werkende microfoon heeft.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Pi Browser: Microfoon wordt niet ondersteund. Probeer een andere browser of update Pi Browser.');
      }
    }
    
    throw error;
  }
};

// Debug utility to check Pi environment
export const debugPiEnvironment = () => {
  const micSupport = checkMicrophoneSupport();
  const debug = {
    isPiBrowser: isPiBrowser(),
    isPiSDKAvailable: isPiSDKAvailable(),
    microphoneSupport: micSupport,
    userAgent: navigator.userAgent,
    hostname: window.location.hostname,
    piObject: typeof window !== 'undefined' ? !!window.Pi : false,
    piMethods: typeof window !== 'undefined' && window.Pi ? Object.keys(window.Pi) : [],
    isHTTPS: window.location.protocol === 'https:',
    mediaDevicesAvailable: !!navigator.mediaDevices
  };
  
  console.log('Pi Environment Debug:', debug);
  return debug;
};

// Export default object with all utilities
export default {
  isPiBrowser,
  isPiSDKAvailable,
  waitForPiSDK,
  initializePiSDK,
  authenticateWithPi,
  getPiUser,
  createPiPayment,
  checkMicrophoneSupport,
  getPiBrowserUserMedia,
  debugPiEnvironment
};