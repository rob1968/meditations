const mongoose = require('mongoose');

const AddictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    enum: {
      values: [
        'smoking', 'alcohol', 'drugs', 'gambling', 'shopping', 'social_media',
        'gaming', 'food', 'caffeine', 'sugar', 'porn', 'sex', 'work',
        'exercise', 'phone', 'internet', 'other'
      ],
      message: '{VALUE} is not a supported addiction type'
    }
  },
  
  customType: {
    type: String,
    trim: true,
    maxlength: 100,
    // Used when type is 'other'
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  startDate: {
    type: Date,
    required: true
  },
  
  quitDate: {
    type: Date,
    required: false
  },
  
  status: {
    type: String,
    enum: {
      values: ['active', 'recovering', 'relapsed', 'clean'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  
  // Recovery milestones
  milestones: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['quit_attempt', 'relapse', 'milestone', 'clean_period'],
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300
    },
    daysClean: {
      type: Number,
      min: 0
    }
  }],
  
  // Tracking data
  severity: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  
  triggers: [{
    type: String,
    trim: true,
    maxlength: 100
  }],
  
  copingStrategies: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  
  supportSystem: [{
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: 50
    },
    contactInfo: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  
  isPrivate: {
    type: Boolean,
    default: true
  },

  // CRUKS Register integration (Netherlands gambling exclusion system)
  cruksRegistration: {
    isRegistered: {
      type: Boolean,
      default: false
    },
    registrationDate: {
      type: Date,
      required: false
    }
  },

  // Relapse tracking
  lastRelapse: {
    type: Date
  },
  
  relapseCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Additional notes and automatic detection logs
  notes: [{
    date: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    type: {
      type: String,
      enum: ['manual', 'automatic_relapse_detection', 'milestone', 'general'],
      default: 'general'
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry'
    }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
AddictionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Calculate days clean
AddictionSchema.methods.getDaysClean = function() {
  if (!this.quitDate || this.status === 'active' || this.status === 'relapsed') {
    return 0;
  }
  
  const now = new Date();
  const quitDate = new Date(this.quitDate);
  
  // Find the most recent relapse after quit date
  const recentRelapse = this.milestones
    .filter(m => m.type === 'relapse' && m.date > quitDate)
    .sort((a, b) => b.date - a.date)[0];
  
  const startDate = recentRelapse ? recentRelapse.date : quitDate;
  
  // Set both dates to start of day for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cleanStartDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  
  // Calculate difference in milliseconds
  const diffTime = today.getTime() - cleanStartDay.getTime();
  
  // Convert to days - on quit day itself, you're 0 days clean
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

// Add milestone
AddictionSchema.methods.addMilestone = function(type, description, daysClean = null) {
  const milestone = {
    date: new Date(),
    type,
    description,
    daysClean: daysClean || this.getDaysClean()
  };
  
  this.milestones.push(milestone);
  return this.save();
};

// Record automatic relapse detection
AddictionSchema.methods.recordAutomaticRelapse = function(trigger, journalEntryId, relapseDate = null) {
  // Use provided relapse date or current date as fallback
  const actualRelapseDate = relapseDate || new Date();
  
  // Update status and counts
  this.status = 'relapsed';
  this.lastRelapse = actualRelapseDate;
  this.relapseCount = (this.relapseCount || 0) + 1;
  
  // Add milestone with actual relapse date
  const daysClean = this.getDaysClean();
  const milestone = {
    date: actualRelapseDate,
    type: 'relapse',
    description: `Automatische detectie: ${trigger}`,
    daysClean: daysClean
  };
  this.milestones.push(milestone);
  
  // Add note with detection timestamp but reference actual relapse date
  const note = {
    date: new Date(), // When the detection happened
    note: `Automatische terugval detectie via dagboek op ${actualRelapseDate.toLocaleDateString('nl-NL')}: "${trigger}"`,
    type: 'automatic_relapse_detection',
    journalEntryId: journalEntryId
  };
  this.notes.push(note);
  
  return this.save();
};

// Get display name for addiction type
AddictionSchema.methods.getDisplayName = function() {
  if (this.type === 'other' && this.customType) {
    return this.customType;
  }
  
  const typeNames = {
    'smoking': 'Roken',
    'alcohol': 'Alcohol',
    'drugs': 'Drugs',
    'gambling': 'Gokken',
    'shopping': 'Winkelen',
    'social_media': 'Social Media',
    'gaming': 'Gaming',
    'food': 'Eten',
    'caffeine': 'Cafeïne',
    'sugar': 'Suiker',
    'porn': 'Pornografie',
    'sex': 'Seks',
    'work': 'Werk',
    'exercise': 'Sport',
    'phone': 'Telefoon',
    'internet': 'Internet',
    'other': 'Anders'
  };
  
  return typeNames[this.type] || this.type;
};

// Calculate CRUKS exclusion status (Netherlands gambling exclusion system)
AddictionSchema.methods.getCruksStatus = function() {
  if (!this.cruksRegistration?.isRegistered || !this.cruksRegistration.registrationDate) {
    return { status: 'not_registered', daysRemaining: 0, isActive: false };
  }

  const now = new Date();
  const registrationDate = new Date(this.cruksRegistration.registrationDate);
  
  // Use explicitly set expiry date or calculate from registration date
  let expiryDate;
  if (this.cruksRegistration.expiryDate) {
    expiryDate = new Date(this.cruksRegistration.expiryDate);
  } else {
    // Default minimum 6 months exclusion
    expiryDate = new Date(registrationDate);
    expiryDate.setMonth(expiryDate.getMonth() + 6);
  }

  const isActive = now < expiryDate;
  const daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));

  return {
    status: isActive ? 'active' : 'expired',
    registrationDate,
    expiryDate,
    daysRemaining,
    isActive
  };
};

// Indexes for better performance
AddictionSchema.index({ userId: 1, createdAt: -1 });
AddictionSchema.index({ userId: 1, type: 1 });
AddictionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Addiction', AddictionSchema);