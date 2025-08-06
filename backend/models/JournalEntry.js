const mongoose = require('mongoose');

const JournalEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1500
  },
  
  date: {
    type: Date,
    default: Date.now
  },
  
  mood: {
    type: String,
    enum: {
      values: ['happy', 'calm', 'stressed', 'anxious', 'energetic', 'peaceful', 'grateful', 'reflective', 'sad', 'angry', 'frustrated', 'confused', 'lonely', 'mixed', 'neutral'],
      message: '{VALUE} is not a valid mood'
    },
    required: false,
    default: undefined,
    sparse: true
  },

  moodScore: {
    type: Number,
    min: 1,
    max: 10,
    required: false
  },

  moodAnalysis: {
    aiGenerated: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: false
    },
    emotionalIndicators: [{
      type: String,
      required: false
    }],
    overallSentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'mixed'],
      required: false
    },
    description: {
      type: String,
      required: false
    },
    detectedMoods: [{
      mood: {
        type: String,
        enum: ['happy', 'calm', 'stressed', 'anxious', 'energetic', 'peaceful', 'grateful', 'reflective', 'sad', 'angry', 'frustrated', 'confused', 'lonely', 'mixed', 'neutral'],
        required: false
      },
      score: {
        type: Number,
        min: 1,
        max: 10,
        required: false
      },
      strength: {
        type: Number,
        min: 0,
        max: 5,
        required: false
      },
      keywords: [{
        type: String,
        required: false
      }]
    }],
    moodCount: {
      type: Number,
      min: 1,
      max: 10,
      required: false
    }
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  isShared: {
    type: Boolean,
    default: false
  },
  
  sharedAt: {
    type: Date,
    required: false
  },
  
  audioFile: {
    filename: {
      type: String,
      required: false
    },
    duration: {
      type: Number,
      required: false
    },
    language: {
      type: String,
      required: false
    },
    voiceId: {
      type: String,
      required: false
    }
  },
  
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  likeCount: {
    type: Number,
    default: 0
  },
  
  privacy: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
});


// Update like count when likes array changes
JournalEntrySchema.methods.updateLikeCount = function() {
  this.likeCount = this.likes.length;
  return this.save();
};

// Method to add a like
JournalEntrySchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.userId.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ userId });
    return this.updateLikeCount();
  }
  return Promise.resolve(this);
};

// Method to remove a like
JournalEntrySchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.userId.toString() !== userId.toString());
  return this.updateLikeCount();
};

// Method to toggle like
JournalEntrySchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => like.userId.toString() === userId.toString());
  if (existingLike) {
    return this.removeLike(userId).then(() => ({ isLiked: false, likeCount: this.likeCount }));
  } else {
    return this.addLike(userId).then(() => ({ isLiked: true, likeCount: this.likeCount }));
  }
};

// Indexes for better performance
JournalEntrySchema.index({ userId: 1, createdAt: -1 });
JournalEntrySchema.index({ isShared: 1, sharedAt: -1 });
JournalEntrySchema.index({ mood: 1 });
JournalEntrySchema.index({ tags: 1 });

// Text index for full-text search on title and content
JournalEntrySchema.index({ title: 'text', content: 'text' });

// Compound index to ensure one entry per day per user
JournalEntrySchema.index({ 
  userId: 1, 
  date: 1 
}, { 
  unique: true,
  partialFilterExpression: { date: { $type: "date" } }
});

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);