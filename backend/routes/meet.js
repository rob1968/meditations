const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UserConnection = require('../models/UserConnection');
const mongoose = require('mongoose');
const { auth, optionalAuth } = require('../middleware/auth');

// Apply authentication to all routes - using standardized auth middleware
router.use(auth);

// ============ USER DISCOVERY ============

// Get users for discovery (with filtering)
router.get('/discover', async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      minAge, 
      maxAge, 
      maxDistance, 
      gender, 
      interests, 
      location,
      page = 1,
      limit = 20
    } = req.query;
    
    let filter = {
      _id: { $ne: userId }, // Exclude current user
      bio: { $exists: true, $ne: '' } // Only users with bios
    };
    
    // Age filtering
    if (minAge || maxAge) {
      const now = new Date();
      if (maxAge) {
        const minBirthDate = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
        filter.birthDate = { $gte: minBirthDate };
      }
      if (minAge) {
        const maxBirthDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
        filter.birthDate = { ...filter.birthDate, $lte: maxBirthDate };
      }
    }
    
    // Gender filtering
    if (gender && gender !== 'all') {
      filter.gender = gender;
    }
    
    // Location filtering (basic city/country match)
    if (location) {
      filter.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.country': new RegExp(location, 'i') }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    let users = await User.find(filter)
      .select('username bio location birthDate profileImage meditationCount createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ lastLogin: -1 });
    
    // Filter out already connected users
    const connectedUserIds = await UserConnection.find({
      $or: [
        { requester: userId },
        { recipient: userId }
      ],
      status: { $in: ['accepted', 'pending', 'blocked'] }
    }).distinct('requester recipient');
    
    users = users.filter(user => 
      !connectedUserIds.some(connectedId => connectedId.equals(user._id))
    );
    
    // Calculate ages and add mock data for demonstration
    const usersWithAge = users.map(user => {
      const userObj = user.toObject();
      
      // Calculate age
      if (user.birthDate) {
        const age = Math.floor((Date.now() - user.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        userObj.age = age;
      }
      
      // Mock distance calculation (replace with real geolocation)
      userObj.distance = Math.random() * 50 + 1; // 1-50km
      userObj.isOnline = Math.random() > 0.7; // 30% online
      userObj.journalCount = Math.floor(Math.random() * 200) + 10;
      userObj.meditationCount = userObj.meditationCount || Math.floor(Math.random() * 100) + 5;
      
      // Mock interests based on bio keywords
      const interests = [];
      const bio = userObj.bio || '';
      if (bio.includes('mindfulness') || bio.includes('meditatie')) interests.push('mindfulness');
      if (bio.includes('yoga')) interests.push('yoga');
      if (bio.includes('stress')) interests.push('stress-management');
      if (bio.includes('natuur') || bio.includes('nature')) interests.push('nature');
      if (bio.includes('burn-out')) interests.push('burn-out recovery');
      userObj.interests = interests.length > 0 ? interests : ['meditation', 'wellness'];
      
      return userObj;
    });
    
    res.json({
      users: usersWithAge,
      page: parseInt(page),
      hasMore: users.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching discovery users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============ USER CONNECTIONS ============

// Send connection request
router.post('/connect', async (req, res) => {
  try {
    const { targetUserId, message } = req.body;
    const requesterId = req.user._id;
    
    if (requesterId.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }
    
    // Check if connection already exists
    const existingConnection = await UserConnection.findConnection(requesterId, targetUserId);
    if (existingConnection) {
      return res.status(400).json({ error: 'Connection already exists' });
    }
    
    // Create connection request
    const connection = await UserConnection.createConnection(requesterId, targetUserId, 'discovery');
    
    res.json({ 
      success: true, 
      connectionId: connection._id,
      message: 'Connection request sent'
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// Get user's connections
router.get('/connections', async (req, res) => {
  try {
    const userId = req.user._id;
    const { status = 'accepted' } = req.query;
    
    const connections = await UserConnection.getUserConnections(userId, status);
    
    // Format connections with other user info
    const formattedConnections = connections.map(connection => {
      const otherUser = connection.requester._id.equals(userId) 
        ? connection.recipient 
        : connection.requester;
      
      return {
        connectionId: connection._id,
        user: otherUser,
        connectionScore: connection.connectionScore,
        connectedAt: connection.acceptedAt || connection.createdAt,
        lastInteraction: connection.interactions.lastInteraction
      };
    });
    
    res.json({ connections: formattedConnections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Get pending connection requests
router.get('/connections/pending', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const incomingRequests = await UserConnection.getPendingRequests(userId);
    const sentRequests = await UserConnection.getSentRequests(userId);
    
    res.json({
      incoming: incomingRequests,
      sent: sentRequests
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Accept/reject connection request
router.put('/connections/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const userId = req.user._id;
    
    const connection = await UserConnection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Only recipient can accept/reject
    if (!connection.recipient.equals(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (action === 'accept') {
      await connection.accept();
      
      // Create a direct conversation between the users
      const conversation = await Conversation.create({
        participants: [connection.requester, connection.recipient],
        type: 'direct',
        createdBy: connection.requester
      });
      
      res.json({ 
        success: true, 
        message: 'Connection accepted',
        conversationId: conversation._id
      });
    } else if (action === 'reject') {
      await connection.reject();
      res.json({ success: true, message: 'Connection rejected' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// ============ CONVERSATIONS ============

// Get user's conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Handle demo users - return empty conversations
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Demo user detected, returning empty conversations');
      return res.json({ conversations: [] });
    }
    
    const conversations = await Conversation.findUserConversations(userId);
    
    // Add unread message counts
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.getUnreadCount(conversation._id, userId);
        const conversationObj = conversation.toObject();
        conversationObj.unreadCount = unreadCount;
        
        // For direct conversations, get the other participant
        if (conversation.type === 'direct') {
          const otherParticipant = conversation.participants.find(p => !p._id.equals(userId));
          conversationObj.otherUser = otherParticipant;
        }
        
        return conversationObj;
      })
    );
    
    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation messages
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;
    
    console.log('🔍 Fetching messages for conversation:', conversationId, 'user:', userId);
    
    // Check if user is participant
    let conversation;
    try {
      conversation = await Conversation.findById(conversationId);
    } catch (findError) {
      console.log('Conversation not found, returning demo messages');
    }
    
    if (!conversation) {
      // Return demo messages for testing
      console.log('📋 Returning demo messages for conversation:', conversationId);
      const demoMessages = [
        {
          _id: 'demo1',
          sender: { _id: 'other-user', username: 'Demo Deelnemer' },
          content: { text: 'Hallo! Welkom bij de Meet chat functie.', type: 'text' },
          createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          isDeleted: false
        },
        {
          _id: 'demo2',
          sender: { _id: userId, username: req.user.username || 'Jij' },
          content: { text: 'Hallo! Dit ziet er geweldig uit!', type: 'text' },
          createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
          isDeleted: false
        },
        {
          _id: 'demo3',
          sender: { _id: 'other-user', username: 'Demo Deelnemer' },
          content: { text: 'Ja, de nieuwe Telegram-stijl ziet er heel modern uit! 🚀', type: 'text' },
          createdAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
          isDeleted: false
        },
        {
          _id: 'demo4',
          sender: { _id: userId, username: req.user.username || 'Jij' },
          content: { text: 'De glasmorfisme effecten zijn echt mooi!', type: 'text' },
          createdAt: new Date().toISOString(),
          isDeleted: false
        }
      ];
      
      return res.json({
        messages: demoMessages,
        page: parseInt(page),
        hasMore: false
      });
    }
    
    if (!conversation.isParticipant(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('🔧 Using native MongoDB query to fetch messages for conversation:', conversationId);
    // Use native MongoDB query to completely avoid Mongoose populate issues
    const mongoose = require('mongoose');
    const messages = await mongoose.connection.db.collection('messages').find({
      conversation: new mongoose.Types.ObjectId(conversationId),
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .toArray();
    
    // Manual populate for basic sender info
    const User = require('../models/User');
    for (let message of messages) {
      if (message.sender) {
        const sender = await User.findById(message.sender).select('username profileImage').lean();
        message.sender = sender;
      }
    }
    
    res.json({ 
      messages: messages.reverse(), // Oldest first for display
      page: parseInt(page),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, type = 'text', replyTo } = req.body;
    const userId = req.user._id;
    
    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Create message
    const messageData = {
      conversation: conversationId,
      sender: userId,
      content: { text, type }
    };
    
    if (replyTo) {
      messageData.replyTo = replyTo;
    }
    
    const message = await Message.create(messageData);
    
    // Update conversation's last message
    await conversation.updateLastMessage({
      text: text,
      sender: userId,
      timestamp: message.createdAt
    });
    
    // Populate sender info for response
    await message.populate('sender', 'username profileImage');
    
    res.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark conversation as read
router.post('/conversations/:conversationId/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    
    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Message.markConversationAsRead(conversationId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ============ GROUP FUNCTIONALITY ============

// Get groups for discovery
router.get('/groups/discover', async (req, res) => {
  try {
    const { tags, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;
    
    let filter = {
      type: 'group',
      privacy: { $in: ['open', 'invite_only'] },
      isActive: true,
      participants: { $ne: userId } // Exclude groups user is already in
    };
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filter.tags = { $in: tagArray };
    }
    
    const skip = (page - 1) * limit;
    
    const groups = await Conversation.find(filter)
      .populate('createdBy', 'username profileImage')
      .select('name description memberCount tags privacy createdAt participants')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ messageCount: -1, createdAt: -1 });
    
    // Add member count
    const groupsWithCount = groups.map(group => {
      const groupObj = group.toObject();
      groupObj.memberCount = group.participants.length;
      return groupObj;
    });
    
    res.json({
      groups: groupsWithCount,
      page: parseInt(page),
      hasMore: groups.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching discover groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get user's groups
router.get('/groups/my', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const groups = await Conversation.find({
      type: 'group',
      participants: userId,
      isActive: true
    })
    .populate('createdBy', 'username profileImage')
    .select('name description messageCount tags privacy createdAt participants lastMessage')
    .sort({ 'lastMessage.timestamp': -1 });
    
    // Add unread counts and member counts
    const groupsWithData = await Promise.all(
      groups.map(async (group) => {
        const unreadCount = await Message.getUnreadCount(group._id, userId);
        const groupObj = group.toObject();
        groupObj.unreadCount = unreadCount;
        groupObj.memberCount = group.participants.length;
        return groupObj;
      })
    );
    
    res.json({ groups: groupsWithData });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
});

// Create new group
router.post('/groups', async (req, res) => {
  try {
    const { name, description, privacy = 'open', tags = [] } = req.body;
    const userId = req.user._id;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    const group = await Conversation.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      type: 'group',
      privacy,
      tags: tags.map(tag => tag.trim().toLowerCase()),
      participants: [userId],
      admins: [userId],
      createdBy: userId
    });
    
    await group.populate('createdBy', 'username profileImage');
    
    res.json({ group });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Join group
router.post('/groups/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;
    
    const group = await Conversation.findById(groupId);
    if (!group || group.type !== 'group') {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (group.isParticipant(userId)) {
      return res.status(400).json({ error: 'Already a member' });
    }
    
    if (group.privacy === 'open') {
      // Join immediately
      await group.addParticipant(userId);
      
      // Create system message
      await Message.create({
        conversation: groupId,
        sender: userId,
        content: {
          type: 'system',
          systemType: 'user_joined',
          text: `${req.user.username} joined the group`
        }
      });
      
      res.json({ success: true, message: 'Joined group successfully' });
    } else {
      // Send join request
      await group.addMemberRequest(userId, message);
      res.json({ success: true, message: 'Join request sent' });
    }
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// ============ MATCHING SYSTEM ============

// Get smart matches for user
router.get('/matches', async (req, res) => {
  try {
    const userId = req.user._id;
    const user = req.user;
    
    // Get users that could be good matches
    const potentialMatches = await User.find({
      _id: { $ne: userId },
      bio: { $exists: true, $ne: '' },
      location: { $exists: true }
    }).select('username bio location birthDate profileImage meditationCount createdAt');
    
    // Filter out already connected users
    const connectedUserIds = await UserConnection.find({
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    }).distinct('requester recipient');
    
    const unconnectedUsers = potentialMatches.filter(u => 
      !connectedUserIds.some(connectedId => connectedId.equals(u._id))
    );
    
    // Calculate match scores (simplified algorithm)
    const matches = unconnectedUsers.map(matchUser => {
      let score = 0;
      const reasons = [];
      
      // Location matching
      if (user.location && matchUser.location) {
        if (user.location.city === matchUser.location.city) {
          score += 30;
          reasons.push(`Beide in ${user.location.city}`);
        } else if (user.location.country === matchUser.location.country) {
          score += 15;
          reasons.push(`Beide in ${user.location.country}`);
        }
      }
      
      // Age compatibility (within 10 years)
      if (user.birthDate && matchUser.birthDate) {
        const userAge = Math.floor((Date.now() - user.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        const matchAge = Math.floor((Date.now() - matchUser.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        const ageDiff = Math.abs(userAge - matchAge);
        
        if (ageDiff <= 5) {
          score += 20;
          reasons.push('Vergelijkbare leeftijd');
        } else if (ageDiff <= 10) {
          score += 10;
          reasons.push('Passende leeftijd');
        }
      }
      
      // Bio keyword matching
      if (user.bio && matchUser.bio) {
        const userBio = user.bio.toLowerCase();
        const matchBio = matchUser.bio.toLowerCase();
        
        const keywords = ['mindfulness', 'meditatie', 'stress', 'burn-out', 'yoga', 'wellness', 'herstel'];
        const commonKeywords = keywords.filter(keyword => 
          userBio.includes(keyword) && matchBio.includes(keyword)
        );
        
        score += commonKeywords.length * 10;
        if (commonKeywords.length > 0) {
          reasons.push(`Beide geïnteresseerd in ${commonKeywords[0]}`);
        }
      }
      
      // Activity level matching
      const userMeditations = user.meditations ? user.meditations.length : 0;
      const matchMeditations = matchUser.meditationCount || 0;
      
      if (userMeditations > 10 && matchMeditations > 10) {
        score += 15;
        reasons.push('Beide actief in meditatie');
      }
      
      // Add random factor for demo
      score += Math.floor(Math.random() * 20);
      
      return {
        _id: `match_${matchUser._id}`,
        user: {
          ...matchUser.toObject(),
          distance: Math.random() * 50 + 1,
          isOnline: Math.random() > 0.7,
          age: matchUser.birthDate ? Math.floor((Date.now() - matchUser.birthDate) / (365.25 * 24 * 60 * 60 * 1000)) : null,
          interests: ['mindfulness', 'meditation', 'wellness'], // Mock
          journalCount: Math.floor(Math.random() * 100) + 10
        },
        matchScore: Math.min(score, 100),
        reasons: reasons.slice(0, 3), // Top 3 reasons
        createdAt: new Date()
      };
    });
    
    // Sort by match score and return top matches
    const topMatches = matches
      .filter(match => match.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
    
    res.json({ matches: topMatches });
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

module.exports = router;