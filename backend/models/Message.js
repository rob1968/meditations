const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  content: {
    text: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    
    // For different message types
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'system', 'meditation_share'],
      default: 'text'
    },
    
    // For non-text messages
    mediaUrl: {
      type: String,
      trim: true
    },
    
    // For meditation shares
    sharedMeditation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meditation'
    },
    
    // For system messages
    systemType: {
      type: String,
      enum: ['user_joined', 'user_left', 'group_created', 'admin_added', 'admin_removed', 'group_settings_changed'],
      required: function() { return this.content.type === 'system'; }
    }
  },
  
  // Message status tracking
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Track who has read the message (for group chats)
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reply functionality
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // Message reactions (likes, hearts, etc.)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      trim: true,
      maxlength: 10
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // For editing messages
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editHistory: [{
    content: {
      type: String,
      trim: true
    },
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // For deleting messages
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ 'readBy.user': 1 });
MessageSchema.index({ isDeleted: 1 });

// Update timestamp on save
MessageSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Instance methods
MessageSchema.methods.markAsRead = function(userId) {
  // Check if already marked as read by this user
  const alreadyRead = this.readBy.find(read => read.user.equals(userId));
  if (alreadyRead) {
    return Promise.resolve(this);
  }
  
  this.readBy.push({ user: userId });
  return this.save();
};

MessageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.user.equals(userId));
};

MessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => !reaction.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji
  });
  
  return this.save();
};

MessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => !reaction.user.equals(userId));
  return this.save();
};

MessageSchema.methods.editMessage = function(newContent) {
  // Save current content to edit history
  if (this.content.text) {
    this.editHistory.push({
      content: this.content.text,
      editedAt: Date.now()
    });
  }
  
  this.content.text = newContent;
  this.isEdited = true;
  return this.save();
};

MessageSchema.methods.deleteMessage = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  this.deletedBy = deletedBy;
  return this.save();
};

MessageSchema.methods.canEdit = function(userId) {
  // Only sender can edit within 15 minutes of sending
  const fifteenMinutes = 15 * 60 * 1000;
  const timeLimit = new Date(this.createdAt.getTime() + fifteenMinutes);
  
  return this.sender.equals(userId) && Date.now() < timeLimit && !this.isDeleted;
};

MessageSchema.methods.canDelete = function(userId, isAdmin = false) {
  // Sender can always delete, admins can delete in group chats
  return this.sender.equals(userId) || isAdmin;
};

// Static methods
MessageSchema.statics.getConversationMessages = function(conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    conversation: conversationId,
    isDeleted: false
  })
  .populate('sender', 'username profileImage')
  .populate('replyTo', 'content.text sender')
  .populate('sharedMeditation', 'title type duration')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

MessageSchema.statics.getUnreadCount = function(conversationId, userId) {
  return this.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    readBy: { $not: { $elemMatch: { user: userId } } },
    isDeleted: false
  });
};

MessageSchema.statics.markConversationAsRead = function(conversationId, userId) {
  return this.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      readBy: { $not: { $elemMatch: { user: userId } } },
      isDeleted: false
    },
    {
      $push: { readBy: { user: userId, readAt: Date.now() } }
    }
  );
};

MessageSchema.statics.getRecentMessages = function(conversationIds, limit = 100) {
  return this.find({
    conversation: { $in: conversationIds },
    isDeleted: false
  })
  .populate('sender', 'username profileImage')
  .populate('conversation', 'type name participants')
  .sort({ createdAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Message', MessageSchema);