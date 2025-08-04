const express = require('express');
const router = express.Router();
const aiCoachService = require('../services/aiCoachService');
const AICoach = require('../models/AICoach');
const JournalEntry = require('../models/JournalEntry');
const Addiction = require('../models/Addiction');

// Middleware to check if AI Coach is enabled for user
const checkAICoachEnabled = async (req, res, next) => {
  try {
    // For now, AI Coach is enabled for all users
    // Later we can add user preferences or premium features
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check AI Coach status' });
  }
};

/**
 * POST /api/ai-coach/analyze-journal
 * Analyze a journal entry for triggers and emotional state
 */
router.post('/analyze-journal', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId, journalEntryId } = req.body;
    
    if (!userId || !journalEntryId) {
      return res.status(400).json({ error: 'userId and journalEntryId are required' });
    }
    
    // Get the journal entry
    const journalEntry = await JournalEntry.findById(journalEntryId);
    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    
    // Verify ownership
    if (journalEntry.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Analyze the entry
    const analysis = await aiCoachService.analyzeJournalEntry(userId, journalEntry);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error analyzing journal entry:', error);
    res.status(500).json({ error: 'Failed to analyze journal entry' });
  }
});

/**
 * POST /api/ai-coach/chat
 * Interactive chat with AI coach
 */
router.post('/chat', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId, message, context = {} } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }
    
    // Generate coach response
    const response = await aiCoachService.generateChatResponse(userId, message, context);
    
    res.json({
      success: true,
      ...response,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error in AI coach chat:', error);
    res.status(500).json({ error: 'Failed to generate coach response' });
  }
});

/**
 * POST /api/ai-coach/intervention
 * Generate emergency intervention
 */
router.post('/intervention', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId, triggerType, urgencyLevel = 'medium' } = req.body;
    
    if (!userId || !triggerType) {
      return res.status(400).json({ error: 'userId and triggerType are required' });
    }
    
    // Generate intervention
    const intervention = await aiCoachService.generateIntervention(userId, triggerType, urgencyLevel);
    
    res.json({
      success: true,
      intervention,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error generating intervention:', error);
    res.status(500).json({ error: 'Failed to generate intervention' });
  }
});


/**
 * GET /api/ai-coach/sessions/:userId
 * Get recent coaching sessions
 */
router.get('/sessions/:userId', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, type } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const query = { userId };
    if (type) {
      query.sessionType = type;
    }
    
    const sessions = await AICoach.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('sessionType messages analysisResults interventions createdAt');
    
    res.json({
      success: true,
      sessions,
      count: sessions.length
    });
    
  } catch (error) {
    console.error('Error fetching coaching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch coaching sessions' });
  }
});

/**
 * POST /api/ai-coach/feedback
 * User feedback on coaching intervention
 */
router.post('/feedback', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId, sessionId, feedback, effectiveness } = req.body;
    
    if (!userId || !sessionId || !feedback) {
      return res.status(400).json({ error: 'userId, sessionId, and feedback are required' });
    }
    
    // Find the coaching session
    const session = await AICoach.findOne({ userId, sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Coaching session not found' });
    }
    
    // Update the latest intervention with feedback
    if (session.interventions.length > 0) {
      const latestIntervention = session.interventions[session.interventions.length - 1];
      latestIntervention.userFeedback = feedback;
      
      if (effectiveness !== undefined) {
        latestIntervention.effectiveness = effectiveness;
        
        // Update success metrics
        if (effectiveness >= 4) {
          session.progressMetrics.successfulInterventions += 1;
        }
      }
      
      await session.save();
    }
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
    
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/ai-coach/status/:userId
 * Get AI Coach status and preferences
 */
router.get('/status/:userId', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get or create AI Coach preferences
    let coachSession = await AICoach.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!coachSession) {
      // Create initial session with default preferences
      coachSession = new AICoach({
        userId,
        sessionId: `${userId}_${Date.now()}_initial`,
        sessionType: 'check_in',
        userPreferences: {
          coachingStyle: 'supportive',
          communicationFrequency: 'moderate'
        }
      });
      await coachSession.save();
    }
    
    const recentInsights = coachSession.getInsights(7);
    
    res.json({
      success: true,
      status: {
        isActive: coachSession.isActive,
        preferences: coachSession.userPreferences,
        progressMetrics: coachSession.progressMetrics,
        recentInsights
      }
    });
    
  } catch (error) {
    console.error('Error getting AI coach status:', error);
    res.status(500).json({ error: 'Failed to get AI coach status' });
  }
});

/**
 * PUT /api/ai-coach/preferences/:userId
 * Update AI Coach preferences
 */
router.put('/preferences/:userId', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'preferences are required' });
    }
    
    // Find most recent session or create new one
    let coachSession = await AICoach.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!coachSession) {
      coachSession = new AICoach({
        userId,
        sessionId: `${userId}_${Date.now()}_preferences`,
        sessionType: 'check_in'
      });
    }
    
    // Update preferences
    coachSession.userPreferences = {
      ...coachSession.userPreferences,
      ...preferences
    };
    
    await coachSession.save();
    
    res.json({
      success: true,
      preferences: coachSession.userPreferences
    });
    
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/ai-coach/check-in
 * Proactive check-in with user
 */
router.post('/check-in', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Get recent journal entries and addiction status
    const recentEntries = await JournalEntry.find({ userId })
      .sort({ date: -1 })
      .limit(3);
    
    const addictions = await Addiction.find({ userId, status: { $in: ['active', 'recovering'] } });
    
    // Generate check-in message based on recent activity
    let checkInMessage = "How are you feeling today? I'm here to support you.";
    let checkInType = "general";
    
    if (recentEntries.length === 0) {
      checkInMessage = "I noticed you haven't written in your journal lately. Sometimes writing can help process our thoughts and feelings. How are things going?";
      checkInType = "engagement";
    } else {
      const latestEntry = recentEntries[0];
      const daysSinceEntry = Math.floor((new Date() - new Date(latestEntry.date)) / (1000 * 60 * 60 * 24));
      
      if (daysSinceEntry > 2) {
        checkInMessage = "It's been a few days since your last journal entry. I hope you're doing well. What's been on your mind lately?";
        checkInType = "follow_up";
      } else if (latestEntry.mood && ['stressed', 'anxious'].includes(latestEntry.mood)) {
        checkInMessage = "I noticed you were feeling stressed in your recent journal entry. How are you feeling now? Remember, I'm here to help you through difficult moments.";
        checkInType = "support";
      }
    }
    
    // Save check-in session
    const sessionId = `${userId}_${Date.now()}_checkin`;
    const coachSession = new AICoach({
      userId,
      sessionId,
      sessionType: 'check_in'
    });
    
    coachSession.messages.push({
      role: 'coach',
      content: checkInMessage,
      metadata: {
        checkInType
      }
    });
    
    await coachSession.save();
    
    res.json({
      success: true,
      checkIn: {
        message: checkInMessage,
        type: checkInType,
        sessionId
      }
    });
    
  } catch (error) {
    console.error('Error generating check-in:', error);
    res.status(500).json({ error: 'Failed to generate check-in' });
  }
});

/**
 * GET /api/ai-coach/insights/:userId
 * Get AI-generated progress insights and analytics for user
 */
router.get('/insights/:userId', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = '30' } = req.query; // Days to analyze
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const daysAgo = parseInt(timeframe);
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Get journal entries
    const JournalEntry = require('../models/JournalEntry');
    const journalEntries = await JournalEntry.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });
    
    // Get AI Coach sessions
    const coachSessions = await AICoach.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });
    
    // Get addictions data
    const User = require('../models/User');
    const user = await User.findById(userId);
    const addictions = user?.addictions || [];
    
    // Calculate insights
    const insights = await aiCoachService.generateProgressInsights(userId, {
      journalEntries,
      coachSessions,
      addictions,
      timeframe: daysAgo
    });
    
    res.json({
      success: true,
      insights,
      metadata: {
        timeframe: daysAgo,
        journalEntriesCount: journalEntries.length,
        coachSessionsCount: coachSessions.length,
        addictionsCount: addictions.length,
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * POST /api/ai-coach/emergency
 * Handle emergency crisis situations with immediate intervention
 */
router.post('/emergency', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId, crisisType, severity, userMessage, location } = req.body;
    
    if (!userId || !crisisType) {
      return res.status(400).json({ error: 'userId and crisisType are required' });
    }
    
    console.log(`Emergency intervention triggered for user ${userId}, crisis: ${crisisType}, severity: ${severity}`);
    
    // Generate emergency response
    const emergencyResponse = await aiCoachService.handleEmergencyCrisis(userId, {
      crisisType,
      severity: severity || 'high',
      userMessage,
      location,
      timestamp: new Date()
    });
    
    // Log emergency event
    const sessionId = `emergency_${Date.now()}_${userId}`;
    const emergencySession = new AICoach({
      userId,
      sessionId,
      sessionType: 'intervention'
    });
    
    emergencySession.messages.push({
      role: 'user',
      content: userMessage || `Emergency: ${crisisType}`,
      metadata: {
        crisisType,
        severity,
        isEmergency: true
      }
    });
    
    emergencySession.messages.push({
      role: 'coach',
      content: emergencyResponse.message,
      metadata: {
        interventionType: 'emergency',
        crisisType,
        severity,
        resourcesProvided: emergencyResponse.resources?.length || 0
      }
    });
    
    if (emergencyResponse.triggerNotifications) {
      emergencySession.interventions = [{
        type: 'emergency',
        triggerType: crisisType,
        severity,
        emergencyContacts: emergencyResponse.emergencyContacts,
        resourcesProvided: emergencyResponse.resources,
        timestamp: new Date()
      }];
    }
    
    await emergencySession.save();
    
    res.json({
      success: true,
      emergency: true,
      severity,
      sessionId,
      ...emergencyResponse
    });
    
  } catch (error) {
    console.error('Error handling emergency:', error);
    res.status(500).json({ 
      error: 'Failed to handle emergency',
      emergency: true,
      fallbackResources: [
        { name: 'Crisis Text Line', contact: 'Text HOME to 741741', available: '24/7' },
        { name: 'National Suicide Prevention Lifeline', contact: '988', available: '24/7' },
        { name: 'SAMHSA National Helpline', contact: '1-800-662-4357', available: '24/7' }
      ]
    });
  }
});

/**
 * GET /api/ai-coach/crisis-resources
 * Get crisis resources and emergency contacts based on location/type
 */
router.get('/crisis-resources', async (req, res) => {
  try {
    const { crisisType, location, language = 'en' } = req.query;
    
    const resources = await aiCoachService.getCrisisResources({
      crisisType,
      location,
      language
    });
    
    res.json({
      success: true,
      resources,
      emergency: true
    });
    
  } catch (error) {
    console.error('Error getting crisis resources:', error);
    res.status(500).json({ 
      error: 'Failed to get crisis resources',
      resources: [
        { name: 'Crisis Text Line', contact: 'Text HOME to 741741', available: '24/7' },
        { name: 'National Suicide Prevention Lifeline', contact: '988', available: '24/7' }
      ]
    });
  }
});

/**
 * POST /api/ai-coach/check-grammar
 * Check grammar and spelling for text input
 */
router.post('/check-grammar', async (req, res) => {
  try {
    const { text, language = 'auto' } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }
    
    // Check grammar and spelling
    const analysis = await aiCoachService.checkGrammarAndSpelling(text, language);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error checking grammar:', error);
    res.status(500).json({ error: 'Failed to check grammar and spelling' });
  }
});

/**
 * POST /api/ai-coach/assess-crisis
 * Assess crisis level from user input and provide appropriate response
 */
router.post('/assess-crisis', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId, message, context } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }
    
    const assessment = await aiCoachService.assessCrisisLevel(message, context);
    
    res.json({
      success: true,
      assessment,
      requiresEmergency: assessment.severity === 'critical',
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error assessing crisis:', error);
    res.status(500).json({ error: 'Failed to assess crisis level' });
  }
});

/**
 * GET /api/ai-coach/check-triggers/:userId
 * Check for pending trigger alerts for a user
 */
router.get('/check-triggers/:userId', checkAICoachEnabled, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Look for recent analysis sessions with high-risk triggers
    const recentSessions = await AICoach.find({
      userId,
      sessionType: 'analysis',
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 minutes
      'analysisResults.triggersDetected': { $exists: true, $ne: [] }
    })
    .sort({ createdAt: -1 })
    .limit(5);
    
    const triggers = [];
    
    for (const session of recentSessions) {
      if (session.analysisResults && session.analysisResults.triggersDetected) {
        for (const trigger of session.analysisResults.triggersDetected) {
          // Only include high and medium risk triggers
          if (trigger.riskLevel === 'high' || trigger.riskLevel === 'medium') {
            // Check if this trigger has already been shown (hasn't been dismissed)
            const hasBeenShown = session.interventions && session.interventions.some(
              intervention => intervention.triggerShown === true
            );
            
            if (!hasBeenShown) {
              triggers.push({
                id: `${session._id}_${trigger.type}`,
                trigger: trigger.trigger || trigger.type,
                context: trigger.context,
                riskLevel: trigger.riskLevel,
                relatedAddiction: trigger.relatedAddiction,
                detectedAt: session.createdAt,
                sessionId: session.sessionId
              });
            }
          }
        }
      }
    }
    
    // Mark triggers as shown if we're returning any
    if (triggers.length > 0) {
      for (const session of recentSessions) {
        if (!session.interventions) {
          session.interventions = [];
        }
        session.interventions.push({
          triggerShown: true,
          shownAt: new Date()
        });
        await session.save();
      }
    }
    
    res.json({
      success: true,
      triggers: triggers.slice(0, 1), // Only return the most recent trigger
      count: triggers.length
    });
    
  } catch (error) {
    console.error('Error checking for triggers:', error);
    res.status(500).json({ error: 'Failed to check for triggers' });
  }
});

module.exports = router;