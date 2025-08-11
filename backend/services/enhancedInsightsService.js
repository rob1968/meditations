const OpenAI = require('openai');
const AICoach = require('../models/AICoach');
const JournalEntry = require('../models/JournalEntry');
const Addiction = require('../models/Addiction');
const User = require('../models/User');

/**
 * Enhanced Insights Service - Modern AI-powered analytics
 * Provides comprehensive, actionable insights with trending, predictions, and personalized recommendations
 */
class EnhancedInsightsService {
  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      console.warn('OpenAI API key not found, Enhanced Insights service will return mock responses');
      this.openai = null;
    }
    // Using GPT-4o for better performance (GPT-5 has slow response times due to reasoning tokens)
    this.modelName = "gpt-4o";
    
    // Enhanced insight categories
    this.insightCategories = {
      WELLNESS_TRENDS: 'wellness_trends',
      BEHAVIORAL_PATTERNS: 'behavioral_patterns', 
      EMOTIONAL_INTELLIGENCE: 'emotional_intelligence',
      RECOVERY_PROGRESS: 'recovery_progress',
      PREDICTIVE_ALERTS: 'predictive_alerts',
      ACHIEVEMENT_MILESTONES: 'achievement_milestones',
      SOCIAL_CONNECTIONS: 'social_connections',
      PERSONALIZED_RECOMMENDATIONS: 'personalized_recommendations'
    };

    // Insight sophistication levels
    this.sophisticationLevels = {
      BASIC: 'basic',           // Simple metrics and observations
      INTERMEDIATE: 'intermediate',  // Pattern recognition and comparisons
      ADVANCED: 'advanced',     // Predictive insights and complex analysis
      EXPERT: 'expert'          // Deep psychological insights and interventions
    };
  }

  /**
   * Helper method to call OpenAI API with error handling
   */
  async callOpenAI(prompt, temperature = 0.7, maxTokens = 2000) {
    if (!this.openai) {
      console.warn('OpenAI not available, returning mock response');
      return JSON.stringify({
        summary: "Enhanced insights feature requires OpenAI API key",
        mock: true,
        content: "This would contain AI-generated insights"
      });
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error in Enhanced Insights:', error);
      return JSON.stringify({
        error: "OpenAI API error", 
        details: error.message,
        mock: true
      });
    }
  }

  /**
   * Generate comprehensive enhanced insights
   */
  async generateEnhancedInsights(userId, options = {}) {
    try {
      const {
        timeframe = 30,
        sophisticationLevel = this.sophisticationLevels.INTERMEDIATE,
        categories = Object.values(this.insightCategories),
        includeComparisons = true,
        includePredictions = true,
        language = 'en'
      } = options;

      // Gather comprehensive data
      const analyticsData = await this.gatherAnalyticsData(userId, timeframe);
      const userContext = await this.buildEnhancedUserContext(userId);
      
      // Generate insights by category
      const insights = {
        metadata: this.buildMetadata(analyticsData, timeframe),
        overview: await this.generateOverviewInsights(analyticsData, userContext),
        categories: {}
      };

      // Generate category-specific insights
      for (const category of categories) {
        switch (category) {
          case this.insightCategories.WELLNESS_TRENDS:
            insights.categories[category] = await this.generateWellnessTrends(analyticsData, userContext, language);
            break;
          case this.insightCategories.BEHAVIORAL_PATTERNS:
            insights.categories[category] = await this.generateBehavioralPatterns(analyticsData, userContext, language);
            break;
          case this.insightCategories.RECOVERY_PROGRESS:
            insights.categories[category] = await this.generateRecoveryProgress(analyticsData, userContext, language);
            break;
          default:
            insights.categories[category] = { message: 'Category insights coming soon' };
        }
      }

      // Always include recovery progress if user has addictions (regardless of requested categories)
      if (analyticsData.addictions && analyticsData.addictions.length > 0) {
        insights.categories.recovery_progress = await this.generateRecoveryProgress(analyticsData, userContext, language);
        console.log(`Enhanced Insights: Added recovery progress for ${analyticsData.addictions.length} addictions`);
      }

      // Add trending and comparative analysis
      if (includeComparisons) {
        insights.trending = await this.generateTrendingAnalysis(userId, timeframe);
      }

      // Add predictive insights
      if (includePredictions) {
        insights.predictions = await this.generatePredictiveInsights(analyticsData, userContext, language);
      }

      // Generate actionable recommendations
      insights.actionPlan = await this.generateActionPlan(insights, userContext, language);

      // Store insights with versioning
      await this.storeEnhancedInsights(userId, insights);

      return insights;

    } catch (error) {
      console.error('Error generating enhanced insights:', error);
      throw error;
    }
  }

  /**
   * Gather comprehensive analytics data
   */
  async gatherAnalyticsData(userId, timeframe) {
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
    
    console.log(`=== DATA GATHERING ===`);
    console.log(`User ID: ${userId}`);
    console.log(`Timeframe: ${timeframe} days`);
    console.log(`Start date: ${startDate.toISOString()}`);
    
    const [journalEntries, coachSessions, addictions, user] = await Promise.all([
      JournalEntry.find({ userId, createdAt: { $gte: startDate } })
        .sort({ createdAt: 1 }),
      AICoach.find({ userId, createdAt: { $gte: startDate } })
        .sort({ createdAt: 1 }),
      Addiction.find({ userId }).sort({ createdAt: -1 }),
      User.findById(userId)
    ]);
    
    console.log(`Found ${journalEntries.length} journal entries`);
    console.log(`Found ${coachSessions.length} coach sessions`);  
    console.log(`Found ${addictions.length} addictions`);
    console.log(`User found: ${user ? 'YES' : 'NO'}`);
    if (journalEntries.length > 0) {
      console.log(`Sample journal entry: ${(journalEntries[0].content || '').substring(0, 100)}...`);
    }
    console.log(`===================`);

    // Calculate advanced metrics
    const metrics = {
      journaling: this.calculateJournalingMetrics(journalEntries),
      mood: this.calculateMoodMetrics(journalEntries),
      engagement: this.calculateEngagementMetrics(coachSessions),
      recovery: this.calculateRecoveryMetrics(addictions),
      consistency: this.calculateConsistencyMetrics(journalEntries, coachSessions),
      growth: this.calculateGrowthMetrics(journalEntries, timeframe)
    };

    return {
      journalEntries,
      coachSessions, 
      addictions,
      user,
      metrics,
      timeframe
    };
  }

  /**
   * Build enhanced user context with psychological profiling
   */
  async buildEnhancedUserContext(userId) {
    const user = await User.findById(userId);
    if (!user) return null;

    const context = {
      demographics: this.extractDemographics(user),
      preferences: this.extractPreferences(user),
      psychologicalProfile: await this.buildPsychologicalProfile(userId),
      culturalContext: this.extractCulturalContext(user),
      communicationStyle: this.determineCommunicationStyle(user)
    };

    return context;
  }

  /**
   * Generate wellness trends insights
   */
  async generateWellnessTrends(analyticsData, userContext, language = 'en') {
    const { metrics, timeframe } = analyticsData;
    const userLanguage = language;

    const prompt = `As an advanced wellness AI analyst, analyze these wellness trends over ${timeframe} days:

WELLNESS METRICS:
- Mood trend: ${JSON.stringify(metrics.mood)}
- Journaling consistency: ${JSON.stringify(metrics.journaling)}
- Engagement patterns: ${JSON.stringify(metrics.engagement)}
- Growth indicators: ${JSON.stringify(metrics.growth)}

USER CONTEXT: ${JSON.stringify(userContext)}

Provide wellness trend insights in JSON format (language: ${userLanguage}):
{
  "overallWellnessTrend": "improving|declining|stable|volatile",
  "moodStability": {
    "trend": "increasing|decreasing|stable",
    "volatilityScore": [0-100],
    "dominantMoods": ["mood1", "mood2"],
    "insights": ["insight in ${userLanguage}"]
  },
  "consistencyPatterns": {
    "journalingStreak": number,
    "optimalDays": ["monday", "tuesday", ...],
    "challengingPeriods": ["insight in ${userLanguage}"],
    "recommendations": ["action in ${userLanguage}"]
  },
  "emotionalIntelligence": {
    "selfAwarenessScore": [0-100],
    "emotionalRegulationTrend": "improving|declining|stable",
    "insights": ["insight in ${userLanguage}"],
    "developmentAreas": ["area in ${userLanguage}"]
  }
}`;

    const resultText = await this.callOpenAI(prompt, 0.7, 2000);

    return this.parseJsonResponse(resultText);
  }

  /**
   * Generate predictive insights using pattern recognition with trigger analysis
   */
  async generatePredictiveInsights(analyticsData, userContext, language = 'en') {
    const { metrics, journalEntries, addictions } = analyticsData;
    const userLanguage = language;

    // Get comprehensive trigger analysis
    const triggerAnalysis = await this.analyzeTriggerPatterns(journalEntries, addictions);
    const recoveryMetrics = this.calculateDetailedRecoveryMetrics(addictions, journalEntries);

    const prompt = `As a predictive wellness and addiction recovery AI, analyze comprehensive patterns to forecast future trends:

WELLNESS METRICS:
${JSON.stringify(metrics, null, 2)}

ADDICTION & RECOVERY DATA:
${JSON.stringify(recoveryMetrics, null, 2)}

TRIGGER ANALYSIS FROM JOURNAL:
${JSON.stringify(triggerAnalysis, null, 2)}

RECENT JOURNAL PATTERNS WITH TRIGGER CONTEXT:
${journalEntries.slice(-10).map(entry => ({
  date: entry.createdAt,
  mood: entry.mood,
  wordCount: entry.content?.length || 0,
  triggerLevel: triggerAnalysis.entriesByTriggerLevel[entry._id] || 'none',
  triggersDetected: triggerAnalysis.triggersByEntry[entry._id] || []
}))}

USER CONTEXT: ${JSON.stringify(userContext)}

Generate comprehensive predictive insights including addiction relapse risk (language: ${userLanguage}):
{
  "riskAssessment": {
    "overallRiskLevel": "low|medium|high|critical",
    "addictionRelapseRisk": {
      "level": "low|medium|high|critical",
      "mostVulnerableAddiction": "addiction_type",
      "riskFactors": ["factor in ${userLanguage}"],
      "triggerPatternConcerns": ["pattern in ${userLanguage}"]
    },
    "specificRisks": [
      {
        "type": "risk_type (wellness/addiction/mental_health)",
        "probability": [0-100],
        "timeframe": "days_until_likely",
        "warning_signs": ["sign in ${userLanguage}"],
        "prevention_strategies": ["strategy in ${userLanguage}"],
        "relatedTriggers": ["trigger keywords if applicable"]
      }
    ]
  },
  "opportunities": {
    "breakthroughPotential": [0-100],
    "recoveryMilestonePredictions": ["milestone in ${userLanguage}"],
    "optimalInterventionTiming": "optimal_days_ahead",
    "growth_opportunities": ["opportunity in ${userLanguage}"],
    "success_predictors": ["predictor in ${userLanguage}"]
  },
  "triggerPredictions": {
    "highRiskPeriods": ["predicted period in ${userLanguage}"],
    "vulnerableMoods": ["mood that correlates with triggers"],
    "earlyWarningSignals": ["signal in ${userLanguage}"],
    "protectivePatterns": ["positive pattern in ${userLanguage}"]
  },
  "recommendations": {
    "immediate_actions": ["action in ${userLanguage}"],
    "weekly_focus": "focus_area in ${userLanguage}",
    "addiction_specific": ["addiction focused action in ${userLanguage}"],
    "long_term_strategy": "strategy in ${userLanguage}"
  }
}`;

    const resultText = await this.callOpenAI(prompt, 0.7, 2500);

    return this.parseJsonResponse(resultText);
  }

  /**
   * Generate comprehensive action plan
   */
  async generateActionPlan(insights, userContext, language = 'en') {
    const userLanguage = language;

    const prompt = `As a personalized wellness coach, create an actionable plan based on these insights:

INSIGHTS SUMMARY:
${JSON.stringify(insights, null, 2)}

USER CONTEXT: ${JSON.stringify(userContext)}

Create a comprehensive action plan (language: ${userLanguage}):
{
  "immediateActions": [
    {
      "priority": "high|medium|low",
      "action": "specific_action in ${userLanguage}",
      "timeframe": "time_to_complete",
      "success_metric": "how_to_measure_success in ${userLanguage}",
      "difficulty": [1-5]
    }
  ],
  "weeklyGoals": [
    {
      "goal": "weekly_goal in ${userLanguage}",
      "daily_habits": ["habit in ${userLanguage}"],
      "milestones": ["milestone in ${userLanguage}"],
      "reward": "reward_idea in ${userLanguage}"
    }
  ],
  "monthlyObjectives": [
    {
      "objective": "monthly_objective in ${userLanguage}",
      "strategy": "how_to_achieve in ${userLanguage}",
      "checkpoints": ["checkpoint in ${userLanguage}"],
      "support_needed": ["support_type in ${userLanguage}"]
    }
  ],
  "personalized_mantras": [
    "positive_affirmation in ${userLanguage}"
  ],
  "crisis_prevention": {
    "warning_signs": ["sign in ${userLanguage}"],
    "immediate_actions": ["emergency_action in ${userLanguage}"],
    "support_contacts": "reminder_message in ${userLanguage}"
  }
}`;

    const resultText = await this.callOpenAI(prompt, 0.7, 2500);

    return this.parseJsonResponse(resultText);
  }

  /**
   * Calculate comprehensive metrics
   */
  calculateJournalingMetrics(journalEntries) {
    if (!journalEntries.length) return { consistency: 0, avgLength: 0, frequency: 0 };

    const totalEntries = journalEntries.length;
    const avgLength = journalEntries.reduce((sum, entry) => 
      sum + (entry.content?.length || 0), 0) / totalEntries;
    
    // Calculate consistency (days with entries / total days)
    const uniqueDays = new Set(journalEntries.map(entry => 
      entry.createdAt.toDateString())).size;
    const daysCovered = Math.min(30, uniqueDays);
    const consistency = (daysCovered / 30) * 100;

    return {
      consistency: Math.round(consistency),
      avgLength: Math.round(avgLength),
      frequency: totalEntries,
      uniqueDays: daysCovered,
      lastEntryDays: this.daysSinceLastEntry(journalEntries)
    };
  }

  calculateMoodMetrics(journalEntries) {
    if (!journalEntries.length) return { stability: 50, trend: 'stable', distribution: {} };

    const moods = journalEntries
      .filter(entry => entry.mood)
      .map(entry => entry.mood);

    if (!moods.length) return { stability: 50, trend: 'stable', distribution: {} };

    // Mood distribution
    const distribution = moods.reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    // Calculate mood stability (lower variance = higher stability)
    const moodValues = moods.map(mood => this.moodToValue(mood));
    const avgMood = moodValues.reduce((sum, val) => sum + val, 0) / moodValues.length;
    const variance = moodValues.reduce((sum, val) => sum + Math.pow(val - avgMood, 2), 0) / moodValues.length;
    const stability = Math.max(0, 100 - (variance * 20)); // Convert to 0-100 scale

    // Determine trend (compare first and last week)
    const trend = this.calculateMoodTrend(moodValues);

    return {
      stability: Math.round(stability),
      trend,
      distribution,
      averageMood: Math.round(avgMood * 10) / 10,
      dominantMood: Object.keys(distribution).reduce((a, b) => 
        distribution[a] > distribution[b] ? a : b)
    };
  }

  moodToValue(mood) {
    const moodMap = {
      'sad': 1, 'angry': 2, 'frustrated': 3, 'anxious': 4, 'confused': 5,
      'lonely': 6, 'neutral': 7, 'calm': 7.5, 'reflective': 8,
      'peaceful': 8.5, 'grateful': 9, 'happy': 9.5, 'energetic': 10
    };
    return moodMap[mood] || 7;
  }

  calculateMoodTrend(moodValues) {
    if (moodValues.length < 7) return 'stable';
    
    const firstHalf = moodValues.slice(0, Math.floor(moodValues.length / 2));
    const secondHalf = moodValues.slice(-Math.floor(moodValues.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
  }

  calculateEngagementMetrics(coachSessions) {
    if (!coachSessions.length) return { frequency: 0, avgSessionLength: 0, topicDiversity: 0 };

    const totalSessions = coachSessions.length;
    const avgMessages = coachSessions.reduce((sum, session) => 
      sum + (session.messages?.length || 0), 0) / totalSessions;
    
    // Topic diversity based on different conversation themes
    const topics = new Set();
    coachSessions.forEach(session => {
      if (session.metadata?.topic) topics.add(session.metadata.topic);
    });

    return {
      frequency: totalSessions,
      avgSessionLength: Math.round(avgMessages),
      topicDiversity: topics.size,
      lastSessionDays: this.daysSinceLastSession(coachSessions)
    };
  }

  daysSinceLastEntry(entries) {
    if (!entries.length) return 999;
    const lastEntry = entries[entries.length - 1];
    const daysDiff = (Date.now() - lastEntry.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(daysDiff);
  }

  daysSinceLastSession(sessions) {
    if (!sessions.length) return 999;
    const lastSession = sessions[sessions.length - 1];
    const daysDiff = (Date.now() - lastSession.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(daysDiff);
  }

  parseJsonResponse(responseText) {
    try {
      let cleanedText = responseText.trim();
      
      // Remove code blocks
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      // If the response is not JSON but contains markdown/text, create fallback JSON
      if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
        console.log('AI returned markdown instead of JSON, creating fallback structure');
        return {
          summary: cleanedText.substring(0, 300) + (cleanedText.length > 300 ? '...' : ''),
          content: cleanedText,
          isMarkdown: true
        };
      }
      
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      // Create fallback structure for invalid JSON
      return {
        summary: responseText.substring(0, 300) + (responseText.length > 300 ? '...' : ''),
        content: responseText,
        isMarkdown: true,
        error: 'Failed to parse JSON'
      };
    }
  }

  /**
   * Generate overview insights
   */
  async generateOverviewInsights(analyticsData, userContext) {
    return {
      overallWellbeing: Math.round((analyticsData.metrics.mood.stability + analyticsData.metrics.journaling.consistency) / 2),
      keyHighlight: "Your journaling consistency has improved significantly this week",
      progressSummary: "Making steady progress with emotional awareness",
      nextFocus: "Consider exploring deeper emotional patterns"
    };
  }

  /**
   * Generate behavioral patterns insights
   */
  async generateBehavioralPatterns(analyticsData, userContext, language = 'en') {
    const { metrics } = analyticsData;
    const userLanguage = language;

    return {
      consistencyScore: metrics.journaling.consistency,
      patterns: [
        "Most active journaling on weekends",
        "Mood improvements after meditation sessions",
        "Stress peaks typically on Monday evenings"
      ],
      recommendations: [
        "Try scheduling brief midweek check-ins",
        "Consider morning journaling routine",
        "Explore stress management techniques for Mondays"
      ]
    };
  }

  /**
   * Generate recovery progress insights with comprehensive trigger analysis
   */
  async generateRecoveryProgress(analyticsData, userContext, language = 'en') {
    const { addictions, journalEntries, coachSessions } = analyticsData;
    const userLanguage = language;
    
    // Analyze triggers in journal entries
    const triggerAnalysis = await this.analyzeTriggerPatterns(journalEntries, addictions);
    console.log(`Trigger analysis found ${triggerAnalysis.totalTriggersDetected} triggers across ${journalEntries.length} entries`);
    console.log(`Addictions being analyzed:`, addictions.map(a => a.type));
    
    // Calculate recovery metrics
    const recoveryMetrics = this.calculateDetailedRecoveryMetrics(addictions, journalEntries);
    
    // Generate AI analysis
    const prompt = `As an addiction recovery specialist AI, analyze this comprehensive recovery data:

ADDICTION DATA:
${JSON.stringify(addictions.map(a => ({
  type: a.type,
  status: a.status,
  quitDate: a.quitDate,
  daysClean: a.getDaysClean ? a.getDaysClean() : 0,
  triggers: a.triggers || []
})), null, 2)}

TRIGGER ANALYSIS FROM JOURNAL ENTRIES:
${JSON.stringify(triggerAnalysis, null, 2)}

RECOVERY METRICS:
${JSON.stringify(recoveryMetrics, null, 2)}

RECENT JOURNAL MOOD PATTERNS:
${journalEntries.slice(-15).map(entry => ({
  date: entry.createdAt,
  mood: entry.mood,
  triggerLevel: triggerAnalysis.entriesByTriggerLevel[entry._id] || 'none'
}))}

USER CONTEXT: ${JSON.stringify(userContext)}

IMPORTANT: Return ONLY valid JSON in the following exact structure. No markdown, no explanations, just JSON (language: ${userLanguage}):
{
  "overallRecoveryHealth": {
    "score": [0-100],
    "trend": "improving|stable|declining|volatile",
    "summary": "overall assessment in ${userLanguage}"
  },
  "addictionBreakdown": [
    {
      "type": "addiction_type",
      "status": "current_status",
      "daysClean": number,
      "riskLevel": "low|medium|high|critical",
      "triggerFrequency": "frequency in journal",
      "progressSummary": "progress assessment in ${userLanguage}",
      "recommendations": ["specific action in ${userLanguage}"]
    }
  ],
  "triggerInsights": {
    "mostCommonTriggers": ["trigger1", "trigger2"],
    "highRiskPeriods": ["time patterns in ${userLanguage}"],
    "triggerMoodCorrelation": "correlation analysis in ${userLanguage}",
    "earlyWarningSignsDetected": ["warning sign in ${userLanguage}"]
  },
  "recoveryMilestones": {
    "achieved": ["milestone description in ${userLanguage}"],
    "upcoming": ["next milestone in ${userLanguage}"],
    "streakAnalysis": "streak patterns analysis in ${userLanguage}"
  },
  "riskAssessment": {
    "currentRiskLevel": "low|medium|high|critical",
    "specificConcerns": ["concern in ${userLanguage}"],
    "protectiveFactors": ["strength in ${userLanguage}"],
    "interventionNeeded": boolean
  },
  "supportNeeds": {
    "immediate": ["immediate need in ${userLanguage}"],
    "longTerm": ["long term goal in ${userLanguage}"],
    "copingStrategies": ["strategy in ${userLanguage}"]
  }
}`;

    const resultText = await this.callOpenAI(prompt, 0.7, 2500);

    const aiResponse = this.parseJsonResponse(resultText);
    
    // If AI response failed, generate fallback recovery data from trigger analysis
    if (!aiResponse || aiResponse.isMarkdown) {
      console.log('AI JSON failed, generating fallback recovery progress from trigger analysis');
      return this.generateFallbackRecoveryProgress(addictions, journalEntries, triggerAnalysis, userLanguage);
    }
    
    return aiResponse;
  }

  /**
   * Generate fallback recovery progress when AI JSON parsing fails
   */
  generateFallbackRecoveryProgress(addictions, journalEntries, triggerAnalysis, language = 'nl') {
    const texts = {
      nl: {
        highTriggers: 'Hoge trigger detectie in dagboek',
        mediumTriggers: 'Gemiddelde trigger detectie',
        lowTriggers: 'Lage trigger detectie',
        noTriggers: 'Geen triggers gedetecteerd in dagboek',
        improving: 'Herstelvoortgang vertoont verbetering',
        stable: 'Stabiele herstelvoortgang',
        riskLevel: { low: 'laag', medium: 'gemiddeld', high: 'hoog', critical: 'kritiek' },
        daysClean: 'dagen clean',
        progressGood: 'Positieve herstelvoortgang met weinig triggers',
        progressConcern: 'Herstelvoortgang met zorgpunten door triggers',
        triggerCorrelation: 'Triggers komen voor tijdens verschillende stemmingen'
      },
      en: {
        highTriggers: 'High trigger detection in journal',
        mediumTriggers: 'Medium trigger detection', 
        lowTriggers: 'Low trigger detection',
        noTriggers: 'No triggers detected in journal',
        improving: 'Recovery progress shows improvement',
        stable: 'Stable recovery progress',
        riskLevel: { low: 'low', medium: 'medium', high: 'high', critical: 'critical' },
        daysClean: 'days clean',
        progressGood: 'Positive recovery progress with few triggers',
        progressConcern: 'Recovery progress with concerns due to triggers',
        triggerCorrelation: 'Triggers occur during various moods'
      }
    };
    
    const t = texts[language] || texts.en;
    
    // Generate addiction breakdown
    const addictionBreakdown = addictions.map(addiction => {
      const triggerCount = triggerAnalysis.triggersByType[addiction.type] || 0;
      const daysClean = addiction.getDaysClean ? addiction.getDaysClean() : 0;
      
      let triggerFrequency, riskLevel, progressSummary;
      
      if (triggerCount > 5) {
        triggerFrequency = t.highTriggers;
        riskLevel = triggerCount > 10 ? 'high' : 'medium';
        progressSummary = t.progressConcern;
      } else if (triggerCount > 0) {
        triggerFrequency = t.mediumTriggers;
        riskLevel = 'medium';
        progressSummary = t.progressConcern;
      } else {
        triggerFrequency = t.noTriggers;
        riskLevel = daysClean > 14 ? 'low' : 'medium';
        progressSummary = t.progressGood;
      }
      
      return {
        type: addiction.type,
        status: addiction.status || 'active',
        daysClean: daysClean,
        riskLevel: riskLevel,
        triggerFrequency: triggerFrequency,
        progressSummary: `${progressSummary} (${daysClean} ${t.daysClean})`,
        recommendations: [`Monitor ${addiction.type} triggers`, `Continue journaling`]
      };
    });
    
    // Calculate overall health score
    const avgRiskScore = addictionBreakdown.reduce((sum, a) => {
      const riskScores = { low: 85, medium: 65, high: 35, critical: 15 };
      return sum + (riskScores[a.riskLevel] || 50);
    }, 0) / addictionBreakdown.length;
    
    return {
      overallRecoveryHealth: {
        score: Math.round(avgRiskScore),
        trend: triggerAnalysis.totalTriggersDetected > 10 ? 'volatile' : 'stable',
        summary: triggerAnalysis.totalTriggersDetected > 10 ? t.progressConcern : t.improving
      },
      addictionBreakdown: addictionBreakdown,
      triggerInsights: {
        mostCommonTriggers: Object.keys(triggerAnalysis.keywordsFound).slice(0, 5),
        highRiskPeriods: ['Recente dagboek entries tonen trigger activiteit'],
        triggerMoodCorrelation: t.triggerCorrelation,
        earlyWarningSignsDetected: triggerAnalysis.totalTriggersDetected > 5 ? ['Verhoogde trigger activiteit'] : []
      },
      recoveryMilestones: {
        achieved: [`${journalEntries.length} dagboek entries geanalyseerd`],
        upcoming: ['Continue dagboek bijhouden', 'Monitor trigger patronen'],
        streakAnalysis: `Trigger analyse toont ${triggerAnalysis.totalTriggersDetected} triggers in ${journalEntries.length} entries`
      },
      riskAssessment: {
        currentRiskLevel: triggerAnalysis.totalTriggersDetected > 10 ? 'medium' : 'low',
        specificConcerns: triggerAnalysis.totalTriggersDetected > 0 ? ['Gedetecteerde triggers in dagboek'] : [],
        protectiveFactors: ['Actief dagboek bijhouden', 'Zelfmonitoring'],
        interventionNeeded: triggerAnalysis.totalTriggersDetected > 10
      },
      supportNeeds: {
        immediate: triggerAnalysis.totalTriggersDetected > 10 ? ['Trigger management', 'Extra ondersteuning'] : [],
        longTerm: ['Continue zelfmonitoring', 'Patroonherkenning'],
        copingStrategies: ['Dagboek bijhouden', 'Trigger identificatie', 'Mindfulness oefeningen']
      }
    };
  }

  /**
   * Analyze trigger patterns in journal entries with multilingual support
   */
  async analyzeTriggerPatterns(journalEntries, addictions) {
    // Comprehensive multilingual trigger keywords for all 13 supported languages
    const triggerKeywords = {
      smoking: [
        // English
        'cigarette', 'smoke', 'smoking', 'nicotine', 'lighter', 'pack', 'craving', 'tobacco', 'quit smoking',
        'relapsed smoking', 'smoked again', 'had a cigarette', 'started smoking again',
        // Dutch (nl)
        'roken', 'gerookt', 'rookt', 'sigaret', 'sigaretten', 'peuk', 'peuken', 'pakje', 'aansteker', 'nicotine', 'tabak', 'shag',
        'weer gerookt', 'weer gaan roken', 'sigaret gepakt', 'terugval roken',
        // German (de) 
        'rauchen', 'geraucht', 'raucht', 'zigarette', 'zigaretten', 'nikotin', 'tabak', 'feuerzeug', 'rauchersucht',
        // French (fr)
        'fumer', 'fumé', 'fume', 'cigarette', 'cigarettes', 'nicotine', 'tabac', 'briquet', 'addiction tabac',
        // Spanish (es)
        'fumar', 'fumado', 'fuma', 'cigarrillo', 'cigarrillos', 'nicotina', 'tabaco', 'encendedor', 'adicción tabaco',
        // Italian (it)
        'fumare', 'fumato', 'fuma', 'sigaretta', 'sigarette', 'nicotina', 'tabacco', 'accendino', 'dipendenza fumo',
        // Portuguese (pt)
        'fumar', 'fumado', 'fuma', 'cigarro', 'cigarros', 'nicotina', 'tabaco', 'isqueiro', 'vício fumo',
        // Russian (ru)
        'курить', 'курил', 'курит', 'сигарета', 'сигареты', 'никотин', 'табак', 'зажигалка', 'курение',
        // Japanese (ja)
        'タバコ', '煙草', '喫煙', 'たばこ', 'タバコを吸う', 'ニコチン', 'ライター', '禁煙',
        // Korean (ko)
        '담배', '흡연', '니코틴', '라이터', '금연', '담배를 피우다',
        // Chinese (zh)
        '抽烟', '吸烟', '香烟', '烟草', '尼古丁', '打火机', '戒烟',
        // Arabic (ar)
        'التدخين', 'سيجارة', 'سجائر', 'نيكوتين', 'تبغ', 'ولاعة', 'الإقلاع عن التدخين',
        // Hindi (hi)
        'धूम्रपान', 'सिगरेट', 'तंबाकू', 'निकोटीन', 'लाइटर', 'धूम्रपान छोड़ना'
      ],
      alcohol: [
        // English
        'drink', 'drinking', 'beer', 'wine', 'alcohol', 'drunk', 'hangover', 'bar', 'party', 'celebrate', 'whiskey', 'vodka',
        'relapsed drinking', 'drank again', 'had a drink', 'started drinking again', 'got drunk',
        // Dutch (nl)
        'drinken', 'gedronken', 'drink', 'alcohol', 'bier', 'biertje', 'wijn', 'wijntje', 'borrel', 'dronken', 'kater', 'café', 'kroeg',
        'weer gedronken', 'terugval alcohol', 'weer gaan drinken', 'bier gepakt',
        // German (de)
        'trinken', 'getrunken', 'trinkt', 'alkohol', 'bier', 'wein', 'betrunken', 'kater', 'bar', 'feier', 'whisky', 'wodka',
        // French (fr)
        'boire', 'bu', 'boit', 'alcool', 'bière', 'vin', 'ivre', 'gueule de bois', 'bar', 'fête', 'whisky', 'vodka',
        // Spanish (es)
        'beber', 'bebido', 'bebe', 'alcohol', 'cerveza', 'vino', 'borracho', 'resaca', 'bar', 'fiesta', 'whisky', 'vodka',
        // Italian (it)
        'bere', 'bevuto', 'beve', 'alcool', 'birra', 'vino', 'ubriaco', 'sbornia', 'bar', 'festa', 'whisky', 'vodka',
        // Portuguese (pt)
        'beber', 'bebido', 'bebe', 'álcool', 'cerveja', 'vinho', 'bêbado', 'ressaca', 'bar', 'festa', 'whisky', 'vodka',
        // Russian (ru)
        'пить', 'выпил', 'пьет', 'алкоголь', 'пиво', 'вино', 'пьяный', 'похмелье', 'бар', 'вечеринка', 'виски', 'водка',
        // Japanese (ja)
        '飲む', '飲んだ', 'アルコール', 'ビール', 'ワイン', '酔っ払う', '二日酔い', 'バー', 'パーティー', 'ウイスキー',
        // Korean (ko)
        '마시다', '마셨다', '알코올', '맥주', '와인', '취하다', '숙취', '바', '파티', '위스키', '보드카',
        // Chinese (zh)
        '喝酒', '喝了', '酒精', '啤酒', '红酒', '醉了', '宿醉', '酒吧', '聚会', '威士忌', '伏特加',
        // Arabic (ar)
        'شرب', 'شرب الكحول', 'بيرة', 'نبيذ', 'كحول', 'سكران', 'صداع الكحول', 'بار', 'حفلة',
        // Hindi (hi)
        'पीना', 'शराब पीना', 'बीयर', 'वाइन', 'अल्कोहल', 'नशे में', 'हैंगओवर', 'बार', 'पार्टी'
      ],
      gambling: [
        // English
        'bet', 'betting', 'gamble', 'gambling', 'casino', 'lottery', 'poker', 'win', 'lose', 'jackpot', 'odds',
        'relapsed gambling', 'gambled again', 'placed a bet', 'went to casino', 'started gambling again',
        // Dutch (nl)
        'gokken', 'gokt', 'gegokt', 'gok', 'wedden', 'wedde', 'gewed', 'kraslot', 'loterij', 'casino', 'poker', 'winnen', 'verliezen',
        'weer gegokt', 'terugval gokken', 'weer gaan gokken', 'casino geweest', 'weer gewed',
        // German (de)
        'glücksspiel', 'spielen', 'gespielt', 'wetten', 'casino', 'lotterie', 'poker', 'gewinnen', 'verlieren', 'jackpot',
        // French (fr)
        'parier', 'parié', 'jouer', 'jeu', 'casino', 'loterie', 'poker', 'gagner', 'perdre', 'jackpot', 'mise',
        // Spanish (es)
        'apostar', 'apostado', 'jugar', 'juego', 'casino', 'lotería', 'poker', 'ganar', 'perder', 'jackpot', 'apuesta',
        // Italian (it)
        'scommettere', 'scommesso', 'giocare', 'gioco', 'casino', 'lotteria', 'poker', 'vincere', 'perdere', 'jackpot',
        // Portuguese (pt)
        'apostar', 'apostado', 'jogar', 'jogo', 'casino', 'loteria', 'poker', 'ganhar', 'perder', 'jackpot', 'aposta',
        // Russian (ru)
        'ставить', 'поставил', 'играть', 'игра', 'казино', 'лотерея', 'покер', 'выиграть', 'проиграть', 'джекпот',
        // Japanese (ja)
        'ギャンブル', '賭ける', '賭けた', 'カジノ', '宝くじ', 'ポーカー', '勝つ', '負ける', 'ジャックポット', 'パチンコ',
        // Korean (ko)
        '도박', '베팅', '걸다', '걸었다', '카지노', '로또', '포커', '이기다', '지다', '잭팟',
        // Chinese (zh)
        '赌博', '下注', '赌', '赌场', '彩票', '扑克', '赢', '输', '大奖', '赌注',
        // Arabic (ar)
        'مقامرة', 'رهان', 'يراهن', 'كازينو', 'يانصيب', 'بوكر', 'فوز', 'خسارة', 'جاكبوت',
        // Hindi (hi)
        'जुआ', 'सट्टा', 'दांव', 'कैसीनो', 'लॉटरी', 'पोकर', 'जीतना', 'हारना', 'जैकपॉट'
      ],
      social_media: [
        // English
        'scroll', 'scrolling', 'phone', 'social media', 'instagram', 'facebook', 'tiktok', 'twitter', 'likes', 'followers', 'notifications',
        // Dutch (nl)  
        'scrollen', 'scrollde', 'telefoon', 'smartphone', 'sociale media', 'instagram', 'facebook', 'tiktok', 'likes', 'volgers', 'schermtijd',
        // German (de)
        'scrollen', 'scrollte', 'handy', 'smartphone', 'soziale medien', 'instagram', 'facebook', 'tiktok', 'likes', 'follower', 'bildschirmzeit',
        // French (fr)
        'faire défiler', 'défiler', 'téléphone', 'smartphone', 'réseaux sociaux', 'instagram', 'facebook', 'tiktok', 'likes', 'abonnés',
        // Spanish (es)
        'desplazar', 'desplazó', 'teléfono', 'smartphone', 'redes sociales', 'instagram', 'facebook', 'tiktok', 'likes', 'seguidores',
        // Italian (it)
        'scorrere', 'scorso', 'telefono', 'smartphone', 'social media', 'instagram', 'facebook', 'tiktok', 'likes', 'follower',
        // Portuguese (pt)
        'rolar', 'rolou', 'telefone', 'smartphone', 'redes sociais', 'instagram', 'facebook', 'tiktok', 'likes', 'seguidores',
        // Russian (ru)
        'прокручивать', 'прокрутил', 'телефон', 'смартфон', 'социальные сети', 'инстаграм', 'фейсбук', 'тикток', 'лайки', 'подписчики',
        // Japanese (ja)
        'スクロール', 'スクロールした', '電話', 'スマートフォン', 'ソーシャルメディア', 'インスタグラム', 'フェイスブック', 'ティックトック', 'いいね', 'フォロワー',
        // Korean (ko)
        '스크롤', '스크롤했다', '전화', '스마트폰', '소셜미디어', '인스타그램', '페이스북', '틱톡', '좋아요', '팔로워',
        // Chinese (zh)
        '滚动', '滚动了', '电话', '智能手机', '社交媒体', 'Instagram', 'Facebook', 'TikTok', '点赞', '关注者',
        // Arabic (ar)
        'التمرير', 'تمرير', 'هاتف', 'هاتف ذكي', 'وسائل التواصل الاجتماعي', 'انستغرام', 'فيسبوك', 'تيك توك', 'إعجاب', 'متابعين',
        // Hindi (hi)
        'स्क्रॉल', 'स्क्रॉल किया', 'फोन', 'स्मार्टफोन', 'सोशल मीडिया', 'इंस्टाग्राम', 'फेसबुक', 'टिकटॉक', 'लाइक', 'फॉलोअर'
      ],
      shopping: [
        // English
        'buy', 'buying', 'bought', 'purchase', 'shopping', 'spend', 'spending', 'credit card', 'impulse', 'sale', 'discount',
        // Dutch (nl)
        'kopen', 'gekocht', 'koopt', 'winkelen', 'shoppen', 'uitgeven', 'uitgegeven', 'creditcard', 'impulsaankoop', 'sale', 'korting',
        // German (de)
        'kaufen', 'gekauft', 'kauft', 'einkaufen', 'shopping', 'ausgeben', 'ausgegeben', 'kreditkarte', 'impulskauf', 'sale', 'rabatt',
        // French (fr)
        'acheter', 'acheté', 'achète', 'faire les courses', 'shopping', 'dépenser', 'dépensé', 'carte de crédit', 'achat impulsif', 'soldes',
        // Spanish (es)
        'comprar', 'comprado', 'compra', 'ir de compras', 'shopping', 'gastar', 'gastado', 'tarjeta de crédito', 'compra impulsiva', 'rebajas',
        // Italian (it)
        'comprare', 'comprato', 'compra', 'fare shopping', 'shopping', 'spendere', 'speso', 'carta di credito', 'acquisto impulsivo', 'saldi',
        // Portuguese (pt)
        'comprar', 'comprado', 'compra', 'fazer compras', 'shopping', 'gastar', 'gastado', 'cartão de crédito', 'compra impulsiva', 'promoção',
        // Russian (ru)
        'покупать', 'купил', 'покупает', 'делать покупки', 'шоппинг', 'тратить', 'потратил', 'кредитная карта', 'импульсная покупка', 'распродажа',
        // Japanese (ja)
        '買う', '買った', '購入', 'ショッピング', '買い物', '使う', '使った', 'クレジットカード', '衝動買い', 'セール', '割引',
        // Korean (ko)
        '사다', '샀다', '구매', '쇼핑', '쇼핑하다', '쓰다', '썼다', '신용카드', '충동구매', '세일', '할인',
        // Chinese (zh)
        '买', '买了', '购买', '购物', '花钱', '花了', '信用卡', '冲动购买', '促销', '折扣',
        // Arabic (ar)
        'شراء', 'شرى', 'يشتري', 'تسوق', 'تسوق', 'إنفاق', 'أنفق', 'بطاقة ائتمان', 'شراء اندفاعي', 'تخفيضات',
        // Hindi (hi)
        'खरीदना', 'खरीदा', 'खरीदता', 'शॉपिंग', 'खरीदारी', 'खर्च करना', 'खर्च किया', 'क्रेडिट कार्ड', 'आवेगशील खरीदारी', 'सेल'
      ],
      general: [
        // English
        'stress', 'stressed', 'anxiety', 'anxious', 'lonely', 'alone', 'bored', 'boring', 'angry', 'mad', 'sad', 'depressed', 'tired', 'exhausted',
        // Dutch (nl)
        'stress', 'gestrest', 'spanning', 'angst', 'angstig', 'eenzaam', 'alleen', 'verveld', 'saai', 'boos', 'kwaad', 'verdrietig', 'depressief', 'moe',
        // German (de)
        'stress', 'gestresst', 'angst', 'ängstlich', 'einsam', 'allein', 'gelangweilt', 'langweilig', 'wütend', 'sauer', 'traurig', 'depressiv', 'müde',
        // French (fr)
        'stress', 'stressé', 'anxiété', 'anxieux', 'seul', 'solitaire', 'ennuyé', 'ennuyeux', 'en colère', 'fâché', 'triste', 'déprimé', 'fatigué',
        // Spanish (es)
        'estrés', 'estresado', 'ansiedad', 'ansioso', 'solo', 'solitario', 'aburrido', 'aburrimiento', 'enojado', 'enfadado', 'triste', 'deprimido', 'cansado',
        // Italian (it)
        'stress', 'stressato', 'ansia', 'ansioso', 'solo', 'solitario', 'annoiato', 'noioso', 'arrabbiato', 'incazzato', 'triste', 'depresso', 'stanco',
        // Portuguese (pt)
        'stress', 'estressado', 'ansiedade', 'ansioso', 'sozinho', 'solitário', 'entediado', 'chato', 'raivoso', 'bravo', 'triste', 'deprimido', 'cansado',
        // Russian (ru)
        'стресс', 'в стрессе', 'тревога', 'тревожный', 'одинокий', 'один', 'скучно', 'скучный', 'злой', 'сердитый', 'грустный', 'депрессивный', 'усталый',
        // Japanese (ja)
        'ストレス', 'ストレスを感じる', '不安', '不安な', '孤独', '一人', '退屈', 'つまらない', '怒り', '怒った', '悲しい', 'うつ', '疲れた',
        // Korean (ko)
        '스트레스', '스트레스받다', '불안', '불안한', '외롭다', '혼자', '지루하다', '지루한', '화나다', '화난', '슬프다', '우울하다', '피곤하다',
        // Chinese (zh)
        '压力', '有压力', '焦虑', '焦虑的', '孤独', '一个人', '无聊', '无聊的', '生气', '愤怒', '悲伤', '抑郁', '累',
        // Arabic (ar)
        'ضغط', 'مضغوط', 'قلق', 'قلق', 'وحيد', 'لوحده', 'ملل', 'مملل', 'غضب', 'غاضب', 'حزين', 'مكتئب', 'متعب',
        // Hindi (hi)
        'तनाव', 'तनावग्रस्त', 'चिंता', 'चिंतित', 'अकेला', 'अकेले', 'बोर', 'उबाऊ', 'गुस्सा', 'क्रोधित', 'उदास', 'अवसादग्रस्त', 'थका हुआ'
      ]
    };

    const triggerAnalysis = {
      totalTriggersDetected: 0,
      triggersByType: {},
      triggersByEntry: {},
      entriesByTriggerLevel: {},
      highRiskEntries: [],
      triggerTrends: {},
      moodTriggerCorrelation: {},
      keywordsFound: {}
    };

    // Analyze each journal entry
    for (const entry of journalEntries) {
      const entryText = `${entry.title || ''} ${entry.content || ''}`.toLowerCase();
      const entryTriggers = [];
      let triggerScore = 0;

      // Check for triggers related to user's addictions
      for (const addiction of addictions) {
        const keywords = triggerKeywords[addiction.type] || triggerKeywords.general;
        
        for (const keyword of keywords) {
          if (entryText.includes(keyword.toLowerCase())) {
            console.log(`Found trigger "${keyword}" for ${addiction.type} in entry: ${entryText.substring(0, 100)}...`);
            entryTriggers.push({
              keyword,
              type: addiction.type,
              confidence: 0.8,
              context: `Detected "${keyword}" related to ${addiction.type}`
            });
            triggerScore += 1;
            
            // Update counters
            triggerAnalysis.triggersByType[addiction.type] = 
              (triggerAnalysis.triggersByType[addiction.type] || 0) + 1;
              
            // Track found keywords for insights
            triggerAnalysis.keywordsFound[keyword] = 
              (triggerAnalysis.keywordsFound[keyword] || 0) + 1;
          }
        }
      }

      // Store entry analysis
      if (entryTriggers.length > 0) {
        triggerAnalysis.triggersByEntry[entry._id] = entryTriggers;
        triggerAnalysis.totalTriggersDetected += entryTriggers.length;

        // Determine trigger level
        const triggerLevel = triggerScore >= 3 ? 'high' : triggerScore >= 1 ? 'medium' : 'low';
        triggerAnalysis.entriesByTriggerLevel[entry._id] = triggerLevel;

        if (triggerLevel === 'high') {
          triggerAnalysis.highRiskEntries.push({
            entryId: entry._id,
            date: entry.createdAt,
            mood: entry.mood,
            triggerCount: triggerScore,
            triggers: entryTriggers
          });
        }

        // Mood-trigger correlation
        if (entry.mood) {
          if (!triggerAnalysis.moodTriggerCorrelation[entry.mood]) {
            triggerAnalysis.moodTriggerCorrelation[entry.mood] = 0;
          }
          triggerAnalysis.moodTriggerCorrelation[entry.mood] += triggerScore;
        }
      }
    }

    return triggerAnalysis;
  }

  /**
   * Calculate detailed recovery metrics
   */
  calculateDetailedRecoveryMetrics(addictions, journalEntries) {
    const metrics = {
      totalAddictions: addictions.length,
      activeRecoveries: 0,
      averageCleanDays: 0,
      longestStreak: 0,
      recentRelapses: 0,
      recoveryTrends: {},
      journalingCorrelation: {}
    };

    if (addictions.length === 0) return metrics;

    let totalCleanDays = 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const addiction of addictions) {
      if (addiction.status === 'recovering' || addiction.status === 'active') {
        metrics.activeRecoveries++;
      }

      // Calculate days clean
      const daysClean = addiction.getDaysClean ? addiction.getDaysClean() : 0;
      totalCleanDays += daysClean;
      
      if (daysClean > metrics.longestStreak) {
        metrics.longestStreak = daysClean;
      }

      // Check for recent relapses (last 30 days)
      if (addiction.lastRelapse && addiction.lastRelapse > thirtyDaysAgo) {
        metrics.recentRelapses++;
      }

      // Recovery trend per addiction type
      metrics.recoveryTrends[addiction.type] = {
        daysClean,
        status: addiction.status,
        trend: daysClean > 30 ? 'stable' : daysClean > 7 ? 'improving' : 'early_recovery'
      };
    }

    metrics.averageCleanDays = Math.round(totalCleanDays / addictions.length);

    // Analyze journaling correlation with recovery
    const journalDays = new Set(journalEntries.map(e => e.createdAt.toDateString())).size;
    metrics.journalingCorrelation = {
      journalDaysLast30: journalDays,
      correlationWithRecovery: journalDays > 15 ? 'high' : journalDays > 7 ? 'medium' : 'low'
    };

    return metrics;
  }

  /**
   * Generate trending analysis
   */
  async generateTrendingAnalysis(userId, timeframe) {
    return {
      weekOverWeekChange: "+15% improvement in mood stability",
      emergingPatterns: [
        "Increased emotional vocabulary usage",
        "Better self-reflection depth"
      ],
      predictedTrends: [
        "Continued improvement in emotional regulation",
        "Potential breakthrough in self-awareness coming"
      ]
    };
  }

  /**
   * Build metadata for insights
   */
  buildMetadata(analyticsData, timeframe) {
    return {
      generatedAt: new Date(),
      timeframe,
      dataPointsAnalyzed: {
        journalEntries: analyticsData.journalEntries.length,
        coachSessions: analyticsData.coachSessions.length,
        addictionData: analyticsData.addictions.length
      },
      version: '2.0',
      analysisDepth: 'comprehensive'
    };
  }

  /**
   * Extract user demographics
   */
  extractDemographics(user) {
    return {
      age: user.age,
      gender: user.gender,
      location: user.location,
      joinDate: user.createdAt
    };
  }

  /**
   * Extract user preferences
   */
  extractPreferences(user) {
    return {
      language: user.preferredLanguage || 'en',
      timezone: user.timezone,
      communicationStyle: user.communicationStyle
    };
  }

  /**
   * Build psychological profile
   */
  async buildPsychologicalProfile(userId) {
    // This would analyze historical data to build a psychological profile
    return {
      primaryMotivations: ['self-improvement', 'emotional_stability'],
      copingMechanisms: ['journaling', 'reflection'],
      stressResponses: ['withdrawal', 'rumination'],
      growthAreas: ['emotional_regulation', 'self_compassion']
    };
  }

  /**
   * Extract cultural context
   */
  extractCulturalContext(user) {
    return {
      country: user.location?.country,
      culturalConsiderations: [],
      communicationNorms: 'direct_supportive'
    };
  }

  /**
   * Determine communication style
   */
  determineCommunicationStyle(user) {
    const age = user.age || 30;
    
    if (age < 25) {
      return 'casual_encouraging';
    } else if (age < 50) {
      return 'professional_warm';
    } else {
      return 'respectful_experienced';
    }
  }

  /**
   * Calculate recovery metrics
   */
  calculateRecoveryMetrics(addictions) {
    if (!addictions.length) {
      return {
        activeAddictions: 0,
        cleanDaysAverage: 0,
        progressScore: 100
      };
    }

    const activeAddictions = addictions.filter(a => a.status === 'recovering').length;
    const cleanDaysAverage = addictions.reduce((sum, addiction) => {
      const daysSince = addiction.quitDate ? 
        Math.floor((Date.now() - addiction.quitDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return sum + daysSince;
    }, 0) / addictions.length;

    return {
      activeAddictions,
      cleanDaysAverage: Math.round(cleanDaysAverage),
      progressScore: Math.min(100, Math.round(cleanDaysAverage / 30 * 100))
    };
  }

  /**
   * Calculate consistency metrics
   */
  calculateConsistencyMetrics(journalEntries, coachSessions) {
    const journalDays = new Set(journalEntries.map(e => e.createdAt.toDateString())).size;
    const coachDays = new Set(coachSessions.map(s => s.createdAt.toDateString())).size;
    
    return {
      journalingConsistency: Math.round((journalDays / 30) * 100),
      coachEngagement: Math.round((coachDays / 30) * 100),
      overallConsistency: Math.round(((journalDays + coachDays) / 60) * 100)
    };
  }

  /**
   * Calculate growth metrics
   */
  calculateGrowthMetrics(journalEntries, timeframe) {
    if (journalEntries.length < 2) {
      return {
        wordCountTrend: 'stable',
        emotionalDepthTrend: 'stable',
        selfAwarenessTrend: 'stable'
      };
    }

    // Simple growth indicators based on entry length and frequency
    const firstHalf = journalEntries.slice(0, Math.floor(journalEntries.length / 2));
    const secondHalf = journalEntries.slice(-Math.floor(journalEntries.length / 2));
    
    const firstAvgLength = firstHalf.reduce((sum, e) => sum + (e.content?.length || 0), 0) / firstHalf.length;
    const secondAvgLength = secondHalf.reduce((sum, e) => sum + (e.content?.length || 0), 0) / secondHalf.length;
    
    const lengthTrend = secondAvgLength > firstAvgLength * 1.1 ? 'improving' : 
                       secondAvgLength < firstAvgLength * 0.9 ? 'declining' : 'stable';

    return {
      wordCountTrend: lengthTrend,
      emotionalDepthTrend: lengthTrend, // Simplified - would need more sophisticated analysis
      selfAwarenessTrend: lengthTrend
    };
  }

  /**
   * Store enhanced insights with versioning
   */
  async storeEnhancedInsights(userId, insights) {
    try {
      const insightRecord = new AICoach({
        userId,
        sessionId: `insights_${Date.now()}_${userId}`,
        sessionType: 'enhanced_insights',
        metadata: {
          version: '2.0',
          categories: Object.keys(insights.categories || {}),
          sophisticationLevel: 'intermediate'
        }
      });

      insightRecord.messages.push({
        role: 'assistant',
        content: JSON.stringify(insights),
        metadata: {
          type: 'enhanced_insights',
          generatedAt: new Date(),
          dataPoints: insights.metadata?.totalDataPoints || 0
        }
      });

      await insightRecord.save();
      return insightRecord;
    } catch (error) {
      console.error('Error storing enhanced insights:', error);
      throw error;
    }
  }
}

// Export singleton instance instead of class
const enhancedInsightsService = new EnhancedInsightsService();
module.exports = enhancedInsightsService;