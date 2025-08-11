const mongoose = require('mongoose');

const AICoachSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Coach session data
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  
  sessionType: {
    type: String,
    enum: ['chat', 'analysis', 'intervention', 'check_in', 'insight', 'enhanced_insights', 'journal_analysis'],
    required: true
  },
  
  // Conversation history
  messages: [{
    role: {
      type: String,
      enum: ['user', 'coach', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      triggerDetected: Boolean,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      interventionType: String,
      relatedAddictionId: mongoose.Schema.Types.ObjectId,
      relatedJournalId: mongoose.Schema.Types.ObjectId
    }
  }],
  
  // Analysis results
  analysisResults: {
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1
    },
    triggersDetected: [{
      trigger: String,
      confidence: Number,
      relatedAddiction: mongoose.Schema.Types.ObjectId,
      context: String
    }],
    riskAssessment: {
      level: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      factors: [String],
      recommendation: String
    },
    emotionalState: {
      primary: String,
      secondary: [String],
      stability: {
        type: String,
        enum: ['stable', 'declining', 'improving', 'volatile']
      }
    }
  },
  
  // Coaching interventions applied
  interventions: [{
    type: {
      type: String,
      enum: ['breathing', 'mindfulness', 'distraction', 'support_contact', 'emergency', 'meditation'],
      required: true
    },
    description: String,
    effectiveness: {
      type: Number,
      min: 1,
      max: 5
    },
    userFeedback: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // User preferences
  userPreferences: {
    coachingStyle: {
      type: String,
      enum: ['supportive', 'direct', 'gentle', 'motivational'],
      default: 'supportive'
    },
    communicationFrequency: {
      type: String,
      enum: ['minimal', 'moderate', 'active', 'intensive'],
      default: 'moderate'
    },
    preferredInterventions: [String],
    avoidTriggers: [String]
  },
  
  // Progress tracking
  progressMetrics: {
    sessionsCount: {
      type: Number,
      default: 0
    },
    interventionsCount: {
      type: Number,
      default: 0
    },
    successfulInterventions: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number, // in minutes
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  },
  
  // Privacy settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  dataRetentionDays: {
    type: Number,
    default: 90
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

// Update timestamp on save
AICoachSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add a coaching message
AICoachSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    metadata,
    timestamp: new Date()
  });
  
  // Update progress metrics
  if (role === 'coach') {
    this.progressMetrics.sessionsCount += 1;
  }
  
  return this.save();
};

// Method to add intervention
AICoachSchema.methods.addIntervention = function(type, description) {
  this.interventions.push({
    type,
    description,
    timestamp: new Date()
  });
  
  this.progressMetrics.interventionsCount += 1;
  return this.save();
};

// Method to update analysis results
AICoachSchema.methods.updateAnalysis = function(analysisData) {
  this.analysisResults = {
    ...this.analysisResults,
    ...analysisData
  };
  return this.save();
};

// Method to calculate engagement score
AICoachSchema.methods.calculateEngagement = function() {
  const recentMessages = this.messages.filter(
    m => m.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
  );
  
  const userMessages = recentMessages.filter(m => m.role === 'user').length;
  const totalMessages = recentMessages.length;
  
  const engagementScore = totalMessages > 0 ? Math.min(100, (userMessages / totalMessages) * 100) : 0;
  
  this.progressMetrics.engagementScore = engagementScore;
  return this.save();
};

// Method to get recent insights
AICoachSchema.methods.getInsights = function(days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const recentMessages = this.messages.filter(m => m.timestamp > cutoffDate);
  const recentInterventions = this.interventions.filter(i => i.timestamp > cutoffDate);
  
  return {
    messageCount: recentMessages.length,
    interventionCount: recentInterventions.length,
    riskLevels: recentMessages.map(m => m.metadata?.riskLevel).filter(Boolean),
    triggerTypes: recentMessages.flatMap(m => m.metadata?.triggerDetected ? [m.metadata] : []),
    engagementScore: this.progressMetrics.engagementScore
  };
};

// Indexes for better performance
AICoachSchema.index({ userId: 1, createdAt: -1 });
AICoachSchema.index({ userId: 1, sessionType: 1 });
AICoachSchema.index({ sessionId: 1 }, { unique: true });
AICoachSchema.index({ 'messages.timestamp': -1 });

module.exports = mongoose.model('AICoach', AICoachSchema);