const { GoogleGenerativeAI } = require("@google/generative-ai");
const AICoach = require('../models/AICoach');
const JournalEntry = require('../models/JournalEntry');
const Addiction = require('../models/Addiction');
const User = require('../models/User');

class AICoachService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Coach persona configuration
    this.coachPersona = {
      name: "Alex",
      personality: "empathetic, non-judgmental, practical, supportive",
      expertise: "addiction recovery, mindfulness, emotional support, behavioral change",
      style: "short actionable messages, gentle guidance, strength-based approach"
    };
    
    // Trigger keywords per addiction type
    this.triggerKeywords = {
      smoking: ['cigarette', 'smoke', 'nicotine', 'lighter', 'pack', 'craving', 'stress smoke'],
      alcohol: ['drink', 'beer', 'wine', 'drunk', 'hangover', 'bar', 'party', 'celebrate'],
      social_media: ['scroll', 'instagram', 'facebook', 'tiktok', 'likes', 'followers', 'phone'],
      gambling: ['bet', 'casino', 'lottery', 'poker', 'win', 'lose', 'jackpot', 'odds'],
      shopping: ['buy', 'purchase', 'sale', 'credit card', 'spend', 'shopping', 'impulse'],
      food: ['binge', 'overeat', 'comfort food', 'emotional eating', 'hunger', 'diet'],
      gaming: ['game', 'xbox', 'playstation', 'computer', 'hours', 'level', 'achievement']
    };
    
    // Coping strategies per addiction
    this.copingStrategies = {
      smoking: [
        "Try the 4-7-8 breathing technique: inhale for 4, hold for 7, exhale for 8",
        "Keep your hands busy with a stress ball or fidget toy",
        "Take a quick 5-minute walk outside",
        "Drink a glass of water slowly",
        "Call a supportive friend or family member"
      ],
      alcohol: [
        "Use the HALT check: Are you Hungry, Angry, Lonely, or Tired?",
        "Try a non-alcoholic alternative like sparkling water with lime",
        "Remove yourself from triggering environments",
        "Practice the 'surf the urge' technique - urges peak and subside",
        "Engage in a hobby or creative activity"
      ],
      social_media: [
        "Put your phone in another room for 30 minutes",
        "Set app time limits on your device",
        "Replace scrolling with reading a book or article",
        "Do a 5-minute mindfulness meditation",
        "Call or text a real friend instead"
      ]
    };
  }

  /**
   * Build personalized context string based on user profile
   */
  buildPersonalizedContext(user, addictions = []) {
    if (!user) {
      return `- User information: Limited profile data available
        - Active addictions: ${addictions.map(a => a.type).join(', ') || 'None specified'}
        - Preferred language: en`;
    }

    const age = user.age || (user.birthDate ? this.calculateAge(user.birthDate) : null);
    const location = user.location ? `${user.location.city || ''}, ${user.location.country || ''}`.trim().replace(/^,|,$/, '') : null;
    
    let context = `- User demographics: `;
    
    // Age and gender context
    if (age) {
      context += `${age} years old`;
      if (user.gender && user.gender !== 'prefer_not_to_say') {
        context += `, ${user.gender}`;
      }
    } else if (user.gender && user.gender !== 'prefer_not_to_say') {
      context += `${user.gender}`;
    } else {
      context += `Demographics not specified`;
    }
    
    // Location and cultural context
    if (location) {
      context += `\n        - Location: ${location}`;
    }
    
    // Language preference
    context += `\n        - Preferred language: ${user.preferredLanguage || 'en'}`;
    
    // Communication style based on age
    if (age) {
      if (age < 25) {
        context += `\n        - Communication style: Use contemporary, supportive language appropriate for young adults`;
      } else if (age >= 25 && age < 50) {
        context += `\n        - Communication style: Professional yet warm, focus on work-life balance and family considerations`;
      } else {
        context += `\n        - Communication style: Respectful, mature approach with emphasis on life experience and wisdom`;
      }
    }
    
    // Cultural considerations based on location
    if (user.location?.country) {
      const country = user.location.country.toLowerCase();
      if (['netherlands', 'nl', 'holland'].includes(country)) {
        context += `\n        - Cultural context: Dutch culture - direct communication, work-life balance, pragmatic approach`;
      } else if (['germany', 'de', 'deutschland'].includes(country)) {
        context += `\n        - Cultural context: German culture - structured approach, efficiency, direct feedback`;
      } else if (['united states', 'usa', 'us'].includes(country)) {
        context += `\n        - Cultural context: American culture - individualistic, goal-oriented, positive reinforcement`;
      } else if (['united kingdom', 'uk', 'britain'].includes(country)) {
        context += `\n        - Cultural context: British culture - polite, understated, dry humor appropriate`;
      }
    }
    
    // Addiction context
    if (addictions && addictions.length > 0) {
      context += `\n        - Active addictions: ${addictions.map(a => `${a.type} (${a.status})`).join(', ')}`;
      
      // Recovery stage considerations
      const recoveringAddictions = addictions.filter(a => a.status === 'recovering' || a.status === 'clean');
      if (recoveringAddictions.length > 0) {
        context += `\n        - Recovery stage: Actively working on ${recoveringAddictions.length} addiction(s)`;
      }
    } else {
      context += `\n        - Addictions: None currently specified`;
    }
    
    // Personal bio context
    if (user.bio && user.bio.trim()) {
      context += `\n        - Personal background: ${user.bio.trim()}`;
    }
    
    // Emergency contacts context (indicates support system)
    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
      const activeContacts = user.emergencyContacts.filter(c => c.isActive);
      context += `\n        - Support system: Has ${activeContacts.length} emergency contact(s) - indicates existing support network`;
    }
    
    return context;
  }

  /**
   * Calculate age from birth date
   */
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Analyze journal entry for triggers and emotional state
   */
  async analyzeJournalEntry(userId, journalEntry) {
    try {
      // Get user's addictions for context
      const addictions = await Addiction.find({ userId, status: { $in: ['active', 'recovering'] } });
      const user = await User.findById(userId);
      
      // Build personalized user context
      const userContext = this.buildPersonalizedContext(user, addictions);
      
      const prompt = `
        You are Alex, an empathetic AI addiction recovery coach. Analyze this journal entry for:
        1. Emotional state and sentiment
        2. Potential addiction triggers
        3. Risk level assessment
        4. Suggested interventions
        
        User context:
        ${userContext}
        
        Journal entry:
        Title: ${journalEntry.title}
        Content: ${journalEntry.content}
        Mood: ${journalEntry.mood}
        Date: ${journalEntry.date}
        
        Respond with a JSON object containing:
        {
          "sentimentScore": -1 to 1,
          "emotionalState": {
            "primary": "emotion",
            "secondary": ["emotions"],
            "stability": "stable|declining|improving|volatile"
          },
          "triggersDetected": [
            {
              "trigger": "specific trigger",
              "confidence": 0-1,
              "relatedAddiction": "addiction_type",
              "context": "why this is concerning"
            }
          ],
          "riskLevel": "low|medium|high",
          "riskFactors": ["factor1", "factor2"],
          "coachResponse": "supportive message in user's language",
          "suggestedInterventions": ["intervention1", "intervention2"]
        }
        
        Keep the coach response encouraging, short (max 100 words), and culturally appropriate.
      `;
      
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('Raw Gemini response for journal analysis:', responseText);
      
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      
      // Remove ```json and ``` markers
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      console.log('Cleaned Gemini response for journal analysis:', cleanedText);
      
      const analysis = JSON.parse(cleanedText);
      
      // Store analysis in AI Coach record
      await this.saveAnalysis(userId, 'analysis', analysis, journalEntry._id);
      
      return analysis;
      
    } catch (error) {
      console.error('Error analyzing journal entry:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Generate coaching chat response
   */
  async generateChatResponse(userId, userMessage, context = {}) {
    try {
      const user = await User.findById(userId);
      const addictions = await Addiction.find({ userId, status: { $in: ['active', 'recovering'] } });
      const recentCoachSessions = await AICoach.find({ userId })
        .sort({ createdAt: -1 })
        .limit(3);
      
      // Build conversation context
      const conversationHistory = recentCoachSessions
        .flatMap(session => session.messages.slice(-5)) // Last 5 messages per session
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      // Build personalized user context
      const userContext = this.buildPersonalizedContext(user, addictions);
      
      const prompt = `
        You are Alex, a professional AI addiction recovery coach. Respond to this user message with empathy and practical guidance.
        
        User context:
        ${userContext}
        - Current mood: ${context.mood || 'unknown'}
        
        Recent conversation:
        ${conversationHistory}
        
        Current user message: "${userMessage}"
        
        Guidelines:
        - Be warm, empathetic, and non-judgmental
        - Keep response under 150 words
        - Offer practical, actionable advice
        - Ask follow-up questions when appropriate
        - Use the user's preferred language and adapt cultural sensitivity
        - Reference their specific addiction type when relevant
        - Avoid clinical or medical advice
        - Focus on emotional support and behavioral strategies
        - Adapt your communication style to their age and background
        - Consider their location for relevant resources or references
        
        Respond as Alex would, naturally and conversationally.
      `;
      
      const result = await this.model.generateContent(prompt);
      const coachResponse = result.response.text();
      
      // Save conversation
      await this.saveChatMessage(userId, userMessage, coachResponse, context);
      
      return {
        response: coachResponse,
        suggestions: await this.getSuggestions(userId, userMessage),
        riskLevel: await this.assessRiskLevel(userMessage, addictions)
      };
      
    } catch (error) {
      console.error('Error generating chat response:', error);
      return {
        response: "I'm here to support you. Can you tell me how you're feeling right now?",
        suggestions: ["Take a deep breath", "Share more about your day"],
        riskLevel: "low"
      };
    }
  }

  /**
   * Detect triggers in text
   */
  async detectTriggers(text, userAddictions) {
    const triggers = [];
    const textLower = text.toLowerCase();
    
    for (const addiction of userAddictions) {
      const keywords = this.triggerKeywords[addiction.type] || [];
      
      for (const keyword of keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          triggers.push({
            trigger: keyword,
            confidence: 0.8,
            relatedAddiction: addiction.type,
            context: `Detected mention of "${keyword}" which may be triggering for ${addiction.type} addiction`
          });
        }
      }
    }
    
    return triggers;
  }

  /**
   * Generate proactive intervention
   */
  async generateIntervention(userId, triggerType, urgencyLevel = 'medium') {
    try {
      const user = await User.findById(userId);
      const addictions = await Addiction.find({ userId, type: triggerType });
      const addiction = addictions[0]; // Primary addiction of this type
      
      const strategies = this.copingStrategies[triggerType] || this.copingStrategies.general;
      
      // Build personalized user context
      const userContext = this.buildPersonalizedContext(user, addictions);
      
      const prompt = `
        You are Alex, an AI addiction recovery coach. The user is experiencing a potential trigger moment for ${triggerType}.
        
        Context:
        ${userContext}
        - Addiction type: ${triggerType}
        - Urgency: ${urgencyLevel}
        - Days clean: ${addiction ? addiction.getDaysClean() : 0}
        
        Provide immediate, practical intervention in this format:
        {
          "interventionType": "breathing|mindfulness|distraction|support_contact",
          "immediateAction": "specific action to take right now",
          "message": "encouraging message (max 80 words)",
          "copingStrategy": "detailed step-by-step strategy",
          "followUpQuestions": ["question1", "question2"]
        }
        
        Make it personal, urgent but calming, and actionable. Consider their age, cultural background, and personal context.
      `;
      
      const result = await this.model.generateContent(prompt);
      let text = result.response.text();
      
      // Clean markdown code blocks if present
      text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      
      const intervention = JSON.parse(text);
      
      // Save intervention
      await this.saveIntervention(userId, intervention);
      
      return intervention;
      
    } catch (error) {
      console.error('Error generating intervention:', error);
      return this.getDefaultIntervention(triggerType);
    }
  }

  /**
   * Generate daily insights
   */
  async generateDailyInsights(userId) {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get recent data
      const journalEntries = await JournalEntry.find({
        userId,
        date: { $gte: weekAgo }
      }).sort({ date: -1 });
      
      const coachSessions = await AICoach.find({
        userId,
        createdAt: { $gte: weekAgo }
      });
      
      const addictions = await Addiction.find({ userId });
      
      const prompt = `
        Generate weekly insights for addiction recovery progress.
        
        Data:
        - Journal entries: ${journalEntries.length} this week
        - Mood trends: ${journalEntries.map(e => e.mood).join(', ')}
        - Coach interactions: ${coachSessions.length}
        - Addictions: ${addictions.map(a => `${a.type} (${a.status})`).join(', ')}
        
        Provide insights in this format:
        {
          "weeklyProgress": "positive|neutral|concerning",
          "keyInsights": ["insight1", "insight2", "insight3"],
          "moodTrend": "improving|stable|declining",
          "achievements": ["achievement1", "achievement2"],
          "recommendedActions": ["action1", "action2"],
          "motivationalMessage": "encouraging message for the week ahead"
        }
        
        Be encouraging and focus on progress, however small.
      `;
      
      const result = await this.model.generateContent(prompt);
      let text = result.response.text();
      
      // Clean markdown code blocks if present
      text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      
      const insights = JSON.parse(text);
      
      return insights;
      
    } catch (error) {
      console.error('Error generating insights:', error);
      return this.getDefaultInsights();
    }
  }

  // Helper methods
  async saveAnalysis(userId, sessionType, analysis, journalId = null) {
    const sessionId = `${userId}_${Date.now()}_${sessionType}`;
    
    const coachSession = new AICoach({
      userId,
      sessionId,
      sessionType,
      analysisResults: {
        sentimentScore: analysis.sentimentScore,
        triggersDetected: analysis.triggersDetected,
        riskAssessment: {
          level: analysis.riskLevel,
          factors: analysis.riskFactors,
          recommendation: analysis.coachResponse
        },
        emotionalState: analysis.emotionalState
      }
    });
    
    if (analysis.coachResponse) {
      coachSession.messages.push({
        role: 'coach',
        content: analysis.coachResponse,
        metadata: {
          triggerDetected: analysis.triggersDetected.length > 0,
          riskLevel: analysis.riskLevel,
          relatedJournalId: journalId
        }
      });
    }
    
    return await coachSession.save();
  }

  async saveChatMessage(userId, userMessage, coachResponse, context) {
    const sessionId = `${userId}_${Date.now()}_chat`;
    
    const coachSession = new AICoach({
      userId,
      sessionId,
      sessionType: 'chat'
    });
    
    // Add user message
    coachSession.messages.push({
      role: 'user',
      content: userMessage,
      metadata: context
    });
    
    // Add coach response
    coachSession.messages.push({
      role: 'coach',
      content: coachResponse
    });
    
    return await coachSession.save();
  }

  async saveIntervention(userId, intervention) {
    const sessionId = `${userId}_${Date.now()}_intervention`;
    
    const coachSession = new AICoach({
      userId,
      sessionId,
      sessionType: 'intervention'
    });
    
    coachSession.addIntervention(intervention.interventionType, intervention.message);
    coachSession.messages.push({
      role: 'coach',
      content: intervention.message,
      metadata: {
        interventionType: intervention.interventionType,
        riskLevel: 'medium'
      }
    });
    
    return await coachSession.save();
  }

  // Default fallback responses
  getDefaultAnalysis() {
    return {
      sentimentScore: 0,
      emotionalState: { primary: "neutral", secondary: [], stability: "stable" },
      triggersDetected: [],
      riskLevel: "low",
      riskFactors: [],
      coachResponse: "Thank you for sharing. I'm here to support you on your journey.",
      suggestedInterventions: ["mindfulness", "breathing"]
    };
  }

  getDefaultIntervention(triggerType) {
    return {
      interventionType: "breathing",
      immediateAction: "Take 5 deep breaths",
      message: "You're stronger than this moment. Let's take it one breath at a time.",
      copingStrategy: "Breathe in for 4 counts, hold for 4, exhale for 6. Repeat 5 times.",
      followUpQuestions: ["How are you feeling now?", "What triggered this moment?"]
    };
  }

  getDefaultInsights() {
    return {
      weeklyProgress: "neutral",
      keyInsights: ["You're taking positive steps by using this app"],
      moodTrend: "stable",
      achievements: ["Staying engaged with your recovery"],
      recommendedActions: ["Continue journaling daily"],
      motivationalMessage: "Every day is a new opportunity for growth."
    };
  }

  async getSuggestions(userId, message) {
    try {
      // Get user context for personalized suggestions
      const user = await User.findById(userId);
      const addictions = await Addiction.find({ userId, status: { $in: ['active', 'recovering'] } });
      
      const messageLower = message.toLowerCase();
      let suggestions = [];
      
      // Base suggestions based on message content
      if (messageLower.includes('stress') || messageLower.includes('anxious')) {
        suggestions = this.getPersonalizedStressSuggestions(user, addictions);
      } else if (messageLower.includes('craving') || messageLower.includes('urge')) {
        suggestions = this.getPersonalizedCravingSuggestions(user, addictions);
      } else if (messageLower.includes('lonely') || messageLower.includes('isolated')) {
        suggestions = this.getPersonalizedSocialSuggestions(user, addictions);
      } else {
        suggestions = this.getPersonalizedGeneralSuggestions(user, addictions);
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
      // Fallback to simple suggestions
      const messageLower = message.toLowerCase();
      
      if (messageLower.includes('stress') || messageLower.includes('anxious')) {
        return ["Try a breathing exercise", "Take a short walk", "Practice mindfulness"];
      }
      
      if (messageLower.includes('craving') || messageLower.includes('urge')) {
        return ["Surf the urge", "Distract yourself", "Call support person"];
      }
      
      return ["Tell me more", "How can I help?", "What's on your mind?"];
    }
  }

  getPersonalizedStressSuggestions(user, addictions) {
    const age = user?.age || (user?.birthDate ? this.calculateAge(user.birthDate) : null);
    const country = user?.location?.country?.toLowerCase();
    
    let suggestions = ["Try the 4-7-8 breathing technique"];
    
    // Age-appropriate suggestions
    if (age && age < 25) {
      suggestions.push("Listen to calming music or nature sounds");
      suggestions.push("Try a quick meditation app session");
    } else if (age && age >= 50) {
      suggestions.push("Take a peaceful walk in nature");
      suggestions.push("Practice gentle stretching or yoga");
    } else {
      suggestions.push("Take a 10-minute break from what you're doing");
      suggestions.push("Try progressive muscle relaxation");
    }
    
    // Cultural adaptations
    if (['netherlands', 'nl', 'holland'].includes(country)) {
      suggestions.push("Go for a bike ride or walk along water");
    } else if (['germany', 'de'].includes(country)) {
      suggestions.push("Spend time in a forest or green space (Waldeinsamkeit)");
    }
    
    return suggestions;
  }

  getPersonalizedCravingSuggestions(user, addictions) {
    const age = user?.age || (user?.birthDate ? this.calculateAge(user.birthDate) : null);
    const addictionTypes = addictions.map(a => a.type);
    
    let suggestions = ["Use the 'surf the urge' technique - cravings peak and subside"];
    
    // Addiction-specific suggestions
    if (addictionTypes.includes('smoking')) {
      suggestions.push("Keep your hands busy with a stress ball");
      suggestions.push("Drink water slowly through a straw");
    } else if (addictionTypes.includes('alcohol')) {
      suggestions.push("Have a non-alcoholic substitute ready");
      suggestions.push("Remove yourself from triggering environments");
    } else if (addictionTypes.includes('social_media')) {
      suggestions.push("Put your phone in another room for 30 minutes");
      suggestions.push("Call a friend instead of scrolling");
    }
    
    // Age-appropriate
    if (age && age < 30) {
      suggestions.push("Text a trusted friend for support");
    } else {
      suggestions.push("Call someone from your support network");
    }
    
    return suggestions;
  }

  getPersonalizedSocialSuggestions(user, addictions) {
    const age = user?.age || (user?.birthDate ? this.calculateAge(user.birthDate) : null);
    const hasEmergencyContacts = user?.emergencyContacts?.length > 0;
    
    let suggestions = [];
    
    if (hasEmergencyContacts) {
      suggestions.push("Reach out to one of your emergency contacts");
    }
    
    // Age-appropriate social suggestions
    if (age && age < 25) {
      suggestions.push("Join an online support group or chat");
      suggestions.push("Watch a comfort movie or show");
    } else if (age && age >= 25 && age < 50) {
      suggestions.push("Call a family member or friend");
      suggestions.push("Join a local community activity");
    } else {
      suggestions.push("Visit with a neighbor or friend");
      suggestions.push("Attend a community group or service");
    }
    
    suggestions.push("Remember: this feeling is temporary");
    
    return suggestions;
  }

  getPersonalizedGeneralSuggestions(user, addictions) {
    const age = user?.age || (user?.birthDate ? this.calculateAge(user.birthDate) : null);
    const preferredLanguage = user?.preferredLanguage || 'en';
    
    let suggestions = ["Tell me more about how you're feeling"];
    
    // Language-appropriate
    if (preferredLanguage === 'nl') {
      suggestions.push("Laten we dit samen bespreken"); // Let's discuss this together
    } else if (preferredLanguage === 'de') {
      suggestions.push("Erzählen Sie mir mehr darüber"); // Tell me more about it
    } else {
      suggestions.push("How can I support you right now?");
    }
    
    // Age-appropriate general support
    if (age && age < 30) {
      suggestions.push("What's been on your mind lately?");
    } else {
      suggestions.push("What would be most helpful for you today?");
    }
    
    return suggestions;
  }

  /**
   * Analyze mood from journal entry text using AI
   */
  async analyzeMoodFromText(text, userId = null) {
    try {
      let userContextInfo = '';
      
      // If userId provided, get user context for better analysis
      if (userId) {
        try {
          const user = await User.findById(userId);
          const addictions = await Addiction.find({ userId, status: { $in: ['active', 'recovering'] } });
          userContextInfo = `
        User context:
        ${this.buildPersonalizedContext(user, addictions)}
        
        Consider this context when analyzing mood patterns and cultural expressions of emotion.
        `;
        } catch (error) {
          console.log('Could not fetch user context for mood analysis:', error.message);
        }
      }
      
      const prompt = `
        You are an expert mood analyzer. Analyze the following journal entry text and determine the user's emotional state and mood.
        ${userContextInfo}
        Text: "${text}"
        
        Provide your analysis in this exact JSON format:
        {
          "primaryMood": "happy|peaceful|grateful|reflective|energetic|stressed|anxious|sad|angry|frustrated|confused|lonely",
          "moodScore": number_between_1_and_10,
          "confidence": number_between_0_and_1,
          "emotionalIndicators": ["indicator1", "indicator2", "indicator3"],
          "overallSentiment": "positive|neutral|negative|mixed",
          "moodDescription": "brief description of the detected mood(s)",
          "detectedMoods": [
            {
              "mood": "mood_name",
              "score": number_between_1_and_10,
              "strength": number_between_0_and_5,
              "keywords": ["keyword1", "keyword2"]
            }
          ],
          "moodCount": number_of_detected_moods
        }
        
        Consider:
        - Word choice and emotional language
        - Context and content themes
        - Emotional indicators and sentiment
        - Energy levels expressed
        - Gratitude or complaint patterns
        
        Be accurate and empathetic in your analysis.
      `;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text_response = response.text();
      
      try {
        // Clean the response text - remove markdown code blocks if present
        let cleanedText = text_response.trim();
        
        // Remove ```json and ``` markers
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        
        // Clean any remaining formatting issues
        cleanedText = cleanedText.trim();
        
        console.log('Cleaned Gemini response for mood analysis:', cleanedText);
        
        const moodAnalysis = JSON.parse(cleanedText);
        
        // Validate the response has required fields
        if (!moodAnalysis.primaryMood || !moodAnalysis.moodScore) {
          throw new Error('Invalid mood analysis response');
        }
        
        // Mood mapping to fix Gemini's mood names to our valid enum values
        const moodMapping = {
          'sadness': 'sad',
          'fear': 'anxious',
          'worried': 'anxious',
          'excitement': 'energetic',
          'joy': 'happy',
          'contentment': 'peaceful',
          'serenity': 'calm',
          'anger': 'angry',
          'rage': 'angry',
          'frustration': 'frustrated',
          'confusion': 'confused',
          'loneliness': 'lonely',
          'gratefulness': 'grateful',
          'thankfulness': 'grateful',
          'reflection': 'reflective',
          'contemplation': 'reflective',
          'stress': 'stressed',
          'tension': 'stressed',
          'peace': 'peaceful',
          'tranquility': 'peaceful',
          'energy': 'energetic',
          'vitality': 'energetic'
        };

        // Function to normalize mood names
        const normalizeMood = (mood) => {
          if (!mood) return 'reflective';
          const lowerMood = mood.toLowerCase();
          return moodMapping[lowerMood] || lowerMood;
        };

        // Fix primaryMood if it's invalid
        const validMoods = ['happy', 'calm', 'stressed', 'anxious', 'energetic', 'peaceful', 'grateful', 'reflective', 'sad', 'angry', 'frustrated', 'confused', 'lonely'];
        moodAnalysis.primaryMood = normalizeMood(moodAnalysis.primaryMood);
        
        if (!validMoods.includes(moodAnalysis.primaryMood)) {
          // If primary mood is still invalid (like 'mixed'), use the first detected mood or default to 'reflective'
          if (moodAnalysis.detectedMoods && moodAnalysis.detectedMoods.length > 0) {
            moodAnalysis.primaryMood = normalizeMood(moodAnalysis.detectedMoods[0].mood);
          } else {
            moodAnalysis.primaryMood = 'reflective';
          }
          console.log('Fixed invalid primaryMood to:', moodAnalysis.primaryMood);
        }

        // Fix all detected moods as well
        if (moodAnalysis.detectedMoods && Array.isArray(moodAnalysis.detectedMoods)) {
          moodAnalysis.detectedMoods = moodAnalysis.detectedMoods.map(detectedMood => ({
            ...detectedMood,
            mood: normalizeMood(detectedMood.mood)
          })).filter(detectedMood => validMoods.includes(detectedMood.mood)); // Remove invalid moods
        }
        
        // Ensure mood score is between 1-10
        moodAnalysis.moodScore = Math.max(1, Math.min(10, moodAnalysis.moodScore));
        
        console.log('Successfully parsed mood analysis:', moodAnalysis);
        return moodAnalysis;
        
      } catch (parseError) {
        console.error('Error parsing mood analysis:', parseError);
        console.error('Raw Gemini response was:', text_response);
        return this.getDefaultMoodAnalysis(text);
      }
      
    } catch (error) {
      console.error('Error analyzing mood from text:', error);
      return this.getDefaultMoodAnalysis(text);
    }
  }

  /**
   * Fallback mood analysis based on simple keyword detection - supports multiple moods
   */
  getDefaultMoodAnalysis(text) {
    const textLower = text.toLowerCase();
    
    // Define mood keywords (English + Dutch + German + French + Spanish + Italian + Portuguese)
    const moodKeywords = {
      happy: [
        // English
        'happy', 'joy', 'excited', 'great', 'amazing', 'wonderful', 'fantastic', 'good', 'positive',
        // Dutch
        'blij', 'vrolijk', 'gelukkig', 'opgewekt', 'enthousiast', 'geweldig', 'fantastisch', 'goed', 'positief',
        // German
        'glücklich', 'fröhlich', 'aufgeregt', 'großartig', 'wunderbar', 'fantastisch', 'gut', 'positiv',
        // French
        'heureux', 'joie', 'excité', 'formidable', 'merveilleux', 'fantastique', 'bon', 'positif',
        // Spanish
        'feliz', 'alegre', 'emocionado', 'genial', 'maravilloso', 'fantástico', 'bueno', 'positivo',
        // Italian
        'felice', 'gioia', 'eccitato', 'grande', 'meraviglioso', 'fantastico', 'buono', 'positivo',
        // Portuguese
        'feliz', 'alegre', 'animado', 'ótimo', 'maravilhoso', 'fantástico', 'bom', 'positivo'
      ],
      sad: [
        // English
        'sad', 'down', 'depressed', 'hurt', 'disappointed', 'low', 'terrible', 'awful', 'bad',
        // Dutch
        'verdrietig', 'down', 'depressief', 'gekwetst', 'teleurgesteld', 'laag', 'verschrikkelijk', 'slecht', 'neerslachtig',
        // German
        'traurig', 'deprimiert', 'verletzt', 'enttäuscht', 'niedergeschlagen', 'schrecklich', 'schlecht',
        // French
        'triste', 'déprimé', 'blessé', 'déçu', 'bas', 'terrible', 'mauvais',
        // Spanish
        'triste', 'deprimido', 'herido', 'decepcionado', 'bajo', 'terrible', 'malo',
        // Italian
        'triste', 'depresso', 'ferito', 'deluso', 'basso', 'terribile', 'cattivo',
        // Portuguese
        'triste', 'deprimido', 'machucado', 'decepcionado', 'baixo', 'terrível', 'ruim'
      ],
      anxious: [
        // English
        'anxious', 'worried', 'nervous', 'scared', 'afraid', 'panic', 'stress', 'overwhelmed',
        // Dutch
        'angstig', 'bezorgd', 'nerveus', 'bang', 'paniek', 'stress', 'overweldigd', 'gespannen',
        // German
        'ängstlich', 'besorgt', 'nervös', 'verängstigt', 'panik', 'stress', 'überwältigt',
        // French
        'anxieux', 'inquiet', 'nerveux', 'effrayé', 'panique', 'stress', 'débordé',
        // Spanish
        'ansioso', 'preocupado', 'nervioso', 'asustado', 'pánico', 'estrés', 'abrumado',
        // Italian
        'ansioso', 'preoccupato', 'nervoso', 'spaventato', 'panico', 'stress', 'sopraffatto',
        // Portuguese
        'ansioso', 'preocupado', 'nervoso', 'assustado', 'pânico', 'stress', 'sobrecarregado'
      ],
      angry: [
        // English
        'angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated', 'rage',
        // Dutch
        'boos', 'kwaad', 'woedend', 'geïrriteerd', 'gefrustreerd', 'geërgerd', 'woede',
        // German
        'wütend', 'sauer', 'verärgert', 'frustriert', 'gereizt', 'zorn',
        // French
        'en colère', 'fâché', 'furieux', 'agacé', 'frustré', 'irrité', 'rage',
        // Spanish
        'enojado', 'enfadado', 'furioso', 'molesto', 'frustrado', 'irritado', 'rabia',
        // Italian
        'arrabbiato', 'furioso', 'infastidito', 'frustrato', 'irritato', 'rabbia',
        // Portuguese
        'bravo', 'irritado', 'furioso', 'aborrecido', 'frustrado', 'raiva'
      ],
      peaceful: [
        // English
        'peaceful', 'calm', 'relaxed', 'serene', 'quiet', 'tranquil', 'content',
        // Dutch
        'vredig', 'rustig', 'ontspannen', 'sereen', 'kalm', 'tevreden', 'vreedzaam',
        // German
        'friedlich', 'ruhig', 'entspannt', 'gelassen', 'still', 'zufrieden',
        // French
        'paisible', 'calme', 'détendu', 'serein', 'tranquille', 'content',
        // Spanish
        'pacífico', 'tranquilo', 'relajado', 'sereno', 'silencioso', 'contento',
        // Italian
        'pacifico', 'calmo', 'rilassato', 'sereno', 'tranquillo', 'contento',
        // Portuguese
        'pacífico', 'calmo', 'relaxado', 'sereno', 'tranquilo', 'contente'
      ],
      grateful: [
        // English
        'grateful', 'thankful', 'blessed', 'appreciate', 'lucky', 'fortunate',
        // Dutch
        'dankbaar', 'gezegend', 'waarderen', 'gelukkig', 'bevoorrecht',
        // German
        'dankbar', 'gesegnet', 'schätzen', 'glücklich', 'bevorzugt',
        // French
        'reconnaissant', 'béni', 'apprécier', 'chanceux', 'privilégié',
        // Spanish
        'agradecido', 'bendecido', 'apreciar', 'afortunado', 'privilegiado',
        // Italian
        'grato', 'benedetto', 'apprezzare', 'fortunato', 'privilegiato',
        // Portuguese
        'grato', 'abençoado', 'apreciar', 'sortudo', 'privilegiado'
      ],
      confused: [
        // English
        'confused', 'lost', 'uncertain', 'unclear', 'mixed', 'conflicted',
        // Dutch
        'verward', 'verloren', 'onzeker', 'onduidelijk', 'gemengd', 'conflicterend',
        // German
        'verwirrt', 'verloren', 'unsicher', 'unklar', 'gemischt', 'konfliktreich',
        // French
        'confus', 'perdu', 'incertain', 'flou', 'mélangé', 'conflictuel',
        // Spanish
        'confundido', 'perdido', 'incierto', 'poco claro', 'mezclado', 'conflictivo',
        // Italian
        'confuso', 'perso', 'incerto', 'poco chiaro', 'misto', 'conflittuale',
        // Portuguese
        'confuso', 'perdido', 'incerto', 'pouco claro', 'misturado', 'conflituoso'
      ],
      lonely: [
        // English
        'lonely', 'alone', 'isolated', 'empty', 'disconnected',
        // Dutch
        'eenzaam', 'alleen', 'geïsoleerd', 'leeg', 'afgesloten',
        // German
        'einsam', 'allein', 'isoliert', 'leer', 'getrennt',
        // French
        'seul', 'isolé', 'vide', 'déconnecté',
        // Spanish
        'solo', 'aislado', 'vacío', 'desconectado',
        // Italian
        'solo', 'isolato', 'vuoto', 'disconnesso',
        // Portuguese
        'sozinho', 'isolado', 'vazio', 'desconectado'
      ],
      energetic: [
        // English
        'energetic', 'motivated', 'inspired', 'driven', 'active', 'productive',
        // Dutch
        'energiek', 'gemotiveerd', 'geïnspireerd', 'gedreven', 'actief', 'productief',
        // German
        'energisch', 'motiviert', 'inspiriert', 'getrieben', 'aktiv', 'produktiv',
        // French
        'énergique', 'motivé', 'inspiré', 'déterminé', 'actif', 'productif',
        // Spanish
        'enérgico', 'motivado', 'inspirado', 'decidido', 'activo', 'productivo',
        // Italian
        'energico', 'motivato', 'ispirato', 'determinato', 'attivo', 'produttivo',
        // Portuguese
        'enérgico', 'motivado', 'inspirado', 'determinado', 'ativo', 'produtivo'
      ]
    };
    
    let detectedMoods = [];
    let allEmotionalIndicators = [];
    let overallSentiment = 'neutral';
    
    // Check for ALL mood keywords and score them
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      const matchedKeywords = keywords.filter(keyword => textLower.includes(keyword));
      if (matchedKeywords.length > 0) {
        // Calculate mood strength based on keyword matches and intensity
        let moodStrength = matchedKeywords.length;
        
        // Boost strength if multiple instances of same keyword
        const keywordCounts = {};
        matchedKeywords.forEach(keyword => {
          const matches = (textLower.match(new RegExp(keyword, 'g')) || []).length;
          keywordCounts[keyword] = matches;
          if (matches > 1) moodStrength += (matches - 1) * 0.5;
        });
        
        // Calculate mood score based on detected mood type
        let moodScore;
        switch (mood) {
          case 'happy':
          case 'grateful':
          case 'peaceful':
          case 'energetic':
            moodScore = Math.min(10, 6 + moodStrength);
            break;
          case 'sad':
          case 'anxious':
          case 'angry':
          case 'lonely':
            moodScore = Math.max(1, 5 - moodStrength);
            break;
          case 'confused':
          case 'reflective':
            moodScore = 5;
            break;
          default:
            moodScore = 5;
        }
        
        detectedMoods.push({
          mood: mood,
          score: moodScore,
          strength: moodStrength,
          keywords: [...new Set(matchedKeywords)], // Remove duplicates
          keywordCounts: keywordCounts
        });
        
        allEmotionalIndicators.push(...matchedKeywords);
      }
    }
    
    // Sort moods by strength (most prominent first)
    detectedMoods.sort((a, b) => b.strength - a.strength);
    
    // Determine overall sentiment based on detected moods
    if (detectedMoods.length > 0) {
      const positiveCount = detectedMoods.filter(m => 
        ['happy', 'grateful', 'peaceful', 'energetic'].includes(m.mood)
      ).length;
      const negativeCount = detectedMoods.filter(m => 
        ['sad', 'anxious', 'angry', 'lonely'].includes(m.mood)
      ).length;
      
      if (positiveCount > negativeCount) {
        overallSentiment = 'positive';
      } else if (negativeCount > positiveCount) {
        overallSentiment = 'negative';
      } else {
        overallSentiment = 'mixed';
      }
    }
    
    // If no moods detected, default to reflective
    if (detectedMoods.length === 0) {
      detectedMoods.push({
        mood: 'reflective',
        score: 5,
        strength: 0.3,
        keywords: [],
        keywordCounts: {}
      });
    }
    
    const primaryMood = detectedMoods[0];
    
    // Make sure primaryMood is never 'mixed' - that's only for overallSentiment
    const validPrimaryMood = primaryMood.mood !== 'mixed' ? primaryMood.mood : 'reflective';
    
    return {
      primaryMood: validPrimaryMood,
      moodScore: primaryMood.score,
      confidence: detectedMoods.length > 0 ? Math.min(0.95, 0.5 + (detectedMoods.length * 0.1)) : 0.3,
      emotionalIndicators: [...new Set(allEmotionalIndicators)],
      overallSentiment,
      moodDescription: detectedMoods.length > 1 
        ? `Detected multiple moods: ${detectedMoods.map(m => `${m.mood} (${m.strength.toFixed(1)})`).join(', ')}`
        : `Detected ${validPrimaryMood} mood based on keyword analysis`,
      // New field for multiple moods
      detectedMoods: detectedMoods.map(m => ({
        mood: m.mood,
        score: m.score,
        strength: m.strength,
        keywords: m.keywords
      })),
      moodCount: detectedMoods.length
    };
  }

  async assessRiskLevel(message, addictions) {
    const messageLower = message.toLowerCase();
    const highRiskWords = ['relapse', 'give up', 'can\'t', 'hopeless', 'want to use'];
    const mediumRiskWords = ['craving', 'difficult', 'struggling', 'tempted'];
    
    if (highRiskWords.some(word => messageLower.includes(word))) {
      return 'high';
    }
    
    if (mediumRiskWords.some(word => messageLower.includes(word))) {
      return 'medium';
    }
    
    return 'low';
  }

  async generateProgressInsights(userId, data) {
    try {
      console.log(`Generating progress insights for user ${userId}`);
      
      const { journalEntries, coachSessions, addictions, timeframe } = data;
      
      // Analyze journal mood trends
      const moodAnalysis = this.analyzeMoodTrends(journalEntries);
      
      // Analyze trigger patterns
      const triggerAnalysis = this.analyzeTriggerPatterns(coachSessions);
      
      // Calculate recovery progress
      const recoveryProgress = this.calculateRecoveryProgress(addictions, journalEntries);
      
      // Analyze engagement metrics
      const engagementMetrics = this.calculateEngagementMetrics(journalEntries, coachSessions, timeframe);
      
      // Generate AI insights using Gemini
      const aiInsights = await this.generateAIInsights({
        moodAnalysis,
        triggerAnalysis,
        recoveryProgress,
        engagementMetrics,
        timeframe
      }, userId);
      
      return {
        overview: {
          timeframe: `${timeframe} days`,
          totalJournalEntries: journalEntries.length,
          totalCoachSessions: coachSessions.length,
          activeAddictions: addictions.filter(a => a.status === 'recovering' || a.status === 'clean').length
        },
        moodAnalysis,
        triggerAnalysis,
        recoveryProgress,
        engagementMetrics,
        aiInsights,
        recommendations: this.generateRecommendations(moodAnalysis, triggerAnalysis, engagementMetrics),
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error generating insights:', error);
      return this.getDefaultInsights();
    }
  }

  analyzeMoodTrends(journalEntries) {
    if (!journalEntries || journalEntries.length === 0) {
      return {
        trend: 'stable',
        averageScore: 5,
        moodDistribution: {},
        improvement: 0
      };
    }
    
    const moodScores = {
      'happy': 8, 'peaceful': 7, 'grateful': 7, 'energetic': 6,
      'reflective': 5, 'calm': 6, 'stressed': 3, 'anxious': 2
    };
    
    const moodCounts = {};
    let totalScore = 0;
    let validEntries = 0;
    
    journalEntries.forEach(entry => {
      if (entry.mood && moodScores[entry.mood]) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        totalScore += moodScores[entry.mood];
        validEntries++;
      }
    });
    
    const averageScore = validEntries > 0 ? totalScore / validEntries : 5;
    
    // Calculate trend (comparing first half vs second half)
    const midpoint = Math.floor(journalEntries.length / 2);
    const firstHalf = journalEntries.slice(0, midpoint);
    const secondHalf = journalEntries.slice(midpoint);
    
    const firstHalfAvg = this.calculateAverageMood(firstHalf, moodScores);
    const secondHalfAvg = this.calculateAverageMood(secondHalf, moodScores);
    
    let trend = 'stable';
    const improvement = secondHalfAvg - firstHalfAvg;
    
    if (improvement > 0.5) trend = 'improving';
    else if (improvement < -0.5) trend = 'declining';
    
    return {
      trend,
      averageScore: Math.round(averageScore * 10) / 10,
      moodDistribution: moodCounts,
      improvement: Math.round(improvement * 10) / 10,
      mostCommonMood: Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b, 'reflective')
    };
  }

  calculateAverageMood(entries, moodScores) {
    if (!entries || entries.length === 0) return 5;
    
    let total = 0;
    let count = 0;
    
    entries.forEach(entry => {
      if (entry.mood && moodScores[entry.mood]) {
        total += moodScores[entry.mood];
        count++;
      }
    });
    
    return count > 0 ? total / count : 5;
  }

  analyzeTriggerPatterns(coachSessions) {
    const triggers = [];
    const triggerCounts = {};
    let totalTriggers = 0;
    
    coachSessions.forEach(session => {
      if (session.analysisResults && session.analysisResults.triggersDetected) {
        session.analysisResults.triggersDetected.forEach(trigger => {
          triggers.push(trigger);
          const triggerType = trigger.type || trigger.trigger || 'unknown';
          triggerCounts[triggerType] = (triggerCounts[triggerType] || 0) + 1;
          totalTriggers++;
        });
      }
    });
    
    const highRiskTriggers = triggers.filter(t => t.riskLevel === 'high').length;
    const mediumRiskTriggers = triggers.filter(t => t.riskLevel === 'medium').length;
    
    return {
      totalTriggers,
      triggerTypes: triggerCounts,
      highRiskCount: highRiskTriggers,
      mediumRiskCount: mediumRiskTriggers,
      lowRiskCount: totalTriggers - highRiskTriggers - mediumRiskTriggers,
      mostCommonTrigger: totalTriggers > 0 ? Object.keys(triggerCounts).reduce((a, b) => triggerCounts[a] > triggerCounts[b] ? a : b) : 'none'
    };
  }

  calculateRecoveryProgress(addictions, journalEntries) {
    if (!addictions || addictions.length === 0) {
      return {
        activeAddictions: 0,
        cleanDays: {},
        longestStreak: 0,
        recentRelapses: 0
      };
    }
    
    const now = new Date();
    const cleanDays = {};
    let longestStreak = 0;
    let recentRelapses = 0;
    
    addictions.forEach(addiction => {
      if (addiction.quitDate) {
        const quitDate = new Date(addiction.quitDate);
        const daysSinceQuit = Math.floor((now - quitDate) / (24 * 60 * 60 * 1000));
        
        if (addiction.status === 'clean' || addiction.status === 'recovering') {
          cleanDays[addiction.type] = daysSinceQuit;
          longestStreak = Math.max(longestStreak, daysSinceQuit);
        }
        
        if (addiction.status === 'relapsed' && daysSinceQuit <= 30) {
          recentRelapses++;
        }
      }
    });
    
    return {
      activeAddictions: addictions.filter(a => a.status === 'recovering' || a.status === 'clean').length,
      cleanDays,
      longestStreak,
      recentRelapses,
      totalAddictions: addictions.length
    };
  }

  calculateEngagementMetrics(journalEntries, coachSessions, timeframe) {
    const journalDays = new Set();
    const coachDays = new Set();
    
    journalEntries.forEach(entry => {
      const date = new Date(entry.createdAt).toDateString();
      journalDays.add(date);
    });
    
    coachSessions.forEach(session => {
      const date = new Date(session.createdAt).toDateString();
      coachDays.add(date);
    });
    
    const journalStreak = this.calculateCurrentStreak(journalEntries);
    const totalInteractions = journalEntries.length + coachSessions.length;
    
    return {
      journalFrequency: Math.round((journalDays.size / timeframe) * 100),
      coachFrequency: Math.round((coachDays.size / timeframe) * 100),
      currentJournalStreak: journalStreak,
      totalInteractions,
      avgEntriesPerDay: Math.round((journalEntries.length / timeframe) * 10) / 10,
      engagementScore: Math.min(100, Math.round(((journalDays.size + coachDays.size) / timeframe) * 100))
    };
  }

  calculateCurrentStreak(entries) {
    if (!entries || entries.length === 0) return 0;
    
    const sortedEntries = entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].createdAt);
      const daysDiff = Math.floor((currentDate - entryDate) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === 0 || daysDiff === 1) {
        streak++;
        currentDate = new Date(entryDate);
      } else {
        break;
      }
    }
    
    return streak;
  }

  async generateAIInsights(data, userId = null) {
    try {
      let userContextInfo = '';
      
      // Get user context for personalized insights
      if (userId) {
        try {
          const user = await User.findById(userId);
          const addictions = await Addiction.find({ userId, status: { $in: ['active', 'recovering'] } });
          userContextInfo = `
User context:
${this.buildPersonalizedContext(user, addictions)}

Tailor insights to their personal background and cultural context.
`;
        } catch (error) {
          console.log('Could not fetch user context for insights:', error.message);
        }
      }
      
      const prompt = `As an AI recovery coach named Alex, analyze this user's progress data and provide supportive insights:

${userContextInfo}
Mood Analysis: ${JSON.stringify(data.moodAnalysis)}
Trigger Patterns: ${JSON.stringify(data.triggerAnalysis)}
Recovery Progress: ${JSON.stringify(data.recoveryProgress)}
Engagement: ${JSON.stringify(data.engagementMetrics)}
Timeframe: ${data.timeframe} days

Provide insights in this JSON format:
{
  "overallProgress": "improving|stable|concerning",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "motivationalMessage": "personalized encouraging message",
  "nextSteps": ["action1", "action2", "action3"]
}

Be supportive, specific, and actionable. Focus on progress made and positive steps forward.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      try {
        // Clean markdown code blocks if present
        text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        
        return JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing AI insights:', parseError);
        return this.getDefaultAIInsights();
      }
      
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return this.getDefaultAIInsights();
    }
  }

  getDefaultAIInsights() {
    return {
      overallProgress: "stable",
      keyInsights: [
        "You're actively engaging with your recovery journey",
        "Regular journaling shows commitment to self-reflection",
        "Each day of engagement is a step forward"
      ],
      strengths: [
        "Consistent app usage",
        "Willingness to track progress"
      ],
      areasForImprovement: [
        "Continue building daily habits",
        "Focus on identifying trigger patterns"
      ],
      motivationalMessage: "Recovery is a journey, not a destination. You're taking important steps by being here and tracking your progress.",
      nextSteps: [
        "Continue daily journaling",
        "Identify your main triggers",
        "Celebrate small victories"
      ]
    };
  }

  generateRecommendations(moodAnalysis, triggerAnalysis, engagementMetrics) {
    const recommendations = [];
    
    // Mood-based recommendations
    if (moodAnalysis.trend === 'declining') {
      recommendations.push({
        type: 'mood',
        priority: 'high',
        title: 'Focus on Mood Support',
        description: 'Your mood has been trending downward. Consider talking to your support network or coach.',
        action: 'Chat with Alex about coping strategies'
      });
    } else if (moodAnalysis.trend === 'improving') {
      recommendations.push({
        type: 'mood',
        priority: 'low',
        title: 'Keep Up the Great Work',
        description: 'Your mood is improving! Continue with your current strategies.',
        action: 'Share your success with Alex'
      });
    }
    
    // Trigger-based recommendations
    if (triggerAnalysis.highRiskCount > 0) {
      recommendations.push({
        type: 'triggers',
        priority: 'high',
        title: 'Manage High-Risk Triggers',
        description: `You've experienced ${triggerAnalysis.highRiskCount} high-risk triggers recently.`,
        action: 'Work with Alex on trigger management strategies'
      });
    }
    
    // Engagement-based recommendations
    if (engagementMetrics.journalFrequency < 50) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Increase Journaling Frequency',
        description: 'Regular journaling helps track patterns and progress.',
        action: 'Set a daily journaling reminder'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        priority: 'low',
        title: 'Continue Your Progress',
        description: 'You\'re doing well! Keep up your current routine.',
        action: 'Check in with Alex for additional support'
      });
    }
    
    return recommendations;
  }

  async handleEmergencyCrisis(userId, crisisData) {
    try {
      console.log(`Handling emergency crisis for user ${userId}:`, crisisData);
      
      const { crisisType, severity, userMessage, location } = crisisData;
      
      // Get immediate emergency resources
      const emergencyResources = this.getEmergencyResources(crisisType, location);
      
      // Get user's personal emergency contacts
      const User = require('../models/User');
      const user = await User.findById(userId);
      const personalContacts = user ? user.getActiveEmergencyContacts() : [];
      
      // Add personal contacts to resources
      const personalContactResources = personalContacts.map(contact => ({
        name: `${contact.name} (${contact.relationship})`,
        contact: contact.phone,
        type: 'personal',
        available: 'Personal Contact',
        description: `Your emergency contact: ${contact.relationship}`,
        urgent: contact.isPrimary,
        isPrimary: contact.isPrimary,
        isPersonal: true
      }));
      
      // Combine emergency resources with personal contacts (personal contacts first)
      const allResources = [...personalContactResources, ...emergencyResources];
      
      // Generate AI emergency response
      const aiResponse = await this.generateEmergencyResponse(crisisType, severity, userMessage, userId);
      
      // Determine if emergency contacts should be notified
      const shouldNotifyContacts = severity === 'critical' || severity === 'high';
      
      return {
        message: aiResponse.message,
        immediateActions: aiResponse.immediateActions,
        resources: allResources,
        emergencyContacts: shouldNotifyContacts ? allResources.filter(r => r.urgent || r.type === 'emergency') : [],
        personalContacts: personalContactResources,
        triggerNotifications: shouldNotifyContacts,
        severity,
        riskAssessment: aiResponse.riskAssessment,
        followUpRequired: true,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error handling emergency crisis:', error);
      return this.getEmergencyFallback(crisisData.crisisType);
    }
  }

  async generateEmergencyResponse(crisisType, severity, userMessage, userId = null) {
    try {
      let userContextInfo = '';
      
      // Get user context for personalized emergency response
      if (userId) {
        try {
          const user = await User.findById(userId);
          const addictions = await Addiction.find({ userId, status: { $in: ['active', 'recovering'] } });
          userContextInfo = `
User context:
${this.buildPersonalizedContext(user, addictions)}

Consider their background when providing culturally appropriate crisis support.
`;
        } catch (error) {
          console.log('Could not fetch user context for emergency response:', error.message);
        }
      }
      
      const prompt = `You are Alex, an AI crisis intervention coach. A user is experiencing a ${crisisType} crisis with ${severity} severity. 

${userContextInfo}
User message: "${userMessage || 'User indicated emergency situation'}"

Provide immediate, compassionate, and professional crisis support in this JSON format:
{
  "message": "immediate empathetic response (2-3 sentences max)",
  "immediateActions": ["action1", "action2", "action3"],
  "riskAssessment": "low|medium|high|critical",
  "safetyPlan": ["step1", "step2", "step3"]
}

Be direct, caring, and focus on immediate safety. Do not provide medical advice. Encourage professional help if needed.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      try {
        // Clean markdown code blocks if present
        text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        
        return JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing emergency AI response:', parseError);
        return this.getEmergencyFallbackResponse(crisisType);
      }
      
    } catch (error) {
      console.error('Error generating emergency AI response:', error);
      return this.getEmergencyFallbackResponse(crisisType);
    }
  }

  getEmergencyResources(crisisType, location = 'US') {
    // Base emergency resources (US)
    const baseResources = [
      {
        name: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        type: 'emergency',
        available: '24/7',
        description: 'Free, confidential crisis support via text',
        urgent: true,
        languages: ['English', 'Spanish']
      },
      {
        name: 'National Suicide Prevention Lifeline',
        contact: '988',
        type: 'emergency',
        available: '24/7',
        description: 'Free and confidential emotional support',
        urgent: true,
        languages: ['English', 'Spanish']
      },
      {
        name: 'SAMHSA National Helpline',
        contact: '1-800-662-HELP (4357)',
        type: 'support',
        available: '24/7',
        description: 'Treatment referral and information service',
        urgent: false,
        languages: ['English', 'Spanish']
      }
    ];

    // Add emergency services for critical situations
    if (['suicide', 'self_harm'].includes(crisisType)) {
      baseResources.unshift({
        name: 'Emergency Services',
        contact: '911',
        type: 'emergency',
        available: '24/7',
        description: 'Immediate emergency response',
        urgent: true,
        languages: ['Multiple']
      });
    }

    // Add crisis-specific resources
    const crisisSpecificResources = this.getCrisisSpecificResources(crisisType);
    const locationSpecificResources = this.getLocationSpecificResources(location);
    
    return [...baseResources, ...crisisSpecificResources, ...locationSpecificResources];
  }

  getCrisisSpecificResources(crisisType) {
    const resources = [];

    switch (crisisType) {
      case 'suicide':
        resources.push(
          {
            name: 'National Suicide Prevention Chat',
            contact: 'Visit suicidepreventionlifeline.org',
            type: 'support',
            available: '24/7',
            description: 'Online chat support for suicide prevention',
            urgent: false,
            languages: ['English']
          },
          {
            name: 'Veterans Crisis Line',
            contact: '1-800-273-8255',
            type: 'emergency',
            available: '24/7',
            description: 'Crisis support specifically for veterans',
            urgent: true,
            languages: ['English']
          }
        );
        break;

      case 'self_harm':
        resources.push(
          {
            name: 'Self-Injury Outreach & Support',
            contact: 'Visit sioutreach.org',
            type: 'support',
            available: 'Varies',
            description: 'Support and resources for self-harm recovery',
            urgent: false,
            languages: ['English']
          }
        );
        break;

      case 'substance_abuse':
      case 'relapse':
        resources.push(
          {
            name: 'Substance Abuse Treatment Locator',
            contact: '1-800-662-4357',
            type: 'support',
            available: '24/7',
            description: 'Find local treatment facilities',
            urgent: false,
            languages: ['English', 'Spanish']
          },
          {
            name: 'Narcotics Anonymous',
            contact: 'Visit na.org',
            type: 'support',
            available: 'Varies',
            description: 'Peer support for drug addiction recovery',
            urgent: false,
            languages: ['Multiple']
          },
          {
            name: 'Alcoholics Anonymous',
            contact: 'Visit aa.org',
            type: 'support',
            available: 'Varies',
            description: 'Peer support for alcohol addiction recovery',
            urgent: false,
            languages: ['Multiple']
          }
        );
        break;

      case 'domestic_violence':
        resources.push(
          {
            name: 'National Domestic Violence Hotline',
            contact: '1-800-799-7233',
            type: 'emergency',
            available: '24/7',
            description: 'Confidential support for domestic violence',
            urgent: true,
            languages: ['English', 'Spanish', '200+ languages via interpretation']
          },
          {
            name: 'National Domestic Violence Chat',
            contact: 'Visit thehotline.org',
            type: 'support',
            available: '24/7',
            description: 'Online chat support for domestic violence',
            urgent: false,
            languages: ['English']
          }
        );
        break;

      case 'panic_attack':
        resources.push(
          {
            name: 'Anxiety and Depression Association',
            contact: 'Visit adaa.org',
            type: 'support',
            available: 'Business hours',
            description: 'Resources for anxiety and panic disorders',
            urgent: false,
            languages: ['English']
          }
        );
        break;
    }

    return resources;
  }

  getLocationSpecificResources(location) {
    const resources = [];

    // International resources
    if (location && location !== 'US') {
      resources.push(
        {
          name: 'International Association for Suicide Prevention',
          contact: 'Visit iasp.info/resources/Crisis_Centres',
          type: 'support',
          available: 'Varies by location',
          description: 'Find crisis centers worldwide',
          urgent: false,
          languages: ['Multiple']
        },
        {
          name: 'Befrienders Worldwide',
          contact: 'Visit befrienders.org',
          type: 'support',
          available: 'Varies by location',
          description: 'International emotional support network',
          urgent: false,
          languages: ['Multiple']
        }
      );

      // Country-specific resources
      switch (location?.toUpperCase()) {
        case 'CA':
        case 'CANADA':
          resources.push(
            {
              name: 'Crisis Services Canada',
              contact: '1-833-456-4566',
              type: 'emergency',
              available: '24/7',
              description: 'National suicide prevention service',
              urgent: true,
              languages: ['English', 'French']
            },
            {
              name: 'Kids Help Phone',
              contact: '1-800-668-6868',
              type: 'emergency',
              available: '24/7',
              description: 'Support for children and teens',
              urgent: true,
              languages: ['English', 'French']
            }
          );
          break;

        case 'UK':
        case 'UNITED KINGDOM':
          resources.push(
            {
              name: 'Samaritans',
              contact: '116 123',
              type: 'emergency',
              available: '24/7',
              description: 'Emotional support for anyone in distress',
              urgent: true,
              languages: ['English']
            },
            {
              name: 'Crisis Text Line UK',
              contact: 'Text SHOUT to 85258',
              type: 'emergency',
              available: '24/7',
              description: 'Free crisis support via text',
              urgent: true,
              languages: ['English']
            }
          );
          break;

        case 'AU':
        case 'AUSTRALIA':
          resources.push(
            {
              name: 'Lifeline Australia',
              contact: '13 11 14',
              type: 'emergency',
              available: '24/7',
              description: 'Crisis support and suicide prevention',
              urgent: true,
              languages: ['English']
            },
            {
              name: 'Beyond Blue',
              contact: '1300 22 4636',
              type: 'support',
              available: '24/7',
              description: 'Depression, anxiety and suicide prevention',
              urgent: false,
              languages: ['English']
            }
          );
          break;
      }
    }

    return resources;
  }

  getEmergencyFallback(crisisType) {
    return {
      message: "I'm here for you right now. Your safety is the most important thing. Please reach out to emergency services or a crisis hotline immediately.",
      immediateActions: [
        "If you're in immediate danger, call 911",
        "Contact a trusted friend or family member",
        "Call the Crisis Text Line: Text HOME to 741741"
      ],
      resources: this.getEmergencyResources(crisisType),
      emergencyContacts: this.getEmergencyResources(crisisType).filter(r => r.urgent),
      triggerNotifications: true,
      severity: 'high',
      riskAssessment: 'high',
      followUpRequired: true
    };
  }

  getEmergencyFallbackResponse(crisisType) {
    const responses = {
      suicide: {
        message: "I'm deeply concerned about you. Your life has value and meaning. Please reach out for immediate professional help.",
        immediateActions: [
          "Call 988 - National Suicide Prevention Lifeline",
          "Go to your nearest emergency room",
          "Call a trusted friend or family member"
        ],
        riskAssessment: "critical",
        safetyPlan: [
          "Remove any means of self-harm",
          "Stay with someone you trust",
          "Call professional help immediately"
        ]
      },
      self_harm: {
        message: "I can see you're in pain right now. Self-harm isn't the answer, and you deserve support and care.",
        immediateActions: [
          "Use ice cubes or cold water instead",
          "Call the Crisis Text Line: Text HOME to 741741",
          "Reach out to a trusted person"
        ],
        riskAssessment: "high",
        safetyPlan: [
          "Remove sharp objects",
          "Use coping strategies you've learned",
          "Contact your support network"
        ]
      },
      relapse: {
        message: "A relapse doesn't mean you've failed. Recovery is a journey with ups and downs. Let's get you back on track.",
        immediateActions: [
          "Remove yourself from the triggering environment",
          "Call your sponsor or support person",
          "Contact SAMHSA Helpline: 1-800-662-4357"
        ],
        riskAssessment: "medium",
        safetyPlan: [
          "Go to a safe, supportive environment",
          "Use your relapse prevention plan",
          "Attend an emergency meeting or group"
        ]
      },
      default: {
        message: "I'm here to support you through this difficult time. You don't have to face this alone.",
        immediateActions: [
          "Take slow, deep breaths",
          "Reach out to someone you trust",
          "Consider professional support"
        ],
        riskAssessment: "medium",
        safetyPlan: [
          "Focus on your immediate safety",
          "Use healthy coping strategies",
          "Connect with your support network"
        ]
      }
    };

    return responses[crisisType] || responses.default;
  }

  async assessCrisisLevel(message, context = {}) {
    const messageLower = message.toLowerCase();
    
    // Critical crisis indicators
    const criticalWords = [
      'suicide', 'kill myself', 'end it all', 'don\'t want to live',
      'better off dead', 'suicide plan', 'going to die',
      'can\'t go on', 'hopeless', 'no way out'
    ];
    
    // High crisis indicators
    const highRiskWords = [
      'self harm', 'cut myself', 'hurt myself', 'cutting myself', 'feel like cutting',
      'relapse', 'using again', 'can\'t stop', 'overwhelming urge',
      'losing control', 'desperate', 'panic attack'
    ];
    
    // Medium crisis indicators  
    const mediumRiskWords = [
      'crisis', 'emergency', 'need help now', 'really struggling',
      'can\'t cope', 'breaking down', 'intense craving',
      'triggered badly', 'feel unsafe'
    ];

    let severity = 'low';
    let indicators = [];
    let recommendations = [];

    // Check for critical crisis
    for (const word of criticalWords) {
      if (messageLower.includes(word)) {
        severity = 'critical';
        indicators.push(word);
        recommendations.push('Immediate professional intervention required');
        break;
      }
    }

    // Check for high crisis if not critical
    if (severity !== 'critical') {
      for (const word of highRiskWords) {
        if (messageLower.includes(word)) {
          severity = 'high';
          indicators.push(word);
          recommendations.push('Crisis support recommended');
        }
      }
    }

    // Check for medium crisis if not high/critical
    if (severity !== 'critical' && severity !== 'high') {
      for (const word of mediumRiskWords) {
        if (messageLower.includes(word)) {
          severity = 'medium';
          indicators.push(word);
          recommendations.push('Enhanced support needed');
        }
      }
    }

    return {
      severity,
      indicators,
      recommendations,
      requiresEmergency: severity === 'critical',
      requiresIntervention: severity === 'high' || severity === 'critical',
      assessedAt: new Date()
    };
  }

  async getCrisisResources(options = {}) {
    const { crisisType, location = 'US', language = 'en' } = options;
    
    try {
      // Return localized resources based on location and crisis type
      const resources = this.getEmergencyResources(crisisType, location);
      
      // Add additional resources based on language
      if (language !== 'en') {
        resources.push({
          name: 'International Crisis Support',
          contact: 'Visit findahelpline.com',
          type: 'support',
          available: 'Varies',
          description: 'Find crisis support in your language and location',
          urgent: false
        });
      }
      
      return resources;
      
    } catch (error) {
      console.error('Error getting crisis resources:', error);
      return this.getEmergencyResources(crisisType, location);
    }
  }
}

module.exports = new AICoachService();