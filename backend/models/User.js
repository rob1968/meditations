const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  
  // Profile information
  birthDate: {
    type: Date,
    required: false
  },
  age: {
    type: Number,
    required: false,
    min: 13,
    max: 120
  },
  location: {
    city: {
      type: String,
      trim: true,
      maxlength: 100
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100
    },
    countryCode: {
      type: String,
      trim: true,
      maxlength: 5
    },
    // Google Places data
    placeId: {
      type: String,
      trim: true,
      maxlength: 200
    },
    formattedAddress: {
      type: String,
      trim: true,
      maxlength: 300
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    required: false
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'de', 'es', 'fr', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'nl'],
    required: false
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500,
    required: false
  },
  profileImage: {
    type: String,
    trim: true,
    maxlength: 500,
    required: false
  },
  
  // Activity and Interests (for Meet5-style functionality)
  interests: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  region: {
    type: String,
    trim: true,
    maxlength: 100
  },
  preferredActivityCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivityCategory'
  }],
  activityHistory: [{
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    },
    status: {
      type: String,
      enum: ['attended', 'no_show', 'cancelled'],
      default: 'attended'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  activityStats: {
    totalActivities: {
      type: Number,
      default: 0
    },
    activitiesOrganized: {
      type: Number,
      default: 0
    },
    activitiesAttended: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    noShowCount: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date
  },
  
  // Verification and Trust
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['email', 'phone', 'id', 'social'],
    required: false
  },
  verifiedAt: Date,
  trustScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  
  // Social preferences for activities
  activityPreferences: {
    maxDistance: {
      type: Number,
      default: 25, // kilometers
      min: 1,
      max: 100
    },
    preferredGroupSize: {
      min: {
        type: Number,
        default: 3
      },
      max: {
        type: Number,
        default: 10
      }
    },
    preferredAgeRange: {
      min: {
        type: Number,
        default: 18
      },
      max: {
        type: Number,
        default: 99
      }
    },
    languages: [{
      type: String,
      enum: ['en', 'de', 'es', 'fr', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'nl']
    }],
    notificationSettings: {
      newActivities: {
        type: Boolean,
        default: true
      },
      activityReminders: {
        type: Boolean,
        default: true
      },
      activityInvites: {
        type: Boolean,
        default: true
      },
      activityUpdates: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Activity availability
  availability: {
    weekdays: {
      morning: { type: Boolean, default: false },
      afternoon: { type: Boolean, default: true },
      evening: { type: Boolean, default: true }
    },
    weekends: {
      morning: { type: Boolean, default: true },
      afternoon: { type: Boolean, default: true },
      evening: { type: Boolean, default: true }
    }
  },
  
  // Pi Network integration
  authMethod: {
    type: String,
    enum: ['traditional', 'pi'],
    default: 'traditional'
  },
  piUserId: {
    type: String,
    trim: true,
    required: false,
    sparse: true, // Allow multiple null values, but unique non-null values
    unique: true
  },
  piUsername: {
    type: String,
    trim: true,
    required: false,
    maxlength: 50
  },
  
  // User's meditation history
  meditations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meditation'
  }],
  
  // Credits system
  credits: {
    type: Number,
    default: 10,
    min: 0
  },
  totalCreditsEarned: {
    type: Number,
    default: 10
  },
  totalCreditsSpent: {
    type: Number,
    default: 0
  },
  
  // ElevenLabs usage tracking
  elevenlabsCharactersUsed: {
    type: Number,
    default: 0
  },
  elevenlabsCharactersThisMonth: {
    type: Number,
    default: 0
  },
  elevenlabsCosts: {
    type: Number,
    default: 0
  },
  lastElevenlabsReset: {
    type: Date,
    default: Date.now
  },
  
  // Credit transaction history
  creditTransactions: [{
    type: {
      type: String,
      enum: ['initial', 'generation', 'sharing', 'purchase', 'bonus'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    relatedId: {
      type: String, // Can store meditation ID or transaction ID
      required: false
    }
  }],
  
  // Custom voices for voice cloning
  customVoices: [{
    voiceId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Emergency contacts for crisis situations
  emergencyContacts: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

// Credit management methods
UserSchema.methods.spendCredits = function(amount, type, description, relatedId = null) {
  if (this.credits < amount) {
    throw new Error('Insufficient credits');
  }
  
  this.credits -= amount;
  this.totalCreditsSpent += amount;
  
  this.creditTransactions.push({
    type: type,
    amount: -amount,
    description: description,
    relatedId: relatedId
  });
  
  return this.save();
};

UserSchema.methods.addCredits = function(amount, type, description, relatedId = null) {
  this.credits += amount;
  this.totalCreditsEarned += amount;
  
  this.creditTransactions.push({
    type: type,
    amount: amount,
    description: description,
    relatedId: relatedId
  });
  
  return this.save();
};

UserSchema.methods.hasEnoughCredits = function(amount) {
  return this.credits >= amount;
};

// Initialize credits for new users
UserSchema.methods.initializeCredits = function() {
  if (this.creditTransactions.length === 0) {
    this.creditTransactions.push({
      type: 'initial',
      amount: 10,
      description: 'Welcome bonus - 10 free credits'
    });
  }
  return this.save();
};

// Custom voice management methods
UserSchema.methods.addCustomVoice = function(voiceId, name) {
  // Check if voice already exists
  const existingVoice = this.customVoices.find(voice => voice.voiceId === voiceId);
  if (existingVoice) {
    throw new Error('Voice already exists');
  }
  
  this.customVoices.push({
    voiceId: voiceId,
    name: name.trim()
  });
  
  return this.save();
};

UserSchema.methods.removeCustomVoice = function(voiceId) {
  this.customVoices = this.customVoices.filter(voice => voice.voiceId !== voiceId);
  return this.save();
};

UserSchema.methods.getCustomVoices = function() {
  return this.customVoices.sort((a, b) => b.createdAt - a.createdAt);
};

// Emergency contact management methods
UserSchema.methods.addEmergencyContact = function(contactData) {
  const { name, phone, relationship, isPrimary = false } = contactData;
  
  // If this contact is marked as primary, unset other primary contacts
  if (isPrimary) {
    this.emergencyContacts.forEach(contact => {
      contact.isPrimary = false;
    });
  }
  
  this.emergencyContacts.push({
    name: name.trim(),
    phone: phone.trim(),
    relationship: relationship.trim(),
    isPrimary,
    isActive: true
  });
  
  return this.save();
};

UserSchema.methods.updateEmergencyContact = function(contactId, updateData) {
  const contact = this.emergencyContacts.id(contactId);
  if (!contact) {
    throw new Error('Emergency contact not found');
  }
  
  // If setting as primary, unset other primary contacts
  if (updateData.isPrimary) {
    this.emergencyContacts.forEach(c => {
      if (c._id.toString() !== contactId.toString()) {
        c.isPrimary = false;
      }
    });
  }
  
  Object.assign(contact, updateData);
  return this.save();
};

UserSchema.methods.removeEmergencyContact = function(contactId) {
  const contact = this.emergencyContacts.id(contactId);
  if (!contact) {
    throw new Error('Emergency contact not found');
  }
  
  contact.remove();
  return this.save();
};

UserSchema.methods.getActiveEmergencyContacts = function() {
  return this.emergencyContacts
    .filter(contact => contact.isActive)
    .sort((a, b) => {
      // Primary contacts first, then by creation date
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return b.createdAt - a.createdAt;
    });
};

UserSchema.methods.getPrimaryEmergencyContact = function() {
  return this.emergencyContacts.find(contact => contact.isPrimary && contact.isActive);
};

// Activity-related methods for Meet5-style functionality
UserSchema.methods.updateActivityStats = async function(activityId, status, rating = null) {
  // Update activity history
  this.activityHistory.push({
    activity: activityId,
    status: status,
    rating: rating,
    date: new Date()
  });
  
  // Update stats
  this.activityStats.totalActivities += 1;
  this.activityStats.lastActivityDate = new Date();
  
  if (status === 'attended') {
    this.activityStats.activitiesAttended += 1;
    if (rating) {
      // Recalculate average rating
      const totalRating = (this.activityStats.averageRating * (this.activityStats.activitiesAttended - 1)) + rating;
      this.activityStats.averageRating = totalRating / this.activityStats.activitiesAttended;
    }
  } else if (status === 'no_show') {
    this.activityStats.noShowCount += 1;
    // Decrease trust score for no-shows
    this.trustScore = Math.max(0, this.trustScore - 5);
  }
  
  return this.save();
};

UserSchema.methods.incrementOrganizedActivities = async function() {
  this.activityStats.activitiesOrganized += 1;
  // Increase trust score for organizing activities
  this.trustScore = Math.min(100, this.trustScore + 2);
  return this.save();
};

UserSchema.methods.canJoinActivity = function(activity) {
  // Check age restrictions
  const userAge = this.age || (this.birthDate ? Math.floor((Date.now() - new Date(this.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null);
  if (userAge && (userAge < activity.ageRange.min || userAge > activity.ageRange.max)) {
    return { canJoin: false, reason: 'Age restrictions not met' };
  }
  
  // Check if already participating
  const isParticipant = activity.participants.some(p => p.user.toString() === this._id.toString());
  if (isParticipant) {
    return { canJoin: false, reason: 'Already participating' };
  }
  
  // Check privacy settings
  if (activity.privacy === 'invite_only' && !activity.invitedUsers.includes(this._id)) {
    return { canJoin: false, reason: 'Invitation required' };
  }
  
  return { canJoin: true };
};

UserSchema.methods.getActivityRecommendations = async function() {
  const Activity = mongoose.model('Activity');
  
  // Get activities matching user preferences
  const query = {
    status: { $in: ['published', 'upcoming'] },
    date: { $gte: new Date() },
    'participants.user': { $ne: this._id }
  };
  
  // Add interest filtering if user has interests
  if (this.interests && this.interests.length > 0) {
    query.$or = [
      { tags: { $in: this.interests } },
      { requiredInterests: { $in: this.interests } }
    ];
  }
  
  // Add category filtering if user has preferences
  if (this.preferredActivityCategories && this.preferredActivityCategories.length > 0) {
    query.category = { $in: this.preferredActivityCategories };
  }
  
  return Activity.find(query)
    .populate('organizer', 'username avatar trustScore')
    .populate('category')
    .limit(20)
    .sort({ date: 1 });
};

// Create indexes for better performance
UserSchema.index({ username: 1 });
UserSchema.index({ piUserId: 1 });
UserSchema.index({ authMethod: 1 });
UserSchema.index({ interests: 1 });
UserSchema.index({ 'location.coordinates': '2dsphere' });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ trustScore: -1 });

module.exports = mongoose.model('User', UserSchema);