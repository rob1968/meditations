const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users/:userId/credits - Get user credits
router.get('/:userId/credits', async (req, res) => {
  try {
    const { userId } = req.params;
    
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