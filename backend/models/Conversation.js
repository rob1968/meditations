const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  
  // For group conversations
  name: {
    type: String,
    trim: true,
    maxlength: 100,
    required: function() { return this.type === 'group'; }
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Group settings
  privacy: {
    type: String,
    enum: ['open', 'closed', 'invite_only'],
    default: 'open',
    required: function() { return this.type === 'group'; }
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Group admin/moderator system
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Last message info for sorting conversations
  lastMessage: {
    text: {
      type: String,
      trim: true,
      maxlength: 500
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Message count for groups
  messageCount: {
    type: Number,
    default: 0
  },
  
  // For group member management
  memberRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  
  // Track muted conversations per user
  mutedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mutedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Activity tracking
  isActive: {
    type: Boolean,
    default: true
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

// Index for efficient queries
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ 'lastMessage.timestamp': -1 });
ConversationSchema.index({ tags: 1 });
ConversationSchema.index({ privacy: 1 });

// Update timestamp on save
ConversationSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Instance methods
ConversationSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

ConversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(id => !id.equals(userId));
  return this.save();
};

ConversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(id => id.equals(userId));
};

ConversationSchema.methods.isAdmin = function(userId) {
  return this.admins.some(id => id.equals(userId));
};

ConversationSchema.methods.addAdmin = function(userId) {
  if (!this.admins.includes(userId)) {
    this.admins.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

ConversationSchema.methods.removeAdmin = function(userId) {
  this.admins = this.admins.filter(id => !id.equals(userId));
  return this.save();
};

ConversationSchema.methods.updateLastMessage = function(messageData) {
  this.lastMessage = {
    text: messageData.text,
    sender: messageData.sender,
    timestamp: messageData.timestamp || Date.now()
  };
  this.messageCount += 1;
  return this.save();
};

ConversationSchema.methods.addMemberRequest = function(userId, message) {
  // Check if request already exists
  const existingRequest = this.memberRequests.find(req => req.user.equals(userId));
  if (existingRequest) {
    return Promise.resolve(this);
  }
  
  this.memberRequests.push({
    user: userId,
    message: message || ''
  });
  return this.save();
};

ConversationSchema.methods.removeMemberRequest = function(userId) {
  this.memberRequests = this.memberRequests.filter(req => !req.user.equals(userId));
  return this.save();
};

ConversationSchema.methods.muteForUser = function(userId) {
  // Check if already muted
  const alreadyMuted = this.mutedBy.find(mute => mute.user.equals(userId));
  if (alreadyMuted) {
    return Promise.resolve(this);
  }
  
  this.mutedBy.push({ user: userId });
  return this.save();
};

ConversationSchema.methods.unmuteForUser = function(userId) {
  this.mutedBy = this.mutedBy.filter(mute => !mute.user.equals(userId));
  return this.save();
};

ConversationSchema.methods.isMutedByUser = function(userId) {
  return this.mutedBy.some(mute => mute.user.equals(userId));
};

// Static methods
ConversationSchema.statics.findByParticipants = function(participants) {
  return this.find({
    participants: { $all: participants, $size: participants.length },
    type: 'direct'
  });
};

ConversationSchema.statics.findGroupsByTags = function(tags) {
  return this.find({
    type: 'group',
    tags: { $in: tags },
    privacy: { $in: ['open', 'invite_only'] },
    isActive: true
  }).populate('createdBy', 'username profileImage');
};

ConversationSchema.statics.findUserConversations = function(userId) {
  return this.find({
    participants: userId,
    isActive: true
  })
  .populate('participants', 'username profileImage location bio')
  .populate('lastMessage.sender', 'username')
  .sort({ 'lastMessage.timestamp': -1 });
};

module.exports = mongoose.model('Conversation', ConversationSchema);