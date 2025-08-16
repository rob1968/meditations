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