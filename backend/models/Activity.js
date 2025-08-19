const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    maxLength: 100,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxLength: 1000
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivityCategory',
    required: true
  },
  
  // Location Information
  location: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    placeId: String, // Google Places ID
    city: String,
    country: String
  },
  
  // Date and Time
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // Format: "HH:mm"
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    default: 120
  },
  
  // Participants
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['confirmed', 'maybe', 'cancelled'],
      default: 'confirmed'
    }
  }],
  waitlist: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Capacity
  minParticipants: {
    type: Number,
    default: 3,
    min: 2
  },
  maxParticipants: {
    type: Number,
    default: 10,
    max: 50
  },
  
  // Settings
  privacy: {
    type: String,
    enum: ['public', 'invite_only', 'friends_only'],
    default: 'public'
  },
  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ageRange: {
    min: {
      type: Number,
      default: 18
    },
    max: {
      type: Number,
      default: 99
    }
  },
  genderPreference: {
    type: String,
    enum: ['any', 'male', 'female', 'other'],
    default: 'any'
  },
  language: {
    type: String,
    default: 'nl'
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'published', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'pending_approval'
  },
  cancellationReason: String,
  
  // Admin Approval System
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  
  // Chat and Communication
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  announcements: [{
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Photos
  coverPhoto: String,
  photos: [String],
  
  // Tags and Interests
  tags: [String],
  requiredInterests: [String], // Interests that participants should have
  
  // Cost (optional)
  cost: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    description: String, // e.g., "Everyone pays their own"
    splitMethod: {
      type: String,
      enum: ['free', 'pay_own', 'split_equal', 'organizer_pays'],
      default: 'pay_own'
    }
  },
  
  // Reviews and Ratings
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  
  // Activity History
  actualParticipants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }], // Users who actually attended
  noShows: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Recurring Activities
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly'],
  },
  recurrenceEndDate: Date,
  parentActivity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  
  // Metadata
  viewCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
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

// Indexes for geospatial queries
activitySchema.index({ 'location.coordinates': '2dsphere' });
activitySchema.index({ date: 1, status: 1 });
activitySchema.index({ organizer: 1 });
activitySchema.index({ category: 1 });
activitySchema.index({ 'participants.user': 1 });

// Virtual for checking if activity is full
activitySchema.virtual('isFull').get(function() {
  return this.participants.filter(p => p.status === 'confirmed').length >= this.maxParticipants;
});

// Virtual for checking if activity can start
activitySchema.virtual('canStart').get(function() {
  return this.participants.filter(p => p.status === 'confirmed').length >= this.minParticipants;
});

// Virtual for participant count
activitySchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.status === 'confirmed').length;
});

// Methods
activitySchema.methods.join = async function(userId) {
  // Check if user is already a participant
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (existingParticipant) {
    return { success: false, message: 'Already joined this activity' };
  }
  
  // Check if activity is full
  if (this.isFull) {
    // Add to waitlist
    this.waitlist.push({ user: userId });
    await this.save();
    return { success: true, waitlist: true, message: 'Added to waitlist' };
  }
  
  // Add participant
  this.participants.push({ user: userId });
  await this.save();
  return { success: true, message: 'Successfully joined activity' };
};

activitySchema.methods.leave = async function(userId) {
  // Remove from participants
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  
  // If there's a waitlist, move first person to participants
  if (this.waitlist.length > 0) {
    const nextUser = this.waitlist.shift();
    this.participants.push({ user: nextUser.user });
  }
  
  await this.save();
  return { success: true, message: 'Left activity' };
};

activitySchema.methods.cancel = async function(reason) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  await this.save();
  
  // TODO: Send notifications to all participants
  return { success: true, message: 'Activity cancelled' };
};

// Check if activity should be cancelled due to low participants
activitySchema.methods.checkParticipantRequirement = function() {
  const confirmedParticipants = this.participants.filter(p => p.status === 'confirmed').length;
  const now = new Date();
  const activityDateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  activityDateTime.setHours(parseInt(hours), parseInt(minutes));
  const hoursUntilActivity = (activityDateTime - now) / (1000 * 60 * 60);
  
  return {
    hasEnoughParticipants: confirmedParticipants >= this.minParticipants,
    participantCount: confirmedParticipants,
    minRequired: this.minParticipants,
    hoursUntilStart: hoursUntilActivity,
    shouldAutoCancel: confirmedParticipants < this.minParticipants && hoursUntilActivity <= 2 && hoursUntilActivity > 0
  };
};

activitySchema.methods.updateStatus = async function() {
  const now = new Date();
  const activityDateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  activityDateTime.setHours(parseInt(hours), parseInt(minutes));
  
  const endTime = new Date(activityDateTime.getTime() + this.duration * 60000);
  const hoursUntilActivity = (activityDateTime - now) / (1000 * 60 * 60);
  
  if (this.status === 'cancelled') return;
  
  // Auto-cancel if not enough participants and less than 2 hours before start
  const confirmedParticipants = this.participants.filter(p => p.status === 'confirmed').length;
  if (confirmedParticipants < this.minParticipants && hoursUntilActivity <= 2 && hoursUntilActivity > 0) {
    this.status = 'cancelled';
    this.cancellationReason = `Geannuleerd: niet genoeg deelnemers (${confirmedParticipants}/${this.minParticipants} minimum)`;
    console.log(`🚫 Auto-cancelled activity "${this.title}" - insufficient participants: ${confirmedParticipants}/${this.minParticipants}`);
    await this.save();
    return;
  }
  
  if (now < activityDateTime) {
    this.status = 'upcoming';
  } else if (now >= activityDateTime && now <= endTime) {
    this.status = 'ongoing';
  } else {
    this.status = 'completed';
  }
  
  await this.save();
};

// Static methods
activitySchema.statics.findUpcoming = function(filters = {}) {
  const query = {
    status: { $in: ['published', 'upcoming'] },
    date: { $gte: new Date() },
    ...filters
  };
  
  return this.find(query)
    .populate('organizer', 'username avatar')
    .populate('category')
    .sort({ date: 1 });
};

activitySchema.statics.findNearby = function(coordinates, maxDistance = 10000) {
  return this.find({
    status: { $in: ['published', 'upcoming'] },
    date: { $gte: new Date() },
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance // in meters
      }
    }
  }).populate('organizer', 'username avatar').populate('category');
};

activitySchema.statics.findByInterests = function(interests, userId) {
  return this.find({
    status: { $in: ['published', 'upcoming'] },
    date: { $gte: new Date() },
    $or: [
      { tags: { $in: interests } },
      { requiredInterests: { $in: interests } }
    ],
    'participants.user': { $ne: userId } // Not already joined
  }).populate('organizer', 'username avatar').populate('category');
};

module.exports = mongoose.model('Activity', activitySchema);