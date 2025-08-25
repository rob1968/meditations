const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const ActivityCategory = require('../models/ActivityCategory');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { auth } = require('../middleware/auth');

// Auto-status checker function
const updateActivityStatuses = async () => {
  try {
    const activities = await Activity.find({
      status: { $in: ['published', 'upcoming'] },
      date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Activities from last 24h to next...
    });
    
    for (const activity of activities) {
      await activity.updateStatus();
    }
    
    console.log(`📅 Updated status for ${activities.length} activities`);
  } catch (error) {
    console.error('❌ Error updating activity statuses:', error);
  }
};

// Run status update every 30 minutes
setInterval(updateActivityStatuses, 30 * 60 * 1000);
// Run once on startup
setTimeout(updateActivityStatuses, 5000);


// Seed categories on first run
router.post('/categories/seed', async (req, res) => {
  try {
    const categories = await ActivityCategory.seedCategories();
    res.json({ success: true, message: 'Categories seeded', categories });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({ error: 'Failed to seed categories' });
  }
});

// Get all activity categories (no auth needed)
router.get('/categories', async (req, res) => {
  try {
    const categories = await ActivityCategory.find({ isActive: true }).sort('order');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get recommended activities (MUST come before /:id route)
router.get('/recommendations', auth, async (req, res) => {
  try {
    const recommendations = await req.user.getActivityRecommendations();
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Get activities (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      category, 
      date, 
      city, 
      maxDistance, 
      minParticipants,
      maxParticipants,
      ageMin,
      ageMax,
      language,
      page = 1,
      limit = 20
    } = req.query;
    
    const query = {
      status: { $in: ['published', 'upcoming'] },
      date: { $gte: new Date() }
    };
    
    // Apply filters
    if (category) query.category = category;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (language) query.language = language;
    if (minParticipants) query.minParticipants = { $gte: parseInt(minParticipants) };
    if (maxParticipants) query.maxParticipants = { $lte: parseInt(maxParticipants) };
    if (ageMin) query['ageRange.min'] = { $gte: parseInt(ageMin) };
    if (ageMax) query['ageRange.max'] = { $lte: parseInt(ageMax) };
    
    // Handle location-based search
    if (maxDistance && req.user.location?.coordinates) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              req.user.location.coordinates.longitude,
              req.user.location.coordinates.latitude
            ]
          },
          $maxDistance: parseInt(maxDistance) * 1000 // Convert km to meters
        }
      };
    }
    
    const skip = (page - 1) * limit;
    
    const activities = await Activity.find(query)
      .populate('organizer', 'username profileImage trustScore isVerified')
      .populate('category')
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Activity.countDocuments(query);
    
    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activities user is participating in
router.get('/user/participating', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Activities I'm participating in (not organizing)
    const activities = await Activity.find({
      'participants.user': userId,
      organizer: { $ne: userId },
      status: { $ne: 'cancelled' },
      date: { $gte: new Date() }
    })
    .populate('organizer', 'username profileImage isVerified')
    .populate('category')
    .sort({ date: 1 });
    
    console.log(`📋 Found ${activities.length} participating activities for user ${userId}`);
    
    res.json({
      activities,
      count: activities.length
    });
  } catch (error) {
    console.error('Error fetching participating activities:', error);
    res.status(500).json({ error: 'Failed to fetch participating activities' });
  }
});

// Get single activity (MUST come after specific routes like /recommendations and /user/*)
router.get('/:id', auth, async (req, res) => {
  try {
    // Validate that id is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid activity ID format' });
    }

    const activity = await Activity.findById(req.params.id)
      .populate('organizer', 'username profileImage bio trustScore isVerified')
      .populate('category')
      .populate('participants.user', 'username profileImage')
      .populate('waitlist.user', 'username');
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Increment view count
    activity.viewCount += 1;
    await activity.save();
    
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Create new activity
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      date,
      startTime,
      duration,
      minParticipants,
      maxParticipants,
      privacy,
      ageRange,
      genderPreference,
      language,
      tags,
      requiredInterests,
      cost,
      coverPhoto
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !category || !location || !date || !startTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, category, location, date, startTime' 
      });
    }
    
    // Create activity
    const activity = new Activity({
      title,
      description,
      category,
      location,
      date,
      startTime,
      duration: duration || 120,
      organizer: req.user._id,
      participants: [{ user: req.user._id, status: 'confirmed' }], // Organizer auto-joins
      minParticipants: minParticipants || 3,
      maxParticipants: maxParticipants || 10,
      privacy: privacy || 'public',
      ageRange: ageRange || { min: 18, max: 99 },
      genderPreference: genderPreference || 'any',
      language: language || req.user.preferredLanguage || 'nl',
      tags: tags || [],
      requiredInterests: requiredInterests || [],
      cost: cost || { amount: 0, splitMethod: 'pay_own' },
      coverPhoto,
      status: 'pending_approval'
    });
    
    await activity.save();
    
    // Create conversation for the activity
    const conversation = new Conversation({
      participants: [req.user._id],
      type: 'group',
      createdBy: req.user._id,
      name: title,
      metadata: {
        activityId: activity._id,
        name: title,
        description: `Chat voor activiteit: ${title}`
      }
    });
    
    await conversation.save();
    
    // Link conversation to activity
    activity.conversationId = conversation._id;
    await activity.save();
    
    // Update user stats
    await req.user.incrementOrganizedActivities();
    
    // Increment category count
    const categoryDoc = await ActivityCategory.findById(category);
    if (categoryDoc) {
      await categoryDoc.incrementActivityCount();
    }
    
    res.status(201).json({ 
      success: true, 
      activity,
      message: 'Activiteit succesvol aangemaakt' 
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    console.error('Request body:', req.body);
    console.error('Validation error details:', error.errors);
    res.status(500).json({ 
      error: 'Failed to create activity',
      details: error.message,
      validationErrors: error.errors
    });
  }
});

// Update activity
router.put('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Check if user is organizer
    if (activity.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only organizer can update activity' });
    }
    
    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'location', 'date', 'startTime', 
      'duration', 'minParticipants', 'maxParticipants', 'privacy',
      'ageRange', 'genderPreference', 'language', 'tags', 'requiredInterests', 'cost',
      'coverPhoto', 'photos'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        activity[field] = req.body[field];
      }
    });
    
    activity.updatedAt = new Date();
    await activity.save();
    
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Join activity
router.post('/:id/join', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Don't allow organizer to join (they're automatically participant)
    if (activity.organizer.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Je bent al organisator en automatisch deelnemer van deze activiteit' });
    }
    
    // Check if user can join
    const canJoinResult = await req.user.canJoinActivity(activity);
    if (!canJoinResult.canJoin) {
      return res.status(400).json({ error: canJoinResult.reason });
    }
    
    const result = await activity.join(req.user._id);
    
    if (result.success) {
      // Add user to conversation
      if (activity.conversationId && !result.waitlist) {
        const conversation = await Conversation.findById(activity.conversationId);
        if (conversation && !conversation.participants.includes(req.user._id)) {
          conversation.participants.push(req.user._id);
          await conversation.save();
        }
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error joining activity:', error);
    res.status(500).json({ error: 'Failed to join activity' });
  }
});

// Leave activity
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Don't allow organizer to leave
    if (activity.organizer.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Organizer cannot leave activity' });
    }

    // Check 2-hour deadline for leaving activity
    const now = new Date();
    const activityDateTime = new Date(activity.date);
    const [hours, minutes] = activity.startTime.split(':');
    activityDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    const hoursUntilActivity = (activityDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilActivity <= 2 && hoursUntilActivity > 0) {
      return res.status(400).json({ 
        error: 'Je kunt je niet meer afmelden binnen 2 uur voor de start van de activiteit' 
      });
    }
    
    if (hoursUntilActivity <= 0) {
      return res.status(400).json({ 
        error: 'Je kunt je niet meer afmelden nadat de activiteit is begonnen' 
      });
    }
    
    const result = await activity.leave(req.user._id);
    
    if (result.success) {
      // Remove from conversation
      if (activity.conversationId) {
        const conversation = await Conversation.findById(activity.conversationId);
        if (conversation) {
          conversation.participants = conversation.participants.filter(
            p => p.toString() !== req.user._id.toString()
          );
          await conversation.save();
        }
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error leaving activity:', error);
    res.status(500).json({ error: 'Failed to leave activity' });
  }
});

// Check participant requirements
router.get('/:id/participant-check', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Check if user is organizer or participant
    const isOrganizer = activity.organizer.toString() === req.user._id.toString();
    const isParticipant = activity.participants.some(p => p.user.toString() === req.user._id.toString());
    
    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const participantCheck = activity.checkParticipantRequirement();
    
    res.json({
      ...participantCheck,
      isOrganizer,
      canCancel: isOrganizer && activity.status !== 'cancelled'
    });
  } catch (error) {
    console.error('Error checking participants:', error);
    res.status(500).json({ error: 'Failed to check participants' });
  }
});

// Cancel activity
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Check if user is organizer
    if (activity.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only organizer can cancel activity' });
    }
    
    const result = await activity.cancel(req.body.reason || 'Geen reden opgegeven');
    
    // TODO: Send notifications to all participants
    
    res.json(result);
  } catch (error) {
    console.error('Error cancelling activity:', error);
    res.status(500).json({ error: 'Failed to cancel activity' });
  }
});

// Get my activities (organized and participating)
router.get('/user/my-activities', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Activities I'm organizing
    const organizing = await Activity.find({
      organizer: userId,
      status: { $ne: 'cancelled' },
      date: { $gte: new Date() }
    })
    .populate('category')
    .sort({ date: 1 });
    
    // Activities I'm participating in
    const participating = await Activity.find({
      'participants.user': userId,
      organizer: { $ne: userId },
      status: { $ne: 'cancelled' },
      date: { $gte: new Date() }
    })
    .populate('organizer', 'username profileImage')
    .populate('category')
    .sort({ date: 1 });
    
    // Past activities
    const past = await Activity.find({
      $or: [
        { organizer: userId },
        { 'participants.user': userId }
      ],
      date: { $lt: new Date() }
    })
    .populate('organizer', 'username profileImage')
    .populate('category')
    .sort({ date: -1 })
    .limit(20);
    
    res.json({
      organizing,
      participating,
      past
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

// Get recommended activities (moved up to avoid route conflict)

// Rate activity (after completion)
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Check if activity is completed
    if (activity.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed activities' });
    }
    
    // Check if user participated
    const wasParticipant = activity.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (!wasParticipant) {
      return res.status(403).json({ error: 'Only participants can rate activities' });
    }
    
    // Check if already rated
    const alreadyRated = activity.reviews.some(
      r => r.user.toString() === req.user._id.toString()
    );
    
    if (alreadyRated) {
      return res.status(400).json({ error: 'Already rated this activity' });
    }
    
    // Add review
    activity.reviews.push({
      user: req.user._id,
      rating,
      comment
    });
    
    // Update average rating
    const totalRating = activity.reviews.reduce((sum, r) => sum + r.rating, 0);
    activity.averageRating = totalRating / activity.reviews.length;
    
    await activity.save();
    
    // Update user's activity history
    await req.user.updateActivityStats(activity._id, 'attended', rating);
    
    res.json({ success: true, message: 'Rating added successfully' });
  } catch (error) {
    console.error('Error rating activity:', error);
    res.status(500).json({ error: 'Failed to rate activity' });
  }
});

// Invite users to activity
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array required' });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Check if user is organizer
    if (activity.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only organizer can invite users' });
    }
    
    // Add invited users
    userIds.forEach(userId => {
      if (!activity.invitedUsers.includes(userId)) {
        activity.invitedUsers.push(userId);
      }
    });
    
    await activity.save();
    
    // TODO: Send invitation notifications
    
    res.json({ success: true, message: `${userIds.length} users invited` });
  } catch (error) {
    console.error('Error inviting users:', error);
    res.status(500).json({ error: 'Failed to invite users' });
  }
});

// Admin middleware - check if user has admin role and activity moderation permissions
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has admin role and activity moderation permissions
    if (req.user.role !== 'admin' || !req.user.permissions?.canModerateActivities) {
      console.log(`Access denied for user ${req.user.username}: role=${req.user.role}, canModerateActivities=${req.user.permissions?.canModerateActivities}`);
      return res.status(403).json({ error: 'Admin access required - need activity moderation permissions' });
    }
    
    console.log(`Admin access granted for user ${req.user.username} with role ${req.user.role}`);
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Admin authentication failed' });
  }
};

// ADMIN ROUTES - Get all activities for moderation
router.get('/admin/pending', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status === 'pending') {
      query.approvalStatus = 'pending';
    } else if (status === 'approved') {
      query.approvalStatus = 'approved';
    } else if (status === 'rejected') {
      query.approvalStatus = 'rejected';
    }

    const activities = await Activity.find(query)
      .populate('organizer', 'username profileImage trustScore isVerified')
      .populate('category', 'name emoji color')
      .populate('approvedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activities for admin:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ADMIN ROUTES - Approve activity
router.post('/admin/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Update approval status
    activity.approvalStatus = 'approved';
    activity.status = 'published';
    activity.approvedBy = req.user._id;
    activity.approvedAt = new Date();
    if (adminNotes) {
      activity.adminNotes = adminNotes;
    }

    await activity.save();

    console.log(`✅ Activity "${activity.title}" approved by admin ${req.user.username}`);

    res.json({
      success: true,
      message: 'Activity approved successfully',
      activity: {
        id: activity._id,
        title: activity.title,
        approvalStatus: activity.approvalStatus,
        status: activity.status,
        approvedAt: activity.approvedAt,
        adminNotes: activity.adminNotes
      }
    });
  } catch (error) {
    console.error('Error approving activity:', error);
    res.status(500).json({ error: 'Failed to approve activity' });
  }
});

// ADMIN ROUTES - Reject activity
router.post('/admin/:id/reject', auth, adminAuth, async (req, res) => {
  try {
    const { rejectionReason, adminNotes } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Update approval status
    activity.approvalStatus = 'rejected';
    activity.status = 'rejected';
    activity.approvedBy = req.user._id;
    activity.approvedAt = new Date();
    activity.rejectionReason = rejectionReason;
    if (adminNotes) {
      activity.adminNotes = adminNotes;
    }

    await activity.save();

    console.log(`❌ Activity "${activity.title}" rejected by admin ${req.user.username}. Reason: ${rejectionReason}`);

    res.json({
      success: true,
      message: 'Activity rejected successfully',
      activity: {
        id: activity._id,
        title: activity.title,
        approvalStatus: activity.approvalStatus,
        status: activity.status,
        approvedAt: activity.approvedAt,
        rejectionReason: activity.rejectionReason,
        adminNotes: activity.adminNotes
      }
    });
  } catch (error) {
    console.error('Error rejecting activity:', error);
    res.status(500).json({ error: 'Failed to reject activity' });
  }
});

// ADMIN ROUTES - Get activity statistics
router.get('/admin/stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = await Activity.aggregate([
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObj = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };

    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
      statsObj.total += stat.count;
    });

    // Get recent activities
    const recentActivities = await Activity.find()
      .populate('organizer', 'username')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title approvalStatus status createdAt organizer');

    res.json({
      stats: statsObj,
      recentActivities
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;