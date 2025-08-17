const mongoose = require('mongoose');

const JournalGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  privacy: {
    type: String,
    enum: ['open', 'invite_only', 'closed'],
    default: 'invite_only'
  },
  
  groupImage: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  memberCount: {
    type: Number,
    default: 0
  },
  
  entryCount: {
    type: Number,
    default: 0
  },
  
  // Social features integration
  linkedConversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  
  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Join requests for closed/invite-only groups
  joinRequests: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 200
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Meeting/event functionality
  events: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    scheduledFor: {
      type: Date,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    attendees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    requireApprovalForPosts: {
      type: Boolean,
      default: false
    },
    allowAudioSharing: {
      type: Boolean,
      default: true
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update member count when members array changes
JournalGroupSchema.methods.updateMemberCount = function() {
  this.memberCount = this.members.filter(member => member.isActive).length;
  return this.save();
};

// Method to add a member
JournalGroupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (!existingMember) {
    this.members.push({ userId, role, isActive: true });
    return this.updateMemberCount();
  } else if (!existingMember.isActive) {
    existingMember.isActive = true;
    existingMember.joinedAt = new Date();
    return this.updateMemberCount();
  }
  
  return Promise.resolve(this);
};

// Method to remove a member
JournalGroupSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
    return this.updateMemberCount();
  }
  
  return Promise.resolve(this);
};

// Method to check if user is member
JournalGroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.userId.toString() === userId.toString() && member.isActive
  );
};

// Method to check if user is admin
JournalGroupSchema.methods.isAdmin = function(userId) {
  return this.members.some(member => 
    member.userId.toString() === userId.toString() && 
    member.isActive && 
    member.role === 'admin'
  );
};

// Method to get active members
JournalGroupSchema.methods.getActiveMembers = function() {
  return this.members.filter(member => member.isActive);
};

// Method to create linked conversation for social features
JournalGroupSchema.methods.createLinkedConversation = async function() {
  if (this.linkedConversation) {
    return this.linkedConversation; // Already has linked conversation
  }
  
  const Conversation = require('./Conversation');
  
  const conversation = await Conversation.create({
    name: `${this.name} - Groepschat`,
    description: `Groepschat voor ${this.name}`,
    type: 'group',
    privacy: this.privacy,
    tags: [...this.tags, 'journal-group'],
    participants: this.getActiveMembers().map(member => member.userId),
    admins: this.members.filter(m => m.role === 'admin' && m.isActive).map(m => m.userId),
    createdBy: this.createdBy
  });
  
  this.linkedConversation = conversation._id;
  await this.save();
  
  return conversation;
};

// Method to add join request
JournalGroupSchema.methods.addJoinRequest = function(userId, message = '') {
  // Check if request already exists
  const existingRequest = this.joinRequests.find(req => 
    req.userId.toString() === userId.toString() && req.status === 'pending'
  );
  
  if (existingRequest) {
    return Promise.resolve(this);
  }
  
  this.joinRequests.push({
    userId,
    message,
    status: 'pending'
  });
  
  return this.save();
};

// Method to handle join request
JournalGroupSchema.methods.handleJoinRequest = async function(requestId, action, adminUserId) {
  const request = this.joinRequests.id(requestId);
  if (!request) {
    throw new Error('Join request not found');
  }
  
  // Verify admin permissions
  if (!this.isAdmin(adminUserId)) {
    throw new Error('Only admins can handle join requests');
  }
  
  request.status = action; // 'approved' or 'rejected'
  
  if (action === 'approved') {
    await this.addMember(request.userId);
    
    // Add to linked conversation if exists
    if (this.linkedConversation) {
      const Conversation = require('./Conversation');
      const conversation = await Conversation.findById(this.linkedConversation);
      if (conversation) {
        await conversation.addParticipant(request.userId);
      }
    }
  }
  
  return this.save();
};

// Method to create group event
JournalGroupSchema.methods.createEvent = function(eventData, creatorUserId) {
  if (!this.isAdmin(creatorUserId)) {
    throw new Error('Only admins can create events');
  }
  
  this.events.push({
    title: eventData.title,
    description: eventData.description || '',
    scheduledFor: eventData.scheduledFor,
    createdBy: creatorUserId,
    attendees: [creatorUserId] // Creator auto-attends
  });
  
  this.lastActivity = Date.now();
  return this.save();
};

// Method to join event
JournalGroupSchema.methods.joinEvent = function(eventId, userId) {
  if (!this.isMember(userId)) {
    throw new Error('Only group members can join events');
  }
  
  const event = this.events.id(eventId);
  if (!event) {
    throw new Error('Event not found');
  }
  
  if (!event.attendees.includes(userId)) {
    event.attendees.push(userId);
  }
  
  return this.save();
};

// Method to update activity timestamp
JournalGroupSchema.methods.updateActivity = function() {
  this.lastActivity = Date.now();
  return this.save();
};

// Update timestamps on save
JournalGroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better performance
JournalGroupSchema.index({ createdBy: 1 });
JournalGroupSchema.index({ 'members.userId': 1 });
JournalGroupSchema.index({ privacy: 1 });
JournalGroupSchema.index({ tags: 1 });
JournalGroupSchema.index({ createdAt: -1 });

// Text index for search functionality
JournalGroupSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('JournalGroup', JournalGroupSchema);