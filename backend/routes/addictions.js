const express = require('express');
const router = express.Router();
const Addiction = require('../models/Addiction');
const User = require('../models/User');

// Get user's addictions
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, type } = req.query;
    
    console.log('Fetching addictions for user:', userId);
    
    // Build filter query
    let filter = { userId };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    const addictions = await Addiction.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'username');
    
    console.log('Found addictions:', addictions.length);
    
    // Add calculated days clean to each addiction
    const addictionsWithDays = addictions.map(addiction => {
      const addictionObj = addiction.toObject();
      addictionObj.daysClean = addiction.getDaysClean();
      return addictionObj;
    });
    
    res.json({
      success: true,
      addictions: addictionsWithDays
    });
  } catch (error) {
    console.error('Error fetching addictions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch addictions' });
  }
});

// Create new addiction
router.post('/create', async (req, res) => {
  try {
    const { userId, type, customType, description, startDate, quitDate, status, severity, triggers, copingStrategies } = req.body;
    
    if (!userId || !type || !startDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID, type, and start date are required' 
      });
    }
    
    console.log('Creating addiction:', { userId, type, customType, startDate, quitDate, status });
    
    const addictionData = {
      userId,
      type: type.trim(),
      description: description?.trim() || '',
      startDate: new Date(startDate),
      status: status || 'active'
    };
    
    // Add custom type if specified
    if (type === 'other' && customType) {
      addictionData.customType = customType.trim();
    }
    
    // Add quit date if provided
    if (quitDate) {
      addictionData.quitDate = new Date(quitDate);
      addictionData.status = 'recovering';
    }
    
    // Add optional fields
    if (severity && severity >= 1 && severity <= 10) {
      addictionData.severity = severity;
    }
    
    if (triggers && Array.isArray(triggers)) {
      addictionData.triggers = triggers.filter(t => t.trim()).map(t => t.trim());
    }
    
    if (copingStrategies && Array.isArray(copingStrategies)) {
      addictionData.copingStrategies = copingStrategies.filter(s => s.trim()).map(s => s.trim());
    }
    
    const newAddiction = new Addiction(addictionData);
    await newAddiction.save();
    await newAddiction.populate('userId', 'username');
    
    // Add initial milestone if quit date is provided
    if (quitDate) {
      await newAddiction.addMilestone('quit_attempt', 'Started recovery journey');
    }
    
    res.json({
      success: true,
      addiction: newAddiction,
      message: 'Addiction tracking started successfully'
    });
  } catch (error) {
    console.error('Error creating addiction:', error);
    res.status(500).json({ success: false, error: 'Failed to create addiction tracking' });
  }
});

// Update addiction
router.put('/:addictionId', async (req, res) => {
  try {
    const { addictionId } = req.params;
    const { userId, type, customType, description, startDate, quitDate, status, severity, triggers, copingStrategies } = req.body;
    
    console.log('Updating addiction:', addictionId);
    
    const addiction = await Addiction.findById(addictionId);
    if (!addiction) {
      return res.status(404).json({ success: false, error: 'Addiction not found' });
    }
    
    // Check if user owns this addiction
    if (addiction.userId.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this addiction' });
    }
    
    const previousStatus = addiction.status;
    const previousQuitDate = addiction.quitDate;
    
    // Update fields
    if (type !== undefined) addiction.type = type.trim();
    if (customType !== undefined) addiction.customType = customType?.trim() || '';
    if (description !== undefined) addiction.description = description?.trim() || '';
    if (startDate !== undefined) addiction.startDate = new Date(startDate);
    if (status !== undefined) addiction.status = status;
    if (severity !== undefined && severity >= 1 && severity <= 10) addiction.severity = severity;
    
    // Handle quit date changes
    if (quitDate !== undefined) {
      if (quitDate && !previousQuitDate) {
        // User is quitting for the first time
        addiction.quitDate = new Date(quitDate);
        addiction.status = 'recovering';
        await addiction.addMilestone('quit_attempt', 'Started recovery journey');
      } else if (quitDate && previousQuitDate && new Date(quitDate).getTime() !== previousQuitDate.getTime()) {
        // Quit date changed
        addiction.quitDate = new Date(quitDate);
        await addiction.addMilestone('quit_attempt', 'Updated quit date');
      } else if (!quitDate && previousQuitDate) {
        // Removed quit date (relapse)
        addiction.quitDate = null;
        addiction.status = 'relapsed';
        await addiction.addMilestone('relapse', 'Relapsed - removed quit date');
      }
    }
    
    // Handle status changes
    if (status && status !== previousStatus) {
      if (status === 'relapsed' && previousStatus === 'recovering') {
        await addiction.addMilestone('relapse', 'Status changed to relapsed');
      } else if (status === 'recovering' && previousStatus === 'relapsed') {
        await addiction.addMilestone('quit_attempt', 'Back on recovery track');
      } else if (status === 'clean') {
        await addiction.addMilestone('milestone', `Marked as clean - ${addiction.getDaysClean()} days`);
      }
    }
    
    // Update arrays
    if (triggers !== undefined) {
      addiction.triggers = Array.isArray(triggers) ? 
        triggers.filter(t => t.trim()).map(t => t.trim()) : [];
    }
    
    if (copingStrategies !== undefined) {
      addiction.copingStrategies = Array.isArray(copingStrategies) ? 
        copingStrategies.filter(s => s.trim()).map(s => s.trim()) : [];
    }
    
    await addiction.save();
    await addiction.populate('userId', 'username');
    
    res.json({
      success: true,
      addiction,
      message: 'Addiction updated successfully'
    });
  } catch (error) {
    console.error('Error updating addiction:', error);
    res.status(500).json({ success: false, error: 'Failed to update addiction' });
  }
});

// Delete addiction
router.delete('/:addictionId', async (req, res) => {
  try {
    const { addictionId } = req.params;
    const { userId } = req.query;
    
    const addiction = await Addiction.findById(addictionId);
    if (!addiction) {
      return res.status(404).json({ success: false, error: 'Addiction not found' });
    }
    
    // Check if user owns this addiction
    if (addiction.userId.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this addiction' });
    }
    
    await Addiction.findByIdAndDelete(addictionId);
    
    res.json({
      success: true,
      message: 'Addiction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting addiction:', error);
    res.status(500).json({ success: false, error: 'Failed to delete addiction' });
  }
});

// Add milestone to addiction
router.post('/:addictionId/milestone', async (req, res) => {
  try {
    const { addictionId } = req.params;
    const { userId, type, description } = req.body;
    
    if (!userId || !type || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID, type, and description are required' 
      });
    }
    
    const addiction = await Addiction.findById(addictionId);
    if (!addiction) {
      return res.status(404).json({ success: false, error: 'Addiction not found' });
    }
    
    // Check if user owns this addiction
    if (addiction.userId.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to add milestone to this addiction' });
    }
    
    await addiction.addMilestone(type, description);
    await addiction.populate('userId', 'username');
    
    res.json({
      success: true,
      addiction,
      message: 'Milestone added successfully'
    });
  } catch (error) {
    console.error('Error adding milestone:', error);
    res.status(500).json({ success: false, error: 'Failed to add milestone' });
  }
});

// Get addiction statistics for user
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const totalAddictions = await Addiction.countDocuments({ userId });
    const activeAddictions = await Addiction.countDocuments({ userId, status: 'active' });
    const recoveringAddictions = await Addiction.countDocuments({ userId, status: 'recovering' });
    const cleanAddictions = await Addiction.countDocuments({ userId, status: 'clean' });
    
    // Get addiction type distribution
    const typeStats = await Addiction.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Calculate total days clean across all recovering addictions
    const recoveringAddictionsData = await Addiction.find({ 
      userId, 
      status: { $in: ['recovering', 'clean'] }
    });
    
    const totalDaysClean = recoveringAddictionsData.reduce((total, addiction) => {
      return total + addiction.getDaysClean();
    }, 0);
    
    res.json({
      success: true,
      stats: {
        totalAddictions,
        activeAddictions,
        recoveringAddictions,
        cleanAddictions,
        totalDaysClean,
        typeStats
      }
    });
  } catch (error) {
    console.error('Error fetching addiction stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch addiction statistics' });
  }
});

module.exports = router;