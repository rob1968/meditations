const mongoose = require('mongoose');

const UserConnectionSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending'
  },
  
  // Connection strength based on interactions
  connectionScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Interaction tracking
  interactions: {
    messagesExchanged: {
      type: Number,
      default: 0
    },
    meditationsShared: {
      type: Number,
      default: 0
    },
    lastInteraction: {
      type: Date
    }
  },
  
  // Connection reason/context
  connectionReason: {
    type: String,
    enum: ['discovery', 'match', 'group', 'meditation_share', 'manual', 'recovery_support'],
    default: 'discovery'
  },
  
  // Matching data (if connected through matching system)
  matchData: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    reasons: [{
      type: String,
      trim: true
    }],
    matchedAt: {
      type: Date
    }
  },
  
  // Privacy settings
  isHidden: {
    type: Boolean,
    default: false
  },
  
  // Notes between users (private)
  notes: {
    requesterNotes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    recipientNotes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  acceptedAt: {
    type: Date
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
UserConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });
UserConnectionSchema.index({ requester: 1, status: 1 });
UserConnectionSchema.index({ recipient: 1, status: 1 });
UserConnectionSchema.index({ status: 1, createdAt: -1 });
UserConnectionSchema.index({ connectionScore: -1 });

// Update timestamp on save
UserConnectionSchema.pre('save', function() {
  this.lastUpdated = Date.now();
});

// Instance methods
UserConnectionSchema.methods.accept = function() {
  this.status = 'accepted';
  this.acceptedAt = Date.now();
  this.connectionScore = 10; // Initial connection score
  return this.save();
};

UserConnectionSchema.methods.reject = function() {
  this.status = 'rejected';
  return this.save();
};

UserConnectionSchema.methods.block = function() {
  this.status = 'blocked';
  return this.save();
};

UserConnectionSchema.methods.addInteraction = function(type) {
  const interactions = this.interactions;
  
  switch(type) {
    case 'message':
      interactions.messagesExchanged += 1;
      this.connectionScore = Math.min(this.connectionScore + 1, 100);
      break;
    case 'meditation_share':
      interactions.meditationsShared += 1;
      this.connectionScore = Math.min(this.connectionScore + 3, 100);
      break;
  }
  
  interactions.lastInteraction = Date.now();
  return this.save();
};

UserConnectionSchema.methods.updateNotes = function(userId, notes) {
  if (this.requester.equals(userId)) {
    this.notes.requesterNotes = notes;
  } else if (this.recipient.equals(userId)) {
    this.notes.recipientNotes = notes;
  }
  return this.save();
};

UserConnectionSchema.methods.getNotes = function(userId) {
  if (this.requester.equals(userId)) {
    return this.notes.requesterNotes;
  } else if (this.recipient.equals(userId)) {
    return this.notes.recipientNotes;
  }
  return null;
};

UserConnectionSchema.methods.getOtherUser = function(userId) {
  if (this.requester.equals(userId)) {
    return this.recipient;
  } else if (this.recipient.equals(userId)) {
    return this.requester;
  }
  return null;
};

UserConnectionSchema.methods.isBlocked = function() {
  return this.status === 'blocked';
};

UserConnectionSchema.methods.isConnected = function() {
  return this.status === 'accepted';
};

UserConnectionSchema.methods.isPending = function() {
  return this.status === 'pending';
};

// Static methods
UserConnectionSchema.statics.findConnection = function(user1Id, user2Id) {
  return this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id },
      { requester: user2Id, recipient: user1Id }
    ]
  });
};

UserConnectionSchema.statics.getUserConnections = function(userId, status = 'accepted') {
  return this.find({
    $or: [
      { requester: userId, status: status },
      { recipient: userId, status: status }
    ],
    isHidden: false
  })
  .populate('requester', 'username profileImage location bio meditationCount')
  .populate('recipient', 'username profileImage location bio meditationCount')
  .sort({ connectionScore: -1, lastUpdated: -1 });
};

UserConnectionSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    recipient: userId,
    status: 'pending'
  })
  .populate('requester', 'username profileImage location bio')
  .sort({ createdAt: -1 });
};

UserConnectionSchema.statics.getSentRequests = function(userId) {
  return this.find({
    requester: userId,
    status: 'pending'
  })
  .populate('recipient', 'username profileImage location bio')
  .sort({ createdAt: -1 });
};

UserConnectionSchema.statics.getTopConnections = function(userId, limit = 10) {
  return this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ],
    isHidden: false
  })
  .populate('requester', 'username profileImage')
  .populate('recipient', 'username profileImage')
  .sort({ connectionScore: -1, 'interactions.lastInteraction': -1 })
  .limit(limit);
};

UserConnectionSchema.statics.areConnected = function(user1Id, user2Id) {
  return this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id, status: 'accepted' },
      { requester: user2Id, recipient: user1Id, status: 'accepted' }
    ]
  });
};

UserConnectionSchema.statics.isBlocked = function(user1Id, user2Id) {
  return this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id, status: 'blocked' },
      { requester: user2Id, recipient: user1Id, status: 'blocked' }
    ]
  });
};

UserConnectionSchema.statics.createConnection = function(requesterId, recipientId, reason = 'discovery', matchData = null) {
  const connectionData = {
    requester: requesterId,
    recipient: recipientId,
    connectionReason: reason
  };
  
  if (matchData) {
    connectionData.matchData = {
      score: matchData.score,
      reasons: matchData.reasons,
      matchedAt: Date.now()
    };
  }
  
  return this.create(connectionData);
};

module.exports = mongoose.model('UserConnection', UserConnectionSchema);