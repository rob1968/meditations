const User = require('../models/User');

// Standardized authentication middleware
const auth = async (req, res, next) => {
  try {
    // Standard header: x-user-id (primary), fallback to user-id for legacy support
    const userId = req.headers['x-user-id'] || req.headers['user-id'];
    
    if (!userId) {
      console.warn(`[AUTH] Missing user ID - ${req.method} ${req.path} - Headers:`, Object.keys(req.headers));
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'MISSING_USER_ID',
        message: 'x-user-id header is required' 
      });
    }
    
    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      console.warn(`[AUTH] Invalid user ID format: ${userId}`);
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID' 
      });
    }
    
    const user = await User.findById(userId).select('+role +permissions');
    if (!user) {
      console.warn(`[AUTH] User not found: ${userId}`);
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      });
    }
    
    // Attach user object and userId to request for convenience
    req.user = user;
    req.userId = userId;
    
    console.log(`[AUTH] ✅ Authenticated user: ${user.username} (${userId})`);
    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR' 
    });
  }
};

// Optional auth middleware for routes that don't require authentication
const optionalAuth = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.headers['user-id'];
    
    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      const user = await User.findById(userId).select('+role +permissions');
      if (user) {
        req.user = user;
        req.userId = userId;
        console.log(`[AUTH] ✅ Optional auth: ${user.username} (${userId})`);
      }
    }
    
    next();
  } catch (error) {
    console.error('[AUTH] Optional auth error:', error);
    // Don't fail request for optional auth errors
    next();
  }
};

module.exports = { auth, optionalAuth };