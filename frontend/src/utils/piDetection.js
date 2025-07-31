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
  // Check for Pi Browser user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const isPiUserAgent = userAgent.includes('pi browser') || 
                        userAgent.includes('pi-browser') ||
                        userAgent.includes('pi network');
  
  // Check for Pi SDK availability
  const hasPiSDK = typeof window !== 'undefined' && window.Pi;
  
  // Additional environment checks
  const hasPiEnvironment = typeof window !== 'undefined' && (
    window.location.hostname.includes('pi') ||
    window.navigator.userAgent.includes('Pi')
  );
  
  return isPiUserAgent || (hasPiSDK && hasPiEnvironment);
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

// Safe Pi SDK authentication wrapper following working example pattern
export const authenticateWithPi = (scopes = ['payments', 'username']) => {
  return new Promise((resolve, reject) => {
    // Ensure Pi SDK is loaded before attempting to use it
    if (typeof window.Pi === 'undefined') {
      console.error('[Pi Auth] Pi SDK (window.Pi) is undefined. SDK script likely failed to load.');
      reject(new Error('Pi SDK not loaded. Please ensure the SDK script can load.'));
      return;
    }
    
    console.log('[Pi Auth] Pi SDK (window.Pi) is loaded:', window.Pi);
    console.log('[Pi Auth] Starting Pi authentication with scopes:', scopes);
    
    // Callback for incomplete payments (required by Pi SDK)
    function onIncompletePaymentFound(payment) {
      console.log('[Pi Auth] Incomplete payment found:', payment);
      // Handle incomplete payments if needed
      // For now, we'll just log it since we're focusing on authentication
    }
    
    try {
      // Authenticate the user following the working example pattern
      console.log('[Pi Auth] Attempting Pi.authenticate...');
      window.Pi.authenticate(scopes, onIncompletePaymentFound)
        .then(auth => {
          console.log('[Pi Auth] Pi Authentication successful (frontend):', auth);
          resolve(auth);
        })
        .catch(err => {
          console.error('[Pi Auth] Pi.authenticate call failed:', err);
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

// Debug utility to check Pi environment
export const debugPiEnvironment = () => {
  const debug = {
    isPiBrowser: isPiBrowser(),
    isPiSDKAvailable: isPiSDKAvailable(),
    userAgent: navigator.userAgent,
    hostname: window.location.hostname,
    piObject: typeof window !== 'undefined' ? !!window.Pi : false,
    piMethods: typeof window !== 'undefined' && window.Pi ? Object.keys(window.Pi) : []
  };
  
  console.log('Pi Environment Debug:', debug);
  return debug;
};

// Export default object with all utilities
export default {
  isPiBrowser,
  isPiSDKAvailable,
  waitForPiSDK,
  authenticateWithPi,
  getPiUser,
  createPiPayment,
  debugPiEnvironment
};