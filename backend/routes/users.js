const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// GET /api/users/:userId/credits - Get user credits
router.get('/:userId/credits', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('credits');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      credits: user.credits || 0,
      userId: userId
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ error: 'Failed to fetch user credits' });
  }
});

module.exports = router;