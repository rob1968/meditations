const OpenAI = require('openai');
const AICoach = require('../models/AICoach');
const JournalEntry = require('../models/JournalEntry');
const Addiction = require('../models/Addiction');
const User = require('../models/User');

class AICoachService {
  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      console.warn('OpenAI API key not found, service will return mock responses');
      this.openai = null;
    }
    this.modelName = "gpt-4o"; // GPT-5 gives empty responses, using GPT-4o
    
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
        "Practice mindful observation of your surroundings",
        "Connect with someone in person or via call"
      ],
      gambling: [
        "Calculate the money saved by not gambling today",
        "Block gambling sites and apps",
        "Give financial control to a trusted person temporarily",
        "Join an online support group meeting",
        "Focus on what you can control right now"
      ],
      shopping: [
        "Wait 24 hours before any non-essential purchase",
        "Unsubscribe from promotional emails",
        "Calculate what else that money could go toward",
        "Practice gratitude for what you already have",
        "Find free activities that bring joy"
      ],
      food: [
        "Check in with your emotions first - what are you really feeling?",
        "Drink a full glass of water and wait 10 minutes",
        "Practice mindful eating - savor each bite slowly",
        "Call a friend or support person",
        "Engage in a different sensory experience like a warm bath"
      ],
      gaming: [
        "Set a timer for a healthy gaming session",
        "Plan real-world activities for after gaming",
        "Calculate time spent vs. other life goals",
        "Connect with friends outside of gaming",
        "Take regular breaks every hour"
      ]
    };
  }

  // Helper method to call OpenAI API
  async callOpenAI(prompt, temperature = 0.7, maxTokens = 500) {
    if (!this.openai) {
      console.warn('OpenAI not available, returning mock response');
      return '{"error": "OpenAI API not configured", "mock": true}';
    }
    
    try {
      // GPT-5 uses max_completion_tokens instead of max_tokens
      // GPT-5 only supports temperature: 1 (default)
      const requestParams = {
        model: this.modelName,
        messages: [{ role: "user", content: prompt }]
      };
      
      if (this.modelName === 'gpt-5') {
        requestParams.max_completion_tokens = maxTokens;
        // GPT-5 only supports default temperature (1)
        requestParams.temperature = 1;
      } else {
        requestParams.max_tokens = maxTokens;
        requestParams.temperature = temperature;
      }
      
      const response = await this.openai.chat.completions.create(requestParams);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return '{"error": "OpenAI API error", "details": "' + error.message + '"}';
    }
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
    
    // Addiction context
    if (addictions && addictions.length > 0) {
      context += `\n        - Active addictions: ${addictions.map(a => `${a.type} (${a.status})`).join(', ')}`;
    } else {
      context += `\n        - Addictions: None currently specified`;
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
      const addictions = await Addiction.find({ userId });
      const user = await User.findById(userId);
      
      // Build personalized user context
      const userContext = this.buildPersonalizedContext(user, addictions);
      
      const prompt = `
        You are Alex, an empathetic AI addiction recovery coach. Analyze this journal entry for:
        1. Emotional state and sentiment
        2. Potential addiction triggers and ACTUAL RELAPSE DETECTION
        3. Risk level assessment
        4. Suggested interventions
        
        CRITICAL: Distinguish between thinking about addictions vs. actually using substances or engaging in addictive behaviors.
        
        RELAPSE INDICATORS - Look for phrases that indicate ACTUAL usage:
        - "I drank", "had a drink", "got drunk", "went to the bar and drank"
        - "I smoked", "had a cigarette", "bought cigarettes", "lit up"  
        - "I gambled", "placed a bet", "went to casino", "lost money gambling"
        - "I used", "relapsed", "gave in", "couldn't resist and did it"
        - Past tense action words indicating consumption/engagement
        
        NOT relapse indicators (just thoughts/cravings):
        - "I want to drink", "craving a cigarette", "thinking about gambling"
        - "tempted to", "almost", "wanted to but didn't"
        
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
              "trigger": "specific trigger phrase found",
              "confidence": 0-1,
              "relatedAddiction": "addiction_type",
              "context": "ACTUAL RELAPSE if usage detected, or CRAVING/THOUGHT if just thinking",
              "isActualRelapse": true/false
            }
          ],
          "riskLevel": "low|medium|high|critical",
          "riskFactors": ["factor1", "factor2"],
          "coachResponse": "supportive message in user's language",
          "suggestedInterventions": ["intervention1", "intervention2"]
        }
        
        Set "isActualRelapse": true only if you detect past-tense usage language indicating the person actually used substances or engaged in addictive behavior.
        Keep the coach response encouraging, short (max 100 words), and culturally appropriate.
      `;
      
      const responseText = await this.callOpenAI(prompt, 0.7, 800);
      console.log('Raw OpenAI response for journal analysis:', responseText);
      
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      
      // Remove ```json and ``` markers
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      console.log('Cleaned OpenAI response for journal analysis:', cleanedText);
      
      const analysis = JSON.parse(cleanedText);
      
      // Save the analysis
      const aiCoach = new AICoach({
        userId,
        sessionId: `journal_analysis_${journalEntry._id}_${Date.now()}`,
        sessionType: 'journal_analysis',
        // Store analysis in messages instead of separate fields
        messages: [{
          role: 'assistant',
          content: JSON.stringify(analysis),
          metadata: {
            journalEntryId: journalEntry._id,
            triggersCount: analysis.triggersDetected?.length || 0,
            riskLevel: analysis.riskLevel || 'low'
          }
        }]
      });
      
      await aiCoach.save();
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing journal entry:', error);
      throw error;
    }
  }

  /**
   * Check only spelling errors (faster than full grammar+spelling check)
   */
  async checkSpellingOnly(text, language = 'en') {
    try {
      // First check for nonsense
      const nonsenseCheck = await this.checkNonsenseOnly(text);
      if (nonsenseCheck.isNonsense) {
        return {
          spellingErrors: [],
          moods: ['neutral'],
          overallSentiment: 'neutral',
          isNonsense: true,
          nonsenseReason: nonsenseCheck.reason
        };
      }

      const prompt = `
        You are a spelling checker. Analyze this text ONLY for spelling errors and mood.
        Language: ${language}
        Text: "${text}"
        
        Analyze for:
        1. Spelling errors (misspelled words, nonsense words, gibberish)
        2. Overall mood/sentiment of the text
        
        Return a JSON object:
        {
          "spellingErrors": [
            {
              "word": "misspelled or nonsense word",
              "suggestion": "correct spelling or N/A for nonsense"
            }
          ],
          "moods": ["detected mood keywords"],
          "overallSentiment": "positive|neutral|negative",
          "isNonsense": false,
          "nonsenseReason": null,
          "confidence": number_0_to_1,
          "languageDetected": "${language}"
        }
        
        For nonsense words like "lkjlkj", "asdfgh", random character sequences, use "N/A" as suggestion.
        Only return the JSON, no other text.
      `;
      
      const responseText = await this.callOpenAI(prompt, 0.3, 400);
      
      // Clean the response text
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      const analysis = JSON.parse(cleanedText);
      
      // Ensure required fields exist
      return {
        spellingErrors: analysis.spellingErrors || [],
        moods: analysis.moods || ['neutral'],
        overallSentiment: analysis.overallSentiment || 'neutral',
        isNonsense: false,
        nonsenseReason: null,
        confidence: analysis.confidence || 0.8,
        languageDetected: analysis.languageDetected || language
      };
      
    } catch (error) {
      console.error('Error checking spelling:', error);
      // Return a default response on error
      return {
        spellingErrors: [],
        moods: ['neutral'],
        overallSentiment: 'neutral',
        isNonsense: false,
        nonsenseReason: null,
        confidence: 0.5,
        languageDetected: language
      };
    }
  }

  /**
   * Check grammar, spelling and detect mood
   */
  async checkGrammarAndMood(text, language = 'en') {
    try {
      // First check for nonsense
      const nonsenseCheck = await this.checkNonsenseOnly(text);
      if (nonsenseCheck.isNonsense) {
        return {
          grammarErrors: [],
          spellingErrors: [],
          moods: ['neutral'],
          overallSentiment: 'neutral',
          isNonsense: true,
          nonsenseReason: nonsenseCheck.reason
        };
      }

      const prompt = `
        You are an expert language teacher. Analyze this text for grammar/spelling errors and mood.
        Language: ${language}
        Text: "${text}"
        
        Analyze for:
        1. Grammar errors (incorrect sentence structure, tense, etc.)
        2. Spelling errors (misspelled words)
        3. Overall mood/sentiment of the text
        
        Return a JSON object:
        {
          "grammarErrors": [
            {
              "text": "incorrect phrase from text",
              "suggestion": "corrected version",
              "reason": "brief explanation of the error"
            }
          ],
          "spellingErrors": [
            {
              "word": "misspelled word",
              "suggestion": "correct spelling"
            }
          ],
          "moods": ["detected mood keywords"],
          "overallSentiment": "positive|neutral|negative",
          "isNonsense": false,
          "nonsenseReason": null,
          "confidence": number_0_to_1,
          "languageDetected": "detected language code"
        }
        
        Be lenient with informal writing, slang, and creative expressions.
        Only flag clear errors, not stylistic choices.
        Only return the JSON, no other text.
      `;
      
      const responseText = await this.callOpenAI(prompt, 0.3, 600);
      
      // Clean the response text
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      const analysis = JSON.parse(cleanedText);
      
      // Ensure required fields exist
      return {
        grammarErrors: analysis.grammarErrors || [],
        spellingErrors: analysis.spellingErrors || [],
        moods: analysis.moods || ['neutral'],
        overallSentiment: analysis.overallSentiment || 'neutral',
        isNonsense: false,
        nonsenseReason: null,
        confidence: analysis.confidence || 0.8,
        languageDetected: analysis.languageDetected || language
      };
      
    } catch (error) {
      console.error('Error checking grammar and mood:', error);
      // Return a default response on error
      return {
        grammarErrors: [],
        spellingErrors: [],
        moods: ['neutral'],
        overallSentiment: 'neutral',
        isNonsense: false,
        nonsenseReason: null,
        confidence: 0.5,
        languageDetected: language
      };
    }
  }

  /**
   * Analyze mood from journal entry text using AI
   */
  async analyzeMoodFromText(text, userId = null) {
    try {
      // Check minimum word count (10 words)
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount < 10) {
        console.log(`Text too short for mood analysis: ${wordCount} words (minimum: 10)`);
        return null; // Return null for texts that are too short
      }

      let userContextInfo = '';
      
      // If userId provided, get user context for better analysis
      if (userId) {
        try {
          const user = await User.findById(userId);
          const addictions = await Addiction.find({ userId });
          userContextInfo = `User context: ${this.buildPersonalizedContext(user, addictions)}`;
        } catch (error) {
          console.log('Could not fetch user context for mood analysis:', error.message);
        }
      }
      
      const prompt = `
        You are an expert emotional intelligence analyst. Analyze the following journal entry text for emotional state and mood.
        
        ${userContextInfo}
        
        Journal Entry: "${text}"
        
        Analyze for:
        1. Primary mood/emotion
        2. Emotional intensity (1-10 scale)
        3. Overall sentiment
        4. Specific emotional indicators from the text
        5. Confidence in your analysis
        
        Available mood categories: happy, calm, stressed, anxious, energetic, peaceful, grateful, reflective, sad, angry, frustrated, confused, lonely, mixed, neutral
        
        Respond with a JSON object:
        {
          "primaryMood": "mood_from_categories_above",
          "moodScore": number_1_to_10,
          "confidence": number_0_to_1,
          "emotionalIndicators": ["specific phrases from text that indicate emotion"],
          "overallSentiment": "positive|neutral|negative|mixed",
          "moodDescription": "Brief compassionate description of the emotional state",
          "detectedMoods": [
            {
              "mood": "mood_name",
              "score": number_1_to_10,
              "strength": number_0_to_5,
              "keywords": ["words from text"]
            }
          ],
          "moodCount": number_of_moods_detected,
          "emotionalIntensity": number_1_to_5,
          "emotionalTransition": "stable|improving|declining|fluctuating",
          "suggestedFocus": "Wellbeing suggestion based on detected mood"
        }
        
        Only respond with the JSON, no other text.
      `;
      
      const responseText = await this.callOpenAI(prompt, 0.3, 800);
      
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      console.log('OpenAI mood analysis response:', cleanedText);
      
      const moodAnalysis = JSON.parse(cleanedText);
      
      // Validate the response has required fields
      if (!moodAnalysis.primaryMood || !moodAnalysis.moodScore) {
        console.log('Invalid mood analysis response, using fallback');
        return null;
      }
      
      // Mood mapping to ensure valid enum values
      const moodMapping = {
        'happiness': 'happy', 'joy': 'happy', 'joyful': 'happy', 'content': 'happy', 'satisfied': 'happy',
        'relaxed': 'calm', 'serene': 'calm', 'tranquil': 'calm',
        'worried': 'anxious', 'nervous': 'anxious', 'tense': 'anxious',
        'upset': 'sad', 'down': 'sad', 'depressed': 'sad', 'melancholy': 'sad',
        'mad': 'angry', 'irritated': 'angry', 'annoyed': 'angry',
        'overwhelmed': 'stressed', 'pressured': 'stressed',
        'excited': 'energetic', 'motivated': 'energetic', 'enthusiastic': 'energetic',
        'thankful': 'grateful', 'appreciative': 'grateful',
        'thoughtful': 'reflective', 'contemplative': 'reflective', 'introspective': 'reflective',
        'isolated': 'lonely', 'disconnected': 'lonely',
        'bewildered': 'confused', 'uncertain': 'confused', 'perplexed': 'confused',
        'complicated': 'mixed', 'conflicted': 'mixed'
      };
      
      // Map the primary mood to valid enum value
      const mappedMood = moodMapping[moodAnalysis.primaryMood.toLowerCase()] || moodAnalysis.primaryMood.toLowerCase();
      const validMoods = ['happy', 'calm', 'stressed', 'anxious', 'energetic', 'peaceful', 'grateful', 'reflective', 'sad', 'angry', 'frustrated', 'confused', 'lonely', 'mixed', 'neutral'];
      
      if (validMoods.includes(mappedMood)) {
        moodAnalysis.primaryMood = mappedMood;
      } else {
        moodAnalysis.primaryMood = 'neutral'; // Default fallback
      }
      
      return moodAnalysis;
      
    } catch (error) {
      console.error('Error analyzing mood from text:', error);
      return null; // Return null on error so calling code can handle gracefully
    }
  }

  /**
   * Check only for nonsense text without grammar/spelling checking
   */
  async checkNonsenseOnly(text) {
    try {
      console.log('Performing nonsense-only check for text:', text.substring(0, 100) + '...');
      
      if (!text || text.trim().length === 0) {
        return { isNonsense: false, reason: null };
      }

      // Quick nonsense detection prompt
      const prompt = `Is this text nonsense/gibberish? "${text}" Answer: true/false`;
      
      const responseText = await this.callOpenAI(prompt, 0.1, 20);
      const cleanedResponse = responseText.trim().toLowerCase();
      const isNonsense = cleanedResponse.includes('true');
      
      const result = {
        isNonsense,
        reason: isNonsense ? "Text contains gibberish or meaningless content" : null
      };
      
      console.log('Nonsense check result:', result);
      return result;
      
    } catch (error) {
      console.error('Error in nonsense-only check:', error);
      // Default to false (not nonsense) on error to allow saving
      return { 
        isNonsense: false, 
        reason: null,
        error: error.message 
      };
    }
  }

  /**
   * Get language-specific instructions for AI responses
   */
  getLanguageInstructions(languageCode) {
    const instructions = {
      'nl': 'BELANGRIJK: Reageer uitsluitend in het Nederlands. Gebruik Nederlandse woorden, uitdrukkingen en culturele referenties. Bijvoorbeeld: "Ik begrijp dat dit moeilijk voor je is..." in plaats van Engelse woorden.',
      'de': 'WICHTIG: Antworten Sie ausschließlich auf Deutsch. Verwenden Sie deutsche Wörter, Ausdrücke und kulturelle Referenzen.',
      'fr': 'IMPORTANT: Répondez exclusivement en français. Utilisez des mots, expressions et références culturelles françaises.',
      'es': 'IMPORTANTE: Responde exclusivamente en español. Usa palabras, expresiones y referencias culturales españolas.',
      'it': 'IMPORTANTE: Rispondi esclusivamente in italiano. Usa parole, espressioni e riferimenti culturali italiani.',
      'pt': 'IMPORTANTE: Responda exclusivamente em português. Use palavras, expressões e referências culturais portuguesas.',
      'ru': 'ВАЖНО: Отвечайте исключительно на русском языке. Используйте русские слова, выражения и культурные ссылки.',
      'en': 'IMPORTANT: Respond exclusively in English.'
    };
    
    return instructions[languageCode] || instructions['en'];
  }

  /**
   * Generate coaching response for a user interaction
   */
  async generateCoachingResponse(userId, message, context = {}) {
    try {
      const user = await User.findById(userId);
      const addictions = await Addiction.find({ userId });
      
      const userContext = this.buildPersonalizedContext(user, addictions);
      
      // Determine response language
      const userLanguage = user?.preferredLanguage || 'en';
      const languageInstructions = this.getLanguageInstructions(userLanguage);
      
      const prompt = `
        You are Alex, an empathetic AI addiction recovery coach with these traits:
        - Name: ${this.coachPersona.name}
        - Personality: ${this.coachPersona.personality}
        - Expertise: ${this.coachPersona.expertise}
        - Style: ${this.coachPersona.style}
        
        User context:
        ${userContext}
        
        User message: "${message}"
        
        Additional context: ${JSON.stringify(context)}
        
        ${languageInstructions}
        
        Provide a supportive, actionable response that:
        1. Acknowledges their feelings
        2. Offers practical advice
        3. Includes specific coping strategies if relevant
        4. Is culturally appropriate
        5. Is encouraging but realistic
        
        Keep your response concise (max 150 words). IMPORTANT: You MUST respond in ${userLanguage === 'nl' ? 'Dutch (Nederlands)' : userLanguage === 'fr' ? 'French (Français)' : userLanguage === 'de' ? 'German (Deutsch)' : userLanguage === 'es' ? 'Spanish (Español)' : 'English'}.
      `;
      
      const response = await this.callOpenAI(prompt, 0.8, 300);
      
      // Save the coaching session
      const sessionId = `chat_${userId}_${Date.now()}`;
      const aiCoach = new AICoach({
        userId,
        sessionId,
        sessionType: 'chat',
        messages: [
          {
            role: 'user',
            content: message,
            timestamp: new Date()
          },
          {
            role: 'coach',
            content: response,
            timestamp: new Date()
          }
        ],
        analysisResults: {},
        interventions: []
      });
      
      await aiCoach.save();
      
      return {
        response: response,
        sessionId: sessionId
      };
    } catch (error) {
      console.error('Error generating coaching response:', error);
      throw error;
    }
  }

  /**
   * Generate progress insights for user
   */
  async generateProgressInsights(userId, data) {
    try {
      console.log('🧠 Starting generateProgressInsights for user:', userId);
      const { journalEntries, coachSessions, addictions, timeframe } = data;
      
      // Get user language preference
      const user = await User.findById(userId);
      const userLanguage = user?.preferredLanguage || 'en';
      const languageInstructions = this.getLanguageInstructions(userLanguage);
      
      // Prepare data for analysis
      const recentJournals = journalEntries.slice(-10); // Last 10 entries
      const recentSessions = coachSessions.slice(-5);   // Last 5 sessions
      console.log('📝 Prepared data:', {
        recentJournalsCount: recentJournals.length,
        recentSessionsCount: recentSessions.length,
        addictionsCount: addictions.length,
        userLanguage: userLanguage
      });
      
      const prompt = `
        You are an AI wellness coach providing progress insights. Analyze the user's data and provide meaningful insights about their mental health journey.
        
        JOURNAL ENTRIES (${recentJournals.length} recent entries):
        ${recentJournals.map(entry => `- ${entry.date}: ${entry.mood || 'No mood'} - ${entry.content?.substring(0, 100) || 'No content'}...`).join('\n')}
        
        AI COACH SESSIONS (${recentSessions.length} recent sessions):
        ${recentSessions.map(session => `- ${session.createdAt}: ${session.sessionType} - ${session.coachResponse?.substring(0, 100) || ''}...`).join('\n')}
        
        ADDICTIONS BEING TRACKED (${addictions.length} total):
        ${addictions.map(addiction => `- ${addiction.name}: ${addiction.status || 'active'}`).join('\n')}
        
        TIME FRAME: Last ${timeframe} days
        
        ${languageInstructions}
        
        Provide insights in the following JSON format. Return ONLY the JSON object, no markdown formatting or additional text:
        {
          "overallProgress": "positive/neutral/concerning",
          "keyInsights": [
            "Brief insight about mood patterns",
            "Brief insight about journaling consistency", 
            "Brief insight about addiction recovery if applicable"
          ],
          "moodTrends": {
            "primary": "most common mood",
            "trend": "improving/stable/declining",
            "description": "Brief description of mood patterns"
          },
          "recommendations": [
            "Specific actionable recommendation 1",
            "Specific actionable recommendation 2"
          ],
          "nextSteps": "What the user should focus on next"
        }
        
        Keep insights encouraging but honest. Focus on actionable advice. Return only valid JSON, no code blocks or markdown.
      `;
      
      console.log('📤 Calling OpenAI for insights...');
      const response = await this.callOpenAI(prompt, 0.7, 800);
      console.log('📥 OpenAI response received, length:', response.length);
      
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/g, '');
        }
        if (cleanResponse.endsWith('```')) {
          cleanResponse = cleanResponse.replace(/\s*```$/g, '');
        }
        
        // Parse the cleaned JSON response
        const insights = JSON.parse(cleanResponse);
        return insights;
      } catch (parseError) {
        console.error('Error parsing insights JSON:', parseError);
        console.error('Raw response:', response);
        // Return a fallback response
        return {
          overallProgress: "neutral",
          keyInsights: [
            "Continue journaling regularly to track your progress",
            "Your engagement with wellness tools shows positive commitment",
            "Consider setting specific goals for the coming week"
          ],
          moodTrends: {
            primary: "mixed",
            trend: "stable",
            description: "Your mood shows normal daily variations"
          },
          recommendations: [
            "Keep up with regular journaling",
            "Try meditation when feeling stressed"
          ],
          nextSteps: "Focus on consistency in your wellness practices"
        };
      }
      
    } catch (error) {
      console.error('Error generating progress insights:', error);
      throw error;
    }
  }

  /**
   * Generate chat response - alias for generateCoachingResponse
   */
  async generateChatResponse(userId, message, context = {}) {
    return await this.generateCoachingResponse(userId, message, context);
  }

  /**
   * Generate emergency intervention response
   */
  async generateIntervention(userId, triggerType, urgencyLevel = 'medium') {
    try {
      const User = require('../models/User');
      const Addiction = require('../models/Addiction');
      
      const user = await User.findById(userId);
      const addictions = await Addiction.find({ userId });

      const prompt = `
        You are an emergency intervention specialist. Generate an immediate, supportive response for someone experiencing a ${triggerType} trigger with ${urgencyLevel} urgency.

        User context: ${this.buildPersonalizedContext(user, addictions)}

        Provide:
        1. Immediate coping strategy
        2. Grounding technique
        3. Emergency resources if needed
        4. Encouraging message

        Respond with JSON:
        {
          "message": "Supportive intervention message",
          "copingStrategy": "Immediate action to take",
          "groundingTechnique": "Quick grounding method",
          "urgencyLevel": "${urgencyLevel}",
          "resources": ["emergency contact suggestions"],
          "followUpAction": "Next steps to take"
        }
      `;

      const response = await this.callOpenAI(prompt, 0.5, 600);
      
      try {
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/g, '');
        }
        if (cleanResponse.endsWith('```')) {
          cleanResponse = cleanResponse.replace(/```\s*$/g, '');
        }
        
        return JSON.parse(cleanResponse);
      } catch (parseError) {
        // Fallback intervention
        return {
          message: "I'm here to support you through this difficult moment. Take a deep breath.",
          copingStrategy: "Try the 4-7-8 breathing technique: inhale for 4, hold for 7, exhale for 8.",
          groundingTechnique: "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.",
          urgencyLevel,
          resources: ["Crisis helpline: 988", "Text HOME to 741741"],
          followUpAction: "Reach out to a trusted friend or family member"
        };
      }
    } catch (error) {
      console.error('Error generating intervention:', error);
      throw error;
    }
  }
}

const aiCoachService = new AICoachService();
module.exports = aiCoachService;