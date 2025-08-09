const OpenAI = require('openai');
const AICoach = require('../models/AICoach');
const JournalEntry = require('../models/JournalEntry');
const Addiction = require('../models/Addiction');
const User = require('../models/User');

class AICoachService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.modelName = "gpt-4o"; // Using GPT-4o (GPT-5 may not be available yet)
    
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
      
      // Language-specific analysis instructions
      const userLanguage = user?.preferredLanguage || 'en';
      const languageInstructions = {
        'en': 'Respond with coachResponse and suggestedInterventions in English.',
        'nl': 'Antwoord met coachResponse en suggestedInterventions in het Nederlands.',
        'de': 'Antworten Sie mit coachResponse und suggestedInterventions auf Deutsch.',
        'fr': 'Répondez avec coachResponse et suggestedInterventions en français.',
        'es': 'Responda con coachResponse y suggestedInterventions en español.',
        'it': 'Rispondi con coachResponse e suggestedInterventions in italiano.',
        'pt': 'Responda com coachResponse e suggestedInterventions em português.',
        'ru': 'Отвечайте с coachResponse и suggestedInterventions на русском языке.',
        'zh': '用中文回答 coachResponse 和 suggestedInterventions。',
        'ja': 'coachResponse と suggestedInterventions を日本語で回答してください。',
        'ko': 'coachResponse와 suggestedInterventions를 한국어로 답변하세요.',
        'hi': 'coachResponse और suggestedInterventions को हिंदी में उत्तर दें।',
        'ar': 'أجب بـ coachResponse و suggestedInterventions باللغة العربية.'
      };
      
      const langInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

      // Optimized prompt for OpenAI GPT-4o
      const prompt = `You are Alex, an empathetic AI addiction recovery coach specializing in emotional analysis and trigger detection.

ANALYZE THIS JOURNAL ENTRY:
Title: "${journalEntry.title}"
Content: "${journalEntry.content}"
Date: ${journalEntry.date}

USER CONTEXT: ${userContext}

LANGUAGE INSTRUCTION: ${langInstruction}

PROVIDE ANALYSIS AS VALID JSON:
{
  "sentimentScore": [number between -1 and 1],
  "emotionalState": {
    "primary": "[main emotion]",
    "secondary": ["[additional emotions]"],
    "stability": "stable|declining|improving|volatile"
  },
  "triggersDetected": [
    {
      "trigger": "[specific trigger]",
      "confidence": [0-1],
      "relatedAddiction": "[addiction type]", 
      "context": "[brief explanation]"
    }
  ],
  "riskLevel": "low|medium|high",
  "riskFactors": ["[specific risk factors]"],
  "coachResponse": "[supportive message in user's preferred language (${userLanguage}), max 100 words]",
  "suggestedInterventions": ["[specific actionable advice in user's preferred language (${userLanguage})]"]
}

Important: Response must be valid JSON only. Ensure coachResponse and suggestedInterventions are in the user's preferred language: ${userLanguage}.`;
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const responseText = result.choices[0].message.content;
      console.log('Raw OpenAI GPT-4o response for journal analysis:', responseText);
      
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
      
      // Store analysis in AI Coach record
      await this.saveAnalysis(userId, 'analysis', analysis, journalEntry._id);
      
      return analysis;
      
    } catch (error) {
      console.error('Error analyzing journal entry with OpenAI GPT-4o:', error);
      console.error('Error details:', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: error.status
      });
      // Get user for language preference in default response
      const user = await User.findById(userId).catch(() => null);
      return this.getDefaultAnalysis(user?.preferredLanguage || 'en');
    }
  }

  /**
   * Generate coaching chat response
   */
  async generateChatResponse(userId, userMessage, context = {}, overrideLanguage = null) {
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
      
      // Language-specific coaching instructions
      const languageInstructions = {
        'en': 'IMPORTANT: Respond in English only. Be warm and supportive.',
        'nl': 'BELANGRIJK: Antwoord ALLEEN in het Nederlands. Wees warm en ondersteunend.',
        'de': 'WICHTIG: Antworten Sie NUR auf Deutsch. Seien Sie herzlich und unterstützend.',
        'fr': 'IMPORTANT: Répondez UNIQUEMENT en français. Soyez chaleureux et solidaire.',
        'es': 'IMPORTANTE: Responde SOLO en español. Sé cálido y solidario.',
        'it': 'IMPORTANTE: Rispondi SOLO in italiano. Sii caloroso e solidale.',
        'pt': 'IMPORTANTE: Responda APENAS em português. Seja caloroso e solidário.',
        'ru': 'ВАЖНО: Отвечайте ТОЛЬКО на русском языке. Будьте теплыми и поддерживающими.',
        'zh': '重要：只用中文回答。要温暖和支持。',
        'ja': '重要：日本語のみで回答してください。温かく、支援的になってください。',
        'ko': '중요: 한국어로만 답변하세요. 따뜻하고 지지적이어야 합니다.',
        'hi': 'महत्वपूर्ण: केवल हिंदी में जवाब दें। गर्मजोशी और सहायक बनें।',
        'ar': 'مهم: أجب بالعربية فقط. كن دافئًا وداعمًا.'
      };

      // Use override language from UI if provided, otherwise fall back to user preference
      const userLanguage = overrideLanguage || user?.preferredLanguage || 'en';
      const langInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

      const prompt = `
        You are Alex, a professional AI addiction recovery coach. Respond to this user message with empathy and practical guidance.
        
        ${langInstruction}
        
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
        - Reference their specific addiction type when relevant
        - Avoid clinical or medical advice
        - Focus on emotional support and behavioral strategies
        - Adapt your communication style to their age and background
        - Consider their location for relevant resources or references
        
        Respond as Alex would, naturally and conversationally in the user's preferred language (${userLanguage}).
      `;
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const coachResponse = result.choices[0].message.content;
      
      // Save conversation
      await this.saveChatMessage(userId, userMessage, coachResponse, context);
      
      return {
        response: coachResponse,
        suggestions: await this.getSuggestions(userId, userMessage),
        riskLevel: await this.assessRiskLevel(userMessage, addictions)
      };
      
    } catch (error) {
      console.error('Error generating chat response:', error);
      
      // Get user language for fallback response (use override language first)
      const user = await User.findById(userId).catch(() => null);
      const userLanguage = overrideLanguage || user?.preferredLanguage || 'en';
      
      const fallbackResponses = {
        'en': "I'm here to support you. Can you tell me how you're feeling right now?",
        'nl': "Ik ben er om je te ondersteunen. Kun je me vertellen hoe je je nu voelt?",
        'de': "Ich bin hier, um Sie zu unterstützen. Können Sie mir sagen, wie Sie sich gerade fühlen?",
        'fr': "Je suis là pour vous accompagner. Pouvez-vous me dire comment vous vous sentez maintenant?",
        'es': "Estoy aquí para apoyarte. ¿Puedes decirme cómo te sientes ahora?",
        'it': "Sono qui per supportarti. Puoi dirmi come ti senti adesso?",
        'pt': "Estou aqui para apoiá-lo. Pode dizer-me como se sente agora?",
        'ru': "Я здесь, чтобы поддержать вас. Можете ли вы сказать мне, как вы себя чувствуете сейчас?",
        'zh': "我在这里支持你。你能告诉我你现在的感受吗？",
        'ja': "あなたをサポートするためにここにいます。今の気持ちを教えてもらえますか？",
        'ko': "당신을 지원하기 위해 여기 있습니다. 지금 기분이 어떤지 말씀해 주시겠어요？",
        'hi': "मैं आपका समर्थन करने के लिए यहाँ हूँ। क्या आप मुझे बता सकते हैं कि आप अभी कैसा महसूस कर रहे हैं？",
        'ar': "أنا هنا لدعمك. هل يمكنك أن تخبرني كيف تشعر الآن؟"
      };
      
      const fallbackSuggestions = {
        'en': ["Take a deep breath", "Share more about your day"],
        'nl': ["Neem een diepe ademhaling", "Vertel meer over je dag"],
        'de': ["Atmen Sie tief durch", "Erzählen Sie mehr über Ihren Tag"],
        'fr': ["Prenez une grande respiration", "Partagez plus sur votre journée"],
        'es': ["Respira profundo", "Comparte más sobre tu día"],
        'it': ["Fai un respiro profondo", "Condividi di più sulla tua giornata"],
        'pt': ["Respire fundo", "Partilhe mais sobre o seu dia"],
        'ru': ["Сделайте глубокий вдох", "Расскажите больше о своем дне"],
        'zh': ["深呼吸", "分享更多关于你的一天"],
        'ja': ["深呼吸をしてください", "あなたの一日についてもっと教えてください"],
        'ko': ["심호흡하세요", "당신의 하루에 대해 더 알려주세요"],
        'hi': ["गहरी सांस लें", "अपने दिन के बारे में और बताएं"],
        'ar': ["خذ نفساً عميقاً", "شارك المزيد عن يومك"]
      };
      
      return {
        response: fallbackResponses[userLanguage] || fallbackResponses['en'],
        suggestions: fallbackSuggestions[userLanguage] || fallbackSuggestions['en'],
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
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      let text = result.choices[0].message.content;
      
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
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      let text = result.choices[0].message.content;
      
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
    
    // Map addiction type strings to actual Addiction document IDs
    let processedTriggers = analysis.triggersDetected || [];
    if (processedTriggers.length > 0) {
      // Get user's addictions to map type strings to ObjectIds
      const userAddictions = await Addiction.find({ userId });
      
      processedTriggers = processedTriggers.map(trigger => {
        // If relatedAddiction is a string, try to find the matching addiction ID
        if (trigger.relatedAddiction && typeof trigger.relatedAddiction === 'string') {
          const matchingAddiction = userAddictions.find(
            addiction => addiction.type === trigger.relatedAddiction
          );
          
          // Return trigger with ObjectId if found, otherwise exclude relatedAddiction
          if (matchingAddiction) {
            return { ...trigger, relatedAddiction: matchingAddiction._id };
          } else {
            // Remove relatedAddiction if we can't find a matching ID
            const { relatedAddiction, ...triggerWithoutAddiction } = trigger;
            return triggerWithoutAddiction;
          }
        }
        return trigger;
      });
    }
    
    const coachSession = new AICoach({
      userId,
      sessionId,
      sessionType,
      analysisResults: {
        sentimentScore: analysis.sentimentScore,
        triggersDetected: processedTriggers,
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
  getDefaultAnalysis(language = 'en') {
    const coachResponses = {
      'en': "Thank you for sharing. I'm here to support you on your journey.",
      'nl': "Dank je voor het delen. Ik ben er om je te ondersteunen op je reis.",
      'de': "Danke, dass Sie das mit mir geteilt haben. Ich bin hier, um Sie auf Ihrem Weg zu unterstützen.",
      'fr': "Merci de partager. Je suis là pour vous accompagner dans votre parcours.",
      'es': "Gracias por compartir. Estoy aquí para apoyarte en tu viaje.",
      'it': "Grazie per aver condiviso. Sono qui per supportarti nel tuo percorso.",
      'pt': "Obrigado por partilhar. Estou aqui para apoiá-lo na sua jornada.",
      'ru': "Спасибо, что поделились. Я здесь, чтобы поддержать вас на вашем пути.",
      'zh': "谢谢你的分享。我在这里支持你的旅程。",
      'ja': "シェアしていただきありがとうございます。あなたの旅路をサポートするためにここにいます。",
      'ko': "공유해 주셔서 감사합니다. 당신의 여정을 지원하기 위해 여기 있습니다.",
      'hi': "साझा करने के लिए धन्यवाद। मैं आपकी यात्रा में आपका समर्थन करने के लिए यहाँ हूँ।",
      'ar': "شكراً لك على المشاركة. أنا هنا لدعمك في رحلتك."
    };

    return {
      sentimentScore: 0,
      emotionalState: { primary: "neutral", secondary: [], stability: "stable" },
      triggersDetected: [],
      riskLevel: "low",
      riskFactors: [],
      coachResponse: coachResponses[language] || coachResponses['en'],
      suggestedInterventions: ["mindfulness", "breathing"]
    };
  }

  getDefaultIntervention(triggerType, language = 'en') {
    const interventionMessages = {
      'en': {
        immediateAction: "Take 5 deep breaths",
        message: "You're stronger than this moment. Let's take it one breath at a time.",
        copingStrategy: "Breathe in for 4 counts, hold for 4, exhale for 6. Repeat 5 times.",
        followUpQuestions: ["How are you feeling now?", "What triggered this moment?"]
      },
      'nl': {
        immediateAction: "Neem 5 diepe ademhalingen",
        message: "Je bent sterker dan dit moment. Laten we het adem voor adem doen.",
        copingStrategy: "Adem in gedurende 4 tellen, houd 4 tellen vast, adem uit gedurende 6 tellen. Herhaal 5 keer.",
        followUpQuestions: ["Hoe voel je je nu?", "Wat heeft dit moment veroorzaakt?"]
      },
      'de': {
        immediateAction: "Nehmen Sie 5 tiefe Atemzüge",
        message: "Sie sind stärker als dieser Moment. Lassen Sie es uns Atemzug für Atemzug angehen.",
        copingStrategy: "Atmen Sie 4 Sekunden ein, halten Sie 4 Sekunden an, atmen Sie 6 Sekunden aus. 5 Mal wiederholen.",
        followUpQuestions: ["Wie fühlen Sie sich jetzt?", "Was hat diesen Moment ausgelöst?"]
      },
      'fr': {
        immediateAction: "Prenez 5 respirations profondes",
        message: "Vous êtes plus fort que ce moment. Prenons-le souffle par souffle.",
        copingStrategy: "Inspirez pendant 4 temps, retenez pendant 4, expirez pendant 6. Répétez 5 fois.",
        followUpQuestions: ["Comment vous sentez-vous maintenant?", "Qu'est-ce qui a déclenché ce moment?"]
      },
      'es': {
        immediateAction: "Toma 5 respiraciones profundas",
        message: "Eres más fuerte que este momento. Vamos respiración por respiración.",
        copingStrategy: "Inhala durante 4 tiempos, mantén durante 4, exhala durante 6. Repite 5 veces.",
        followUpQuestions: ["¿Cómo te sientes ahora?", "¿Qué desencadenó este momento?"]
      },
      'it': {
        immediateAction: "Fai 5 respiri profondi",
        message: "Sei più forte di questo momento. Prendiamolo un respiro alla volta.",
        copingStrategy: "Inspira per 4 tempi, trattieni per 4, espira per 6. Ripeti 5 volte.",
        followUpQuestions: ["Come ti senti ora?", "Cosa ha scatenato questo momento?"]
      },
      'pt': {
        immediateAction: "Faça 5 respirações profundas",
        message: "Você é mais forte que este momento. Vamos passo a passo, respiração por respiração.",
        copingStrategy: "Inspire por 4 tempos, segure por 4, expire por 6. Repita 5 vezes.",
        followUpQuestions: ["Como se sente agora?", "O que desencadeou este momento?"]
      },
      'ru': {
        immediateAction: "Сделайте 5 глубоких вдохов",
        message: "Вы сильнее этого момента. Давайте пройдем через это дыхание за дыханием.",
        copingStrategy: "Вдыхайте на 4 счета, задержите на 4, выдыхайте на 6. Повторите 5 раз.",
        followUpQuestions: ["Как вы себя чувствуете сейчас?", "Что вызвало этот момент?"]
      },
      'zh': {
        immediateAction: "深呼吸5次",
        message: "你比这一刻更强大。让我们一次一个呼吸地度过。",
        copingStrategy: "吸气4拍，屏息4拍，呼气6拍。重复5次。",
        followUpQuestions: ["你现在感觉如何？", "是什么引发了这一刻？"]
      },
      'ja': {
        immediateAction: "5回深呼吸をしてください",
        message: "あなたはこの瞬間より強いです。一呼吸ずつ乗り越えましょう。",
        copingStrategy: "4カウントで息を吸い、4カウント止めて、6カウントで吐きます。5回繰り返します。",
        followUpQuestions: ["今どのように感じていますか？", "何がこの瞬間を引き起こしましたか？"]
      },
      'ko': {
        immediateAction: "5번 깊게 숨쉬세요",
        message: "당신은 이 순간보다 더 강합니다. 한 번의 호흡씩 함께 해봅시다.",
        copingStrategy: "4박자 동안 숨을 들이쉬고, 4박자 동안 참았다가, 6박자 동안 내쉬세요. 5번 반복하세요.",
        followUpQuestions: ["지금 기분이 어떤가요?", "무엇이 이 순간을 유발했나요?"]
      },
      'hi': {
        immediateAction: "5 गहरी सांसें लें",
        message: "आप इस पल से कहीं अधिक मजबूत हैं। आइए एक-एक सांस करके इसे पार करते हैं।",
        copingStrategy: "4 गिनती के लिए सांस अंदर लें, 4 के लिए रोकें, 6 के लिए छोड़ें। 5 बार दोहराएं।",
        followUpQuestions: ["अब आप कैसा महसूस कर रहे हैं?", "इस पल को किस बात ने ट्रिगर किया?"]
      },
      'ar': {
        immediateAction: "خذ 5 أنفاس عميقة",
        message: "أنت أقوى من هذه اللحظة. دعنا نأخذها نفساً واحداً في كل مرة.",
        copingStrategy: "تنفس لمدة 4 عدات، احتفظ لمدة 4، ازفر لمدة 6. كرر 5 مرات.",
        followUpQuestions: ["كيف تشعر الآن؟", "ما الذي أثار هذه اللحظة؟"]
      }
    };

    const langMessages = interventionMessages[language] || interventionMessages['en'];
    
    return {
      interventionType: "breathing",
      immediateAction: langMessages.immediateAction,
      message: langMessages.message,
      copingStrategy: langMessages.copingStrategy,
      followUpQuestions: langMessages.followUpQuestions
    };
  }

  getDefaultInsights(language = 'en') {
    const insightMessages = {
      'en': {
        keyInsights: ["You're taking positive steps by using this app"],
        achievements: ["Staying engaged with your recovery"],
        recommendedActions: ["Continue journaling daily"],
        motivationalMessage: "Every day is a new opportunity for growth."
      },
      'nl': {
        keyInsights: ["Je neemt positieve stappen door deze app te gebruiken"],
        achievements: ["Betrokken blijven bij je herstel"],
        recommendedActions: ["Blijf dagelijks dagboek schrijven"],
        motivationalMessage: "Elke dag is een nieuwe kans voor groei."
      },
      'de': {
        keyInsights: ["Sie machen positive Schritte, indem Sie diese App nutzen"],
        achievements: ["Engagiert bleiben in Ihrer Genesung"],
        recommendedActions: ["Führen Sie weiterhin täglich Tagebuch"],
        motivationalMessage: "Jeder Tag ist eine neue Chance für Wachstum."
      },
      'fr': {
        keyInsights: ["Vous faites des pas positifs en utilisant cette application"],
        achievements: ["Rester engagé dans votre rétablissement"],
        recommendedActions: ["Continuez à tenir un journal quotidien"],
        motivationalMessage: "Chaque jour est une nouvelle opportunité de croissance."
      },
      'es': {
        keyInsights: ["Estás dando pasos positivos al usar esta aplicación"],
        achievements: ["Mantenerte comprometido con tu recuperación"],
        recommendedActions: ["Continúa escribiendo en tu diario diariamente"],
        motivationalMessage: "Cada día es una nueva oportunidad para el crecimiento."
      },
      'it': {
        keyInsights: ["Stai facendo passi positivi usando questa app"],
        achievements: ["Rimanere coinvolto nel tuo recupero"],
        recommendedActions: ["Continua a scrivere il diario quotidianamente"],
        motivationalMessage: "Ogni giorno è una nuova opportunità per crescere."
      },
      'pt': {
        keyInsights: ["Está dando passos positivos ao usar esta aplicação"],
        achievements: ["Manter-se envolvido na sua recuperação"],
        recommendedActions: ["Continue a escrever no diário diariamente"],
        motivationalMessage: "Cada dia é uma nova oportunidade para crescer."
      },
      'ru': {
        keyInsights: ["Вы делаете позитивные шаги, используя это приложение"],
        achievements: ["Сохранение активности в восстановлении"],
        recommendedActions: ["Продолжайте вести дневник ежедневно"],
        motivationalMessage: "Каждый день - это новая возможность для роста."
      },
      'zh': {
        keyInsights: ["通过使用这个应用程序，你正在迈出积极的步伐"],
        achievements: ["保持参与康复过程"],
        recommendedActions: ["继续每天写日记"],
        motivationalMessage: "每一天都是成长的新机会。"
      },
      'ja': {
        keyInsights: ["このアプリを使用することでポジティブな歩みを進めています"],
        achievements: ["回復に取り組み続けている"],
        recommendedActions: ["日記を毎日書き続ける"],
        motivationalMessage: "毎日が成長のための新しい機会です。"
      },
      'ko': {
        keyInsights: ["이 앱을 사용함으로써 긍정적인 발걸음을 내딛고 있습니다"],
        achievements: ["회복에 계속 참여하기"],
        recommendedActions: ["매일 일기 쓰기를 계속하세요"],
        motivationalMessage: "매일은 성장을 위한 새로운 기회입니다."
      },
      'hi': {
        keyInsights: ["इस ऐप का उपयोग करके आप सकारात्मक कदम उठा रहे हैं"],
        achievements: ["अपनी रिकवरी में संलग्न रहना"],
        recommendedActions: ["रोजाना डायरी लिखना जारी रखें"],
        motivationalMessage: "हर दिन विकास के लिए एक नया अवसर है।"
      },
      'ar': {
        keyInsights: ["أنت تتخذ خطوات إيجابية باستخدام هذا التطبيق"],
        achievements: ["البقاء منخرطاً في تعافيك"],
        recommendedActions: ["واصل كتابة اليوميات يومياً"],
        motivationalMessage: "كل يوم هو فرصة جديدة للنمو."
      }
    };

    const langMessages = insightMessages[language] || insightMessages['en'];

    return {
      weeklyProgress: "neutral",
      keyInsights: langMessages.keyInsights,
      moodTrend: "stable",
      achievements: langMessages.achievements,
      recommendedActions: langMessages.recommendedActions,
      motivationalMessage: langMessages.motivationalMessage
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
    const preferredLanguage = user?.preferredLanguage || 'en';
    
    // Base breathing technique suggestion in multiple languages
    const breathingTechniques = {
      'en': "Try the 4-7-8 breathing technique",
      'nl': "Probeer de 4-7-8 ademhalingstechniek",
      'de': "Probieren Sie die 4-7-8 Atemtechnik",
      'fr': "Essayez la technique de respiration 4-7-8",
      'es': "Prueba la técnica de respiración 4-7-8",
      'it': "Prova la tecnica di respirazione 4-7-8",
      'pt': "Experimente a técnica de respiração 4-7-8",
      'ru': "Попробуйте дыхательную технику 4-7-8",
      'zh': "尝试4-7-8呼吸技巧",
      'ja': "4-7-8呼吸法を試してください",
      'ko': "4-7-8 호흡법을 시도해보세요",
      'hi': "4-7-8 सांस तकनीक आज़माएं",
      'ar': "جرب تقنية التنفس 4-7-8"
    };
    
    let suggestions = [breathingTechniques[preferredLanguage] || breathingTechniques['en']];
    
    // Age-appropriate suggestions by language
    const ageSuggestions = {
      'en': {
        young: ["Listen to calming music or nature sounds", "Try a quick meditation app session"],
        middle: ["Take a 10-minute break from what you're doing", "Try progressive muscle relaxation"],
        older: ["Take a peaceful walk in nature", "Practice gentle stretching or yoga"]
      },
      'nl': {
        young: ["Luister naar rustgevende muziek of natuurgeluiden", "Probeer een korte meditatie-app sessie"],
        middle: ["Neem een 10-minuten pauze van wat je aan het doen bent", "Probeer progressieve spierontspanning"],
        older: ["Maak een rustige wandeling in de natuur", "Oefen zachte stretching of yoga"]
      },
      'de': {
        young: ["Hören Sie beruhigende Musik oder Naturgeräusche", "Probieren Sie eine kurze Meditations-App-Sitzung"],
        middle: ["Machen Sie eine 10-minütige Pause von dem, was Sie tun", "Probieren Sie progressive Muskelentspannung"],
        older: ["Machen Sie einen ruhigen Spaziergang in der Natur", "Üben Sie sanfte Dehnungen oder Yoga"]
      },
      'fr': {
        young: ["Écoutez de la musique apaisante ou des sons de la nature", "Essayez une session rapide d'application de méditation"],
        middle: ["Prenez une pause de 10 minutes de ce que vous faites", "Essayez la relaxation musculaire progressive"],
        older: ["Faites une promenade paisible dans la nature", "Pratiquez des étirements doux ou du yoga"]
      },
      'es': {
        young: ["Escucha música relajante o sonidos de la naturaleza", "Prueba una sesión rápida de aplicación de meditación"],
        middle: ["Toma un descanso de 10 minutos de lo que estás haciendo", "Prueba la relajación muscular progresiva"],
        older: ["Da un paseo tranquilo en la naturaleza", "Practica estiramientos suaves o yoga"]
      },
      'it': {
        young: ["Ascolta musica rilassante o suoni della natura", "Prova una sessione rapida con un'app di meditazione"],
        middle: ["Prenditi una pausa di 10 minuti da quello che stai facendo", "Prova il rilassamento muscolare progressivo"],
        older: ["Fai una passeggiata tranquilla nella natura", "Pratica stretching dolce o yoga"]
      },
      'pt': {
        young: ["Ouça música relaxante ou sons da natureza", "Experimente uma sessão rápida de aplicativo de meditação"],
        middle: ["Faça uma pausa de 10 minutos do que está fazendo", "Experimente relaxamento muscular progressivo"],
        older: ["Faça uma caminhada tranquila na natureza", "Pratique alongamentos suaves ou yoga"]
      },
      'ru': {
        young: ["Слушайте успокаивающую музыку или звуки природы", "Попробуйте быструю сессию приложения для медитации"],
        middle: ["Сделайте 10-минутный перерыв от того, что делаете", "Попробуйте прогрессивную мышечную релаксацию"],
        older: ["Прогуляйтесь спокойно на природе", "Практикуйте легкую растяжку или йогу"]
      },
      'zh': {
        young: ["听平静的音乐或自然声音", "尝试快速冥想应用程序"],
        middle: ["从正在做的事情中休息10分钟", "尝试渐进性肌肉放松"],
        older: ["在大自然中平静地散步", "练习温和的拉伸或瑜伽"]
      },
      'ja': {
        young: ["落ち着いた音楽や自然音を聞く", "瞑想アプリで短いセッションを試す"],
        middle: ["今していることから10分休憩する", "漸進的筋弛緩法を試す"],
        older: ["自然の中で静かな散歩をする", "優しいストレッチやヨガを練習する"]
      },
      'ko': {
        young: ["차분한 음악이나 자연 소리를 들어보세요", "명상 앱에서 빠른 세션을 시도해보세요"],
        middle: ["하고 있는 일에서 10분간 휴식을 취하세요", "점진적 근육 이완법을 시도해보세요"],
        older: ["자연 속에서 평화로운 산책을 하세요", "부드러운 스트레칭이나 요가를 연습하세요"]
      },
      'hi': {
        young: ["शांत संगीत या प्राकृतिक ध्वनियां सुनें", "एक त्वरित मेडिटेशन ऐप सेशन आज़माएं"],
        middle: ["जो कुछ आप कर रहे हैं उससे 10 मिनट का ब्रेक लें", "प्रगतिशील मांसपेशी विश्राम आज़माएं"],
        older: ["प्रकृति में शांतिपूर्ण सैर करें", "हल्की स्ट्रेचिंग या योग का अभ्यास करें"]
      },
      'ar': {
        young: ["استمع إلى الموسيقى المهدئة أو أصوات الطبيعة", "جرب جلسة سريعة لتطبيق التأمل"],
        middle: ["خذ استراحة 10 دقائق من ما تفعله", "جرب استرخاء العضلات التدريجي"],
        older: ["خذ نزهة هادئة في الطبيعة", "مارس التمدد اللطيف أو اليوغا"]
      }
    };
    
    let ageCategory = 'middle';
    if (age && age < 25) ageCategory = 'young';
    else if (age && age >= 50) ageCategory = 'older';
    
    const langSuggestions = ageSuggestions[preferredLanguage] || ageSuggestions['en'];
    suggestions.push(...langSuggestions[ageCategory]);
    
    // Cultural adaptations by language
    const culturalSuggestions = {
      'en': {
        'netherlands': "Go for a bike ride or walk along water",
        'germany': "Spend time in a forest or green space (Waldeinsamkeit)"
      },
      'nl': {
        'netherlands': "Ga fietsen of wandelen langs het water",
        'germany': "Breng tijd door in een bos of groene ruimte"
      },
      'de': {
        'netherlands': "Machen Sie eine Radtour oder einen Spaziergang am Wasser",
        'germany': "Verbringen Sie Zeit in einem Wald oder Grünraum (Waldeinsamkeit)"
      },
      'fr': {
        'netherlands': "Faites du vélo ou marchez le long de l'eau",
        'germany': "Passez du temps dans une forêt ou un espace vert"
      },
      'es': {
        'netherlands': "Ve en bicicleta o camina junto al agua",
        'germany': "Pasa tiempo en un bosque o espacio verde"
      },
      'it': {
        'netherlands': "Vai in bicicletta o cammina lungo l'acqua",
        'germany': "Trascorri del tempo in una foresta o spazio verde"
      },
      'pt': {
        'netherlands': "Ande de bicicleta ou caminhe ao longo da água",
        'germany': "Passe tempo numa floresta ou espaço verde"
      },
      'ru': {
        'netherlands': "Покатайтесь на велосипеде или прогуляйтесь вдоль воды",
        'germany': "Проведите время в лесу или зеленом пространстве"
      },
      'zh': {
        'netherlands': "骑自行车或沿水边散步",
        'germany': "在森林或绿色空间中度过时光"
      },
      'ja': {
        'netherlands': "自転車に乗ったり、水辺を歩いたりする",
        'germany': "森林や緑地で時間を過ごす"
      },
      'ko': {
        'netherlands': "자전거를 타거나 물가를 산책하세요",
        'germany': "숲이나 녹지 공간에서 시간을 보내세요"
      },
      'hi': {
        'netherlands': "साइकिल चलाएं या पानी के किनारे टहलें",
        'germany': "जंगल या हरित स्थान में समय बिताएं"
      },
      'ar': {
        'netherlands': "اذهب لركوب الدراجة أو المشي بجوار الماء",
        'germany': "اقض وقتاً في الغابة أو المساحة الخضراء"
      }
    };
    
    if (['netherlands', 'nl', 'holland'].includes(country)) {
      const culturalLang = culturalSuggestions[preferredLanguage] || culturalSuggestions['en'];
      suggestions.push(culturalLang['netherlands']);
    } else if (['germany', 'de'].includes(country)) {
      const culturalLang = culturalSuggestions[preferredLanguage] || culturalSuggestions['en'];
      suggestions.push(culturalLang['germany']);
    }
    
    return suggestions;
  }

  getPersonalizedCravingSuggestions(user, addictions) {
    const age = user?.age || (user?.birthDate ? this.calculateAge(user.birthDate) : null);
    const addictionTypes = addictions.map(a => a.type);
    const preferredLanguage = user?.preferredLanguage || 'en';
    
    // Base "surf the urge" technique in multiple languages
    const baseTechniques = {
      'en': "Use the 'surf the urge' technique - cravings peak and subside",
      'nl': "Gebruik de 'surf de drang' techniek - cravings pieken en nemen af",
      'de': "Nutzen Sie die 'Verlangen überwinden' Technik - Verlangen erreicht seinen Höhepunkt und lässt nach",
      'fr': "Utilisez la technique 'surfer sur l'envie' - les envies atteignent un pic et diminuent",
      'es': "Usa la técnica 'surfear el impulso' - los antojos alcanzan su pico y disminuyen",
      'it': "Usa la tecnica 'cavalca il desiderio' - le voglie raggiungono il picco e diminuiscono",
      'pt': "Use a técnica 'surfar o impulso' - os desejos atingem o pico e diminuem",
      'ru': "Используйте технику 'проехать желание' - тяга достигает пика и спадает",
      'zh': "使用'冲浪渴望'技巧 - 渴望达到顶峰然后消退",
      'ja': "『欲求をサーフィンする』技法を使う - 渇望はピークに達し、その後和らぎます",
      'ko': "'갈망 타기' 기술을 사용하세요 - 갈망은 최고조에 달한 후 가라앉습니다",
      'hi': "'इच्छा पर सवार होना' तकनीक का उपयोग करें - लालसा चरम पर पहुंचती है और कम हो जाती है",
      'ar': "استخدم تقنية 'ركوب الرغبة' - الرغبة الشديدة تصل لذروتها ثم تهدأ"
    };
    
    let suggestions = [baseTechniques[preferredLanguage] || baseTechniques['en']];
    
    // Addiction-specific suggestions by language
    const addictionSuggestions = {
      'en': {
        smoking: ["Keep your hands busy with a stress ball", "Drink water slowly through a straw"],
        alcohol: ["Have a non-alcoholic substitute ready", "Remove yourself from triggering environments"],
        social_media: ["Put your phone in another room for 30 minutes", "Call a friend instead of scrolling"]
      },
      'nl': {
        smoking: ["Houd je handen bezig met een stressbal", "Drink langzaam water door een rietje"],
        alcohol: ["Houd een alcoholvrij alternatief bij de hand", "Ga weg uit triggerende omgevingen"],
        social_media: ["Leg je telefoon 30 minuten in een andere kamer", "Bel een vriend in plaats van scrollen"]
      },
      'de': {
        smoking: ["Beschäftigen Sie Ihre Hände mit einem Stressball", "Trinken Sie langsam Wasser durch einen Strohhalm"],
        alcohol: ["Halten Sie einen alkoholfreien Ersatz bereit", "Entfernen Sie sich aus auslösenden Umgebungen"],
        social_media: ["Legen Sie Ihr Handy 30 Minuten in einen anderen Raum", "Rufen Sie einen Freund an statt zu scrollen"]
      },
      'fr': {
        smoking: ["Occupez vos mains avec une balle anti-stress", "Buvez de l'eau lentement avec une paille"],
        alcohol: ["Ayez un substitut non-alcoolisé à portée", "Éloignez-vous des environnements déclencheurs"],
        social_media: ["Mettez votre téléphone dans une autre pièce pendant 30 minutes", "Appelez un ami au lieu de scroller"]
      },
      'es': {
        smoking: ["Mantén tus manos ocupadas con una pelota antiestrés", "Bebe agua lentamente con una pajita"],
        alcohol: ["Ten listo un sustituto sin alcohol", "Aléjate de entornos desencadenantes"],
        social_media: ["Pon tu teléfono en otra habitación por 30 minutos", "Llama a un amigo en lugar de hacer scroll"]
      },
      'it': {
        smoking: ["Tieni le mani occupate con una palla antistress", "Bevi acqua lentamente con una cannuccia"],
        alcohol: ["Tieni pronto un sostituto analcolico", "Allontanati dagli ambienti scatenanti"],
        social_media: ["Metti il telefono in un'altra stanza per 30 minuti", "Chiama un amico invece di scorrere"]
      },
      'pt': {
        smoking: ["Mantenha as mãos ocupadas com uma bola antistresse", "Beba água lentamente com um canudo"],
        alcohol: ["Tenha um substituto sem álcool preparado", "Afaste-se de ambientes desencadeadores"],
        social_media: ["Coloque o telefone noutra sala por 30 minutos", "Ligue para um amigo em vez de fazer scroll"]
      },
      'ru': {
        smoking: ["Займите руки антистрессовым мячиком", "Медленно пейте воду через соломинку"],
        alcohol: ["Подготовьте безалкогольную замену", "Удалитесь из провоцирующей обстановки"],
        social_media: ["Положите телефон в другую комнату на 30 минут", "Позвоните другу вместо скроллинга"]
      },
      'zh': {
        smoking: ["用减压球让手保持忙碌", "用吸管慢慢喝水"],
        alcohol: ["准备好无酒精替代品", "远离触发环境"],
        social_media: ["将手机放到另一个房间30分钟", "给朋友打电话而不是滑动屏幕"]
      },
      'ja': {
        smoking: ["ストレスボールで手を忙しく保つ", "ストローでゆっくりと水を飲む"],
        alcohol: ["ノンアルコールの代替品を用意する", "引き金となる環境から離れる"],
        social_media: ["30分間電話を別の部屋に置く", "スクロールの代わりに友人に電話する"]
      },
      'ko': {
        smoking: ["스트레스볼로 손을 바쁘게 유지하세요", "빨대로 천천히 물을 마셔보세요"],
        alcohol: ["무알코올 대체품을 준비하세요", "유발 환경에서 벗어나세요"],
        social_media: ["휴대폰을 30분간 다른 방에 두세요", "스크롤 대신 친구에게 전화하세요"]
      },
      'hi': {
        smoking: ["अपने हाथों को स्ट्रेस बॉल से व्यस्त रखें", "स्ट्रॉ से धीरे-धीरे पानी पिएं"],
        alcohol: ["एक नॉन-अल्कोहलिक विकल्प तैयार रखें", "ट्रिगर करने वाले वातावरण से दूर रहें"],
        social_media: ["अपना फोन 30 मिनट के लिए दूसरे कमरे में रखें", "स्क्रॉल करने के बजाय किसी दोस्त को कॉल करें"]
      },
      'ar': {
        smoking: ["اشغل يديك بكرة الضغط", "اشرب الماء ببطء من خلال المصاصة"],
        alcohol: ["احتفظ ببديل غير كحولي جاهز", "ابتعد عن البيئات المحفزة"],
        social_media: ["ضع هاتفك في غرفة أخرى لمدة 30 دقيقة", "اتصل بصديق بدلاً من التمرير"]
      }
    };
    
    // Add addiction-specific suggestions
    if (addictionTypes.includes('smoking')) {
      const smokingSuggestions = addictionSuggestions[preferredLanguage]?.smoking || addictionSuggestions['en'].smoking;
      suggestions.push(...smokingSuggestions);
    } else if (addictionTypes.includes('alcohol')) {
      const alcoholSuggestions = addictionSuggestions[preferredLanguage]?.alcohol || addictionSuggestions['en'].alcohol;
      suggestions.push(...alcoholSuggestions);
    } else if (addictionTypes.includes('social_media')) {
      const socialMediaSuggestions = addictionSuggestions[preferredLanguage]?.social_media || addictionSuggestions['en'].social_media;
      suggestions.push(...socialMediaSuggestions);
    }
    
    // Age-appropriate support suggestions by language
    const supportSuggestions = {
      'en': {
        young: "Text a trusted friend for support",
        older: "Call someone from your support network"
      },
      'nl': {
        young: "Stuur een betrouwbare vriend een bericht voor steun",
        older: "Bel iemand uit je steunnetwerk"
      },
      'de': {
        young: "Schreiben Sie einem vertrauenswürdigen Freund für Unterstützung",
        older: "Rufen Sie jemanden aus Ihrem Unterstützungsnetzwerk an"
      },
      'fr': {
        young: "Envoyez un message à un ami de confiance pour du soutien",
        older: "Appelez quelqu'un de votre réseau de soutien"
      },
      'es': {
        young: "Envía un mensaje a un amigo de confianza para apoyo",
        older: "Llama a alguien de tu red de apoyo"
      },
      'it': {
        young: "Manda un messaggio a un amico fidato per supporto",
        older: "Chiama qualcuno dalla tua rete di supporto"
      },
      'pt': {
        young: "Envie uma mensagem para um amigo de confiança para apoio",
        older: "Ligue para alguém da sua rede de apoio"
      },
      'ru': {
        young: "Напишите доверенному другу для поддержки",
        older: "Позвоните кому-то из вашей сети поддержки"
      },
      'zh': {
        young: "给值得信任的朋友发消息寻求支持",
        older: "给你的支持网络中的某人打电话"
      },
      'ja': {
        young: "信頼できる友人にサポートのためのメッセージを送る",
        older: "サポートネットワークの誰かに電話する"
      },
      'ko': {
        young: "지원을 위해 신뢰할 수 있는 친구에게 문자를 보내세요",
        older: "지원 네트워크에서 누군가에게 전화하세요"
      },
      'hi': {
        young: "सहायता के लिए किसी विश्वसनीय दोस्त को मैसेज करें",
        older: "अपने सहायता नेटवर्क से किसी को कॉल करें"
      },
      'ar': {
        young: "أرسل رسالة لصديق موثوق للحصول على الدعم",
        older: "اتصل بشخص من شبكة الدعم الخاصة بك"
      }
    };
    
    const ageCategory = (age && age < 30) ? 'young' : 'older';
    const supportSuggestion = supportSuggestions[preferredLanguage]?.[ageCategory] || 
                             supportSuggestions['en'][ageCategory];
    suggestions.push(supportSuggestion);
    
    return suggestions;
  }

  getPersonalizedSocialSuggestions(user, addictions) {
    const age = user?.age || (user?.birthDate ? this.calculateAge(user.birthDate) : null);
    const hasEmergencyContacts = user?.emergencyContacts?.length > 0;
    const preferredLanguage = user?.preferredLanguage || 'en';
    
    let suggestions = [];
    
    // Emergency contact suggestions in multiple languages
    if (hasEmergencyContacts) {
      const emergencyMessages = {
        'en': "Reach out to one of your emergency contacts",
        'nl': "Neem contact op met een van je noodcontacten",
        'de': "Kontaktieren Sie einen Ihrer Notfallkontakte",
        'fr': "Contactez un de vos contacts d'urgence",
        'es': "Comunícate con uno de tus contactos de emergencia",
        'it': "Contatta uno dei tuoi contatti di emergenza",
        'pt': "Entre em contato com um dos seus contatos de emergência",
        'ru': "Обратитесь к одному из ваших экстренных контактов",
        'zh': "联系您的紧急联系人之一",
        'ja': "緊急連絡先の一人に連絡してください",
        'ko': "긴급 연락처 중 한 명에게 연락하세요",
        'hi': "अपने आपातकालीन संपर्कों में से किसी एक से संपर्क करें",
        'ar': "تواصل مع أحد جهات الاتصال الطارئة"
      };
      suggestions.push(emergencyMessages[preferredLanguage] || emergencyMessages['en']);
    }
    
    // Age-appropriate social suggestions by language
    const socialSuggestions = {
      'en': {
        young: ["Join an online support group or chat", "Watch a comfort movie or show"],
        middle: ["Call a family member or friend", "Join a local community activity"],
        older: ["Visit with a neighbor or friend", "Attend a community group or service"]
      },
      'nl': {
        young: ["Doe mee aan een online steungroep", "Kijk een troostfilm of serie"],
        middle: ["Bel een familielid of vriend", "Doe mee aan een lokale activiteit"],
        older: ["Bezoek een buur of vriend", "Ga naar een gemeenschapsgroep"]
      },
      'de': {
        young: ["Treten Sie einer Online-Selbsthilfegruppe bei", "Schauen Sie einen Trostfilm"],
        middle: ["Rufen Sie ein Familienmitglied oder einen Freund an", "Nehmen Sie an einer lokalen Aktivität teil"],
        older: ["Besuchen Sie einen Nachbarn oder Freund", "Gehen Sie zu einer Gemeindeveranstaltung"]
      },
      'fr': {
        young: ["Rejoignez un groupe de soutien en ligne", "Regardez un film ou une série réconfortante"],
        middle: ["Appelez un membre de la famille ou un ami", "Participez à une activité communautaire"],
        older: ["Rendez visite à un voisin ou un ami", "Participez à un groupe communautaire"]
      },
      'es': {
        young: ["Únete a un grupo de apoyo en línea", "Ve una película o serie reconfortante"],
        middle: ["Llama a un familiar o amigo", "Participa en una actividad comunitaria"],
        older: ["Visita a un vecino o amigo", "Asiste a un grupo comunitario"]
      },
      'it': {
        young: ["Unisciti a un gruppo di supporto online", "Guarda un film o una serie consolante"],
        middle: ["Chiama un familiare o un amico", "Partecipa a un'attività comunitaria"],
        older: ["Visita un vicino o un amico", "Partecipa a un gruppo comunitario"]
      },
      'pt': {
        young: ["Junte-se a um grupo de apoio online", "Assista a um filme ou série reconfortante"],
        middle: ["Ligue para um familiar ou amigo", "Participe numa atividade comunitária"],
        older: ["Visite um vizinho ou amigo", "Participe num grupo comunitário"]
      },
      'ru': {
        young: ["Присоединитесь к онлайн-группе поддержки", "Посмотрите утешительный фильм или сериал"],
        middle: ["Позвоните члену семьи или другу", "Присоединитесь к местной активности"],
        older: ["Навестите соседа или друга", "Посетите общественную группу"]
      },
      'zh': {
        young: ["加入在线支持小组", "看一部安慰的电影或电视剧"],
        middle: ["给家人或朋友打电话", "参加当地社区活动"],
        older: ["拜访邻居或朋友", "参加社区团体活动"]
      },
      'ja': {
        young: ["オンラインサポートグループに参加", "心を癒す映画やドラマを観る"],
        middle: ["家族や友人に電話する", "地域のコミュニティ活動に参加"],
        older: ["近所の人や友人を訪ねる", "地域グループに参加する"]
      },
      'ko': {
        young: ["온라인 지원 그룹에 참여하세요", "위안이 되는 영화나 드라마를 시청하세요"],
        middle: ["가족이나 친구에게 전화하세요", "지역 커뮤니티 활동에 참여하세요"],
        older: ["이웃이나 친구를 방문하세요", "지역 단체에 참석하세요"]
      },
      'hi': {
        young: ["ऑनलाइन सहायता समूह में शामिल हों", "आरामदायक फिल्म या शो देखें"],
        middle: ["परिवार या दोस्त को कॉल करें", "स्थानीय सामुदायिक गतिविधि में भाग लें"],
        older: ["पड़ोसी या दोस्त से मिलें", "सामुदायिक समूह में भाग लें"]
      },
      'ar': {
        young: ["انضم إلى مجموعة دعم عبر الإنترنت", "شاهد فيلماً أو مسلسلاً مريحاً"],
        middle: ["اتصل بأحد أفراد العائلة أو الأصدقاء", "شارك في نشاط مجتمعي محلي"],
        older: ["زر جاراً أو صديقاً", "احضر مجموعة مجتمعية"]
      }
    };
    
    let ageCategory = 'middle';
    if (age && age < 25) ageCategory = 'young';
    else if (age && age >= 50) ageCategory = 'older';
    
    const langSuggestions = socialSuggestions[preferredLanguage] || socialSuggestions['en'];
    suggestions.push(...langSuggestions[ageCategory]);
    
    // Reminder message in multiple languages
    const reminderMessages = {
      'en': "Remember: this feeling is temporary",
      'nl': "Onthoud: dit gevoel is tijdelijk",
      'de': "Denken Sie daran: Dieses Gefühl ist vorübergehend",
      'fr': "Rappelez-vous: ce sentiment est temporaire",
      'es': "Recuerda: este sentimiento es temporal",
      'it': "Ricorda: questa sensazione è temporanea",
      'pt': "Lembre-se: este sentimento é temporário",
      'ru': "Помните: это чувство временно",
      'zh': "请记住：这种感觉是暂时的",
      'ja': "覚えておいてください：この気持ちは一時的なものです",
      'ko': "기억하세요: 이 감정은 일시적입니다",
      'hi': "याद रखें: यह भावना अस्थायी है",
      'ar': "تذكر: هذا الشعور مؤقت"
    };
    
    suggestions.push(reminderMessages[preferredLanguage] || reminderMessages['en']);
    
    return suggestions;
  }

  getPersonalizedGeneralSuggestions(user, addictions) {
    const age = user?.age || (user?.birthDate ? this.calculateAge(user.birthDate) : null);
    const preferredLanguage = user?.preferredLanguage || 'en';
    
    // Multilingual base suggestions
    const baseSuggestions = {
      'en': ["Tell me more about how you're feeling", "How can I support you right now?"],
      'nl': ["Vertel me meer over hoe je je voelt", "Laten we dit samen bespreken"],
      'de': ["Erzählen Sie mir mehr über Ihre Gefühle", "Wie kann ich Ihnen helfen?"],
      'fr': ["Dites-moi comment vous vous sentez", "Comment puis-je vous aider?"],
      'es': ["Cuéntame cómo te sientes", "¿Cómo puedo apoyarte ahora?"],
      'it': ["Dimmi come ti senti", "Come posso aiutarti adesso?"],
      'pt': ["Conte-me como se sente", "Como posso apoiá-lo agora?"],
      'ru': ["Расскажите, как вы себя чувствуете", "Как я могу вас поддержать?"],
      'zh': ["告诉我你的感受", "我现在如何帮助你？"],
      'ja': ["お気持ちを聞かせてください", "今どのようにサポートできますか？"],
      'ko': ["기분이 어떤지 알려주세요", "지금 어떻게 도와드릴까요？"],
      'hi': ["मुझे बताएं कि आप कैसा महसूस कर रहे हैं", "मैं अब आपकी कैसे सहायता कर सकता हूँ？"],
      'ar': ["أخبرني كيف تشعر", "كيف يمكنني دعمك الآن؟"]
    };
    
    let suggestions = baseSuggestions[preferredLanguage] || baseSuggestions['en'];
    suggestions = [...suggestions]; // Create copy
    
    // Age-appropriate suggestions by language
    const ageSuggestions = {
      'en': {
        young: "What's been on your mind lately?",
        mature: "What would be most helpful for you today?"
      },
      'nl': {
        young: "Wat houdt je de laatste tijd bezig?",
        mature: "Wat zou vandaag het meest behulpzaam zijn?"
      },
      'de': {
        young: "Was beschäftigt Sie in letzter Zeit?",
        mature: "Was wäre heute am hilfreichsten für Sie?"
      },
      'fr': {
        young: "Qu'est-ce qui vous préoccupe dernièrement?",
        mature: "Qu'est-ce qui vous aiderait le plus aujourd'hui?"
      },
      'es': {
        young: "¿Qué te ha estado preocupando últimamente?",
        mature: "¿Qué sería más útil para ti hoy?"
      },
      'it': {
        young: "Cosa ti preoccupa ultimamente?",
        mature: "Cosa ti sarebbe più utile oggi?"
      },
      'pt': {
        young: "O que tem estado na sua mente ultimamente?",
        mature: "O que seria mais útil para si hoje?"
      },
      'ru': {
        young: "Что вас беспокоит в последнее время?",
        mature: "Что было бы наиболее полезно для вас сегодня?"
      },
      'zh': {
        young: "最近什么事情让你担心？",
        mature: "今天什么对你最有帮助？"
      },
      'ja': {
        young: "最近何が気になっていますか？",
        mature: "今日は何が最も役に立ちますか？"
      },
      'ko': {
        young: "최근에 무엇이 마음에 걸리나요？",
        mature: "오늘 무엇이 가장 도움이 될까요？"
      },
      'hi': {
        young: "हाल ही में आपको क्या परेशान कर रहा है？",
        mature: "आज आपके लिए सबसे मददगार क्या होगा？"
      },
      'ar': {
        young: "ما الذي يشغل بالك مؤخرًا؟",
        mature: "ما الذي سيكون الأكثر فائدة لك اليوم؟"
      }
    };
    
    const ageCategory = (age && age < 30) ? 'young' : 'mature';
    const ageSuggestion = ageSuggestions[preferredLanguage]?.[ageCategory] || 
                         ageSuggestions['en'][ageCategory];
    
    suggestions.push(ageSuggestion);
    
    return suggestions;
  }

  /**
   * Analyze mood from journal entry text using AI
   */
  async analyzeMoodFromText(text, userId = null, language = 'en') {
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
      
      // Calculate text metrics for enhanced analysis
      const textMetrics = {
        length: text.length,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
        avgWordsPerSentence: 0,
        exclamationCount: (text.match(/!/g) || []).length,
        questionCount: (text.match(/\?/g) || []).length,
        ellipsisCount: (text.match(/\.\.\./g) || []).length,
        capitalRatio: text.replace(/\s/g, '').length > 0 ? (text.match(/[A-Z]/g) || []).length / text.replace(/\s/g, '').length : 0,
        hasTimeReference: /\b(morning|afternoon|evening|night|today|yesterday|tomorrow|vandaag|gisteren|morgen|ochtend|middag|avond|nacht|vanmorgen|vanavond)\b/i.test(text),
        hasSocialContext: /\b(friend|family|people|alone|together|vrienden|familie|mensen|alleen|samen|together|with|met)\b/i.test(text),
        hasWorkContext: /\b(work|job|boss|colleague|project|meeting|werk|baan|baas|collega|vergadering|klus)\b/i.test(text)
      };
      
      if (textMetrics.sentenceCount > 0) {
        textMetrics.avgWordsPerSentence = textMetrics.wordCount / textMetrics.sentenceCount;
      }

      // Optimized mood detection prompt for OpenAI GPT-4o
      const prompt = `You are an expert emotional intelligence analyst specializing in multilingual mood detection.

ANALYZE THIS JOURNAL TEXT:
"${text}"

USER CONTEXT: ${userContextInfo}

DETECT MOOD WITH PRECISION:
        
        TEXT METRICS:
        - Word count: ${textMetrics.wordCount}
        - Sentence count: ${textMetrics.sentenceCount}
        - Avg words per sentence: ${textMetrics.avgWordsPerSentence.toFixed(1)}
        - Exclamations: ${textMetrics.exclamationCount}
        - Questions: ${textMetrics.questionCount}
        - Ellipses: ${textMetrics.ellipsisCount}
        - Capital letter ratio: ${(textMetrics.capitalRatio * 100).toFixed(1)}%
        - Contains time references: ${textMetrics.hasTimeReference}
        - Contains social context: ${textMetrics.hasSocialContext}
        - Contains work context: ${textMetrics.hasWorkContext}
        
        ADVANCED ANALYSIS FRAMEWORK:
        
        1. EMOTIONAL LAYERS ANALYSIS:
           - SURFACE EMOTIONS: Direct emotional expressions and obvious mood words
           - UNDERLYING EMOTIONS: Implied feelings through context and subtext
           - MASKED EMOTIONS: Hidden emotions behind neutral language or deflection
           - EMERGING EMOTIONS: Emotional shifts or transitions within the text
        
        2. LINGUISTIC PSYCHOLOGY INDICATORS:
           - Short sentences (< 8 words) = stress, urgency, or emotional overwhelm
           - Long sentences (> 15 words) = reflection, processing, or explanation
           - Repetitive words/phrases = emotional emphasis or rumination
           - Negation patterns = avoidance, denial, or internal conflict
           - Future vs past tense = hope/anxiety vs regret/nostalgia
        
        3. CULTURAL & MULTILINGUAL SENSITIVITY:
           - Dutch: Reserved expression, understatement culture ("niet zo slecht" = actually good)
           - English: Direct emotional expression, varied intensity markers
           - German: Structured emotional expression, compound descriptive words
           - Romance languages: Expressive, metaphorical emotional language
           - Consider cultural context of emotional expression norms
        
        4. CONTEXTUAL EMOTIONAL INTELLIGENCE:
           - Life domains: work, relationships, health, personal growth, spirituality
           - Temporal context: time of day/week/season mentioned
           - Social dynamics: interaction patterns, isolation indicators
           - Achievement/failure mentions: success euphoria, disappointment processing
           - Physical state references: energy, fatigue, health impacts on mood
        
        5. ADVANCED PATTERN RECOGNITION:
           - Emotional contradiction indicators ("fine but...", "okay I guess")
           - Projection patterns (describing others' emotions while avoiding own)
           - Coping mechanism mentions (humor, distraction, avoidance)
           - Growth mindset vs fixed mindset language patterns
           - Self-compassion vs self-criticism indicators
        
        6. NUANCED MOOD COMBINATIONS:
           - Anxious-excited (anticipation with nervousness)
           - Sad-grateful (loss with appreciation)
           - Angry-hurt (frustration masking pain)
           - Happy-guilty (joy with self-judgment)
           - Peaceful-lonely (contentment with isolation)
        
        RESPONSE FORMAT (EXACT JSON):
        {
          "primaryMood": "happy|calm|peaceful|grateful|reflective|energetic|stressed|anxious|sad|angry|frustrated|confused|lonely|mixed|neutral",
          "moodScore": number_1_to_10,
          "confidence": number_0_to_1,
          "emotionalIndicators": ["max 5 specific phrases/words from text"],
          "overallSentiment": "positive|neutral|negative|mixed",
          "emotionalIntensity": number_1_to_5,
          "moodDescription": "Compassionate 2-3 sentence description in ${language === 'en' ? 'English' : language === 'nl' ? 'Dutch' : language === 'de' ? 'German' : language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : language === 'it' ? 'Italian' : language === 'ja' ? 'Japanese' : language === 'ko' ? 'Korean' : language === 'pt' ? 'Portuguese' : language === 'ru' ? 'Russian' : language === 'zh' ? 'Chinese' : language === 'ar' ? 'Arabic' : language === 'hi' ? 'Hindi' : 'English'}",
          "detectedMoods": [
            {
              "mood": "mood_name",
              "score": number_1_to_10,
              "strength": number_0_to_5,
              "keywords": ["max 3 actual words from text"],
              "layerType": "surface|underlying|masked|emerging"
            }
          ],
          "moodCount": number_of_detected_moods,
          "emotionalTransition": "stable|improving|declining|fluctuating",
          "suggestedFocus": "Specific wellbeing suggestion in ${language === 'en' ? 'English' : language === 'nl' ? 'Dutch' : language === 'de' ? 'German' : language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : language === 'it' ? 'Italian' : language === 'ja' ? 'Japanese' : language === 'ko' ? 'Korean' : language === 'pt' ? 'Portuguese' : language === 'ru' ? 'Russian' : language === 'zh' ? 'Chinese' : language === 'ar' ? 'Arabic' : language === 'hi' ? 'Hindi' : 'English'}",
          "culturalContext": "Brief note on cultural expression patterns if relevant",
          "emotionalComplexity": number_1_to_5,
          "predominantTheme": "work|relationships|health|personal_growth|daily_life|crisis|celebration|transition"
        }
        
        ENHANCED RULES:
        - Use linguistic psychology to detect hidden emotions
        - Weight surface vs underlying emotions appropriately  
        - Consider cultural expression norms for confidence scoring
        - Identify emotional masking patterns ("I'm fine" when clearly not)
        - Detect mixed emotions and emotional transitions accurately
        - Score confidence higher when multiple indicators align
        - For very short text (< 20 words), focus on tone and word choice
        - For longer text (> 100 words), analyze emotional arc and themes
        - Always provide actionable, compassionate wellbeing suggestions
        - Be especially sensitive to crisis indicators or breakthrough moments
      `;
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const response = result.choices[0].message;
      const text_response = response.content;
      
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
        
        console.log('Cleaned OpenAI response for mood analysis:', cleanedText);
        
        const moodAnalysis = JSON.parse(cleanedText);
        
        // Validate the response has required fields
        if (!moodAnalysis.primaryMood || !moodAnalysis.moodScore) {
          throw new Error('Invalid mood analysis response');
        }
        
        // Enhanced mood mapping to fix various mood names to our valid enum values
        const moodMapping = {
          // Happy variations
          'happiness': 'happy',
          'joy': 'happy',
          'joyful': 'happy',
          'cheerful': 'happy',
          'delighted': 'happy',
          'pleased': 'happy',
          'content': 'happy',
          'satisfied': 'happy',
          'blissful': 'happy',
          'elated': 'happy',
          'upbeat': 'happy',
          
          // Calm variations
          'calm': 'calm',
          'relaxed': 'calm',
          'serene': 'calm',
          'tranquil': 'calm',
          'composed': 'calm',
          'centered': 'calm',
          'balanced': 'calm',
          
          // Peaceful variations
          'peace': 'peaceful',
          'peaceful': 'peaceful',
          'tranquility': 'peaceful',
          'contentment': 'peaceful',
          'harmony': 'peaceful',
          'serenity': 'peaceful',
          
          // Grateful variations
          'gratefulness': 'grateful',
          'gratitude': 'grateful',
          'thankful': 'grateful',
          'thankfulness': 'grateful',
          'appreciative': 'grateful',
          'blessed': 'grateful',
          
          // Reflective variations
          'reflection': 'reflective',
          'reflective': 'reflective',
          'contemplative': 'reflective',
          'contemplation': 'reflective',
          'thoughtful': 'reflective',
          'pensive': 'reflective',
          'introspective': 'reflective',
          
          // Energetic variations
          'energy': 'energetic',
          'energetic': 'energetic',
          'excitement': 'energetic',
          'excited': 'energetic',
          'enthusiastic': 'energetic',
          'vitality': 'energetic',
          'dynamic': 'energetic',
          'motivated': 'energetic',
          'inspired': 'energetic',
          
          // Stressed variations
          'stress': 'stressed',
          'stressed': 'stressed',
          'tension': 'stressed',
          'tense': 'stressed',
          'pressure': 'stressed',
          'overwhelmed': 'stressed',
          'strained': 'stressed',
          'burden': 'stressed',
          
          // Anxious variations
          'anxiety': 'anxious',
          'anxious': 'anxious',
          'worried': 'anxious',
          'worry': 'anxious',
          'fear': 'anxious',
          'fearful': 'anxious',
          'nervous': 'anxious',
          'uneasy': 'anxious',
          'apprehensive': 'anxious',
          'restless': 'anxious',
          
          // Sad variations
          'sadness': 'sad',
          'sad': 'sad',
          'sorrow': 'sad',
          'melancholy': 'sad',
          'depressed': 'sad',
          'depression': 'sad',
          'down': 'sad',
          'unhappy': 'sad',
          'miserable': 'sad',
          'gloomy': 'sad',
          'dejected': 'sad',
          
          // Angry variations
          'anger': 'angry',
          'angry': 'angry',
          'rage': 'angry',
          'furious': 'angry',
          'irritated': 'angry',
          'annoyed': 'angry',
          'mad': 'angry',
          'hostile': 'angry',
          'resentful': 'angry',
          
          // Frustrated variations
          'frustration': 'frustrated',
          'frustrated': 'frustrated',
          'irritation': 'frustrated',
          'exasperated': 'frustrated',
          'annoyed': 'frustrated',
          'impatient': 'frustrated',
          
          // Confused variations
          'confusion': 'confused',
          'confused': 'confused',
          'uncertain': 'confused',
          'unclear': 'confused',
          'puzzled': 'confused',
          'perplexed': 'confused',
          'bewildered': 'confused',
          'lost': 'confused',
          
          // Lonely variations
          'loneliness': 'lonely',
          'lonely': 'lonely',
          'alone': 'lonely',
          'isolated': 'lonely',
          'solitary': 'lonely',
          'disconnected': 'lonely',
          'abandoned': 'lonely',
          
          // Mixed/Neutral variations
          'mixed': 'mixed',
          'neutral': 'neutral',
          'indifferent': 'neutral',
          'ambivalent': 'mixed',
          'conflicted': 'mixed',
          'uncertain': 'mixed'
        };

        // Function to normalize mood names
        const normalizeMood = (mood) => {
          if (!mood) return 'reflective';
          const lowerMood = mood.toLowerCase();
          return moodMapping[lowerMood] || lowerMood;
        };

        // Fix primaryMood if it's invalid
        const validMoods = ['happy', 'calm', 'stressed', 'anxious', 'energetic', 'peaceful', 'grateful', 'reflective', 'sad', 'angry', 'frustrated', 'confused', 'lonely', 'mixed', 'neutral'];
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
          }))
          .filter(detectedMood => validMoods.includes(detectedMood.mood)) // Remove invalid moods
          .sort((a, b) => (b.strength || 0) - (a.strength || 0)) // Sort by strength descending
          .slice(0, 5); // Limit to maximum 5 moods
        }
        
        // Ensure mood score is between 1-10
        moodAnalysis.moodScore = Math.max(1, Math.min(10, moodAnalysis.moodScore));
        
        // Add emotional intensity if missing (for backward compatibility)
        if (!moodAnalysis.emotionalIntensity) {
          // Calculate from mood score (1-10 -> 1-5 scale)
          moodAnalysis.emotionalIntensity = Math.ceil(moodAnalysis.moodScore / 2);
        }
        
        // Add emotional transition if missing
        if (!moodAnalysis.emotionalTransition) {
          moodAnalysis.emotionalTransition = 'stable';
        }
        
        // Add new fields if missing (backward compatibility)
        if (!moodAnalysis.culturalContext) {
          moodAnalysis.culturalContext = null;
        }
        
        if (!moodAnalysis.emotionalComplexity) {
          // Calculate complexity based on number of detected moods and mixed emotions
          const numMoods = (moodAnalysis.detectedMoods && moodAnalysis.detectedMoods.length) || 1;
          const hasMixed = moodAnalysis.primaryMood === 'mixed' || moodAnalysis.overallSentiment === 'mixed';
          moodAnalysis.emotionalComplexity = Math.min(5, Math.max(1, numMoods + (hasMixed ? 1 : 0)));
        }
        
        if (!moodAnalysis.predominantTheme) {
          // Auto-detect theme based on text metrics calculated earlier
          if (textMetrics.hasWorkContext) {
            moodAnalysis.predominantTheme = 'work';
          } else if (textMetrics.hasSocialContext) {
            moodAnalysis.predominantTheme = 'relationships';
          } else {
            moodAnalysis.predominantTheme = 'daily_life';
          }
        }
        
        // Enhanced confidence calculation based on multiple sophisticated factors
        if (moodAnalysis.confidence) {
          const factors = [];
          
          // Factor 1: Text length and detail (more content = more context)
          if (textMetrics.wordCount > 50) factors.push(0.08);
          if (textMetrics.wordCount > 100) factors.push(0.07);
          
          // Factor 2: Multiple emotional indicators align
          if (moodAnalysis.emotionalIndicators && moodAnalysis.emotionalIndicators.length > 2) {
            factors.push(0.1);
          }
          
          // Factor 3: Multiple moods detected with consistent theme
          if (moodAnalysis.detectedMoods && moodAnalysis.detectedMoods.length > 1) {
            factors.push(0.08);
          }
          
          // Factor 4: Punctuation patterns support mood assessment
          if (textMetrics.exclamationCount > 0 && ['happy', 'angry', 'excited', 'energetic'].includes(moodAnalysis.primaryMood)) {
            factors.push(0.06);
          }
          if (textMetrics.ellipsisCount > 0 && ['sad', 'confused', 'anxious', 'lonely'].includes(moodAnalysis.primaryMood)) {
            factors.push(0.06);
          }
          
          // Factor 5: Sentence structure aligns with detected mood
          if (textMetrics.avgWordsPerSentence < 8 && ['stressed', 'angry', 'anxious'].includes(moodAnalysis.primaryMood)) {
            factors.push(0.05);
          }
          if (textMetrics.avgWordsPerSentence > 12 && ['reflective', 'peaceful', 'grateful'].includes(moodAnalysis.primaryMood)) {
            factors.push(0.05);
          }
          
          // Factor 6: Cultural context awareness
          if (moodAnalysis.culturalContext && moodAnalysis.culturalContext !== null) {
            factors.push(0.04);
          }
          
          // Apply confidence boost
          const boost = factors.reduce((sum, factor) => sum + factor, 0);
          moodAnalysis.confidence = Math.min(1, moodAnalysis.confidence + boost);
          
          // Ensure minimum confidence for very short texts
          if (textMetrics.wordCount < 10 && moodAnalysis.confidence < 0.3) {
            moodAnalysis.confidence = 0.3;
          }
        }
        
        // Add layerType to existing detectedMoods if missing
        if (moodAnalysis.detectedMoods) {
          moodAnalysis.detectedMoods.forEach(mood => {
            if (!mood.layerType) {
              mood.layerType = 'surface'; // Default for backward compatibility
            }
          });
        }
        
        console.log('Successfully parsed mood analysis:', moodAnalysis);
        return moodAnalysis;
        
      } catch (parseError) {
        console.error('Error parsing mood analysis:', parseError);
        console.error('Raw OpenAI GPT-4o response was:', text_response);
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
    
    // Calculate the same text metrics as in the main analysis
    const textMetrics = {
      length: text.length,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
      avgWordsPerSentence: 0,
      exclamationCount: (text.match(/!/g) || []).length,
      questionCount: (text.match(/\?/g) || []).length,
      ellipsisCount: (text.match(/\.\.\./g) || []).length,
      capitalRatio: text.replace(/\s/g, '').length > 0 ? (text.match(/[A-Z]/g) || []).length / text.replace(/\s/g, '').length : 0,
      hasTimeReference: /\b(morning|afternoon|evening|night|today|yesterday|tomorrow|vandaag|gisteren|morgen|ochtend|middag|avond|nacht|vanmorgen|vanavond)\b/i.test(text),
      hasSocialContext: /\b(friend|family|people|alone|together|vrienden|familie|mensen|alleen|samen|together|with|met)\b/i.test(text),
      hasWorkContext: /\b(work|job|boss|colleague|project|meeting|werk|baan|baas|collega|vergadering|klus)\b/i.test(text)
    };
    
    if (textMetrics.sentenceCount > 0) {
      textMetrics.avgWordsPerSentence = textMetrics.wordCount / textMetrics.sentenceCount;
    }
    
    // Enhanced mood detection with linguistic psychology patterns
    const emotionalPatterns = {
      // Masked emotions patterns
      maskedPositive: /\b(not bad|could be worse|niet slecht|kan erger|ça va|va bene|não está mal)\b/i,
      maskedNegative: /\b(fine|okay|whatever|meh|prima|bien|okay|bene|tudo bem|het gaat)\b/i,
      
      // Intensifiers and diminishers
      intensifiers: /\b(very|really|extremely|super|heel|erg|très|molto|muy|really|zo|such|incredibly|absolutely)\b/gi,
      diminishers: /\b(kind of|sort of|a bit|little|soort van|een beetje|un peu|un po|un poco|algo)\b/gi,
      
      // Temporal emotional indicators
      pastRegret: /\b(wish|regret|should have|if only|als ik maar|had ik maar|si seulement|se solo|ojalá)\b/i,
      futureAnxiety: /\b(worried about|afraid|nervous|hope|bang voor|ongerust|peur|preoccupato|preocupado)\b/i,
      
      // Social connection indicators
      isolation: /\b(alone|lonely|nobody|no one|niemand|alleen|seul|solo|sozinho|eenzaam)\b/i,
      connection: /\b(together|with|friends|family|samen|avec|con|com|vrienden|familie)\b/i,
      
      // Achievement/failure indicators
      success: /\b(proud|accomplished|achieved|succeeded|trots|bereikt|gelukt|fier|orgulloso|orgoglioso)\b/i,
      failure: /\b(failed|disappointed|let down|teleurgesteld|gefaald|échoué|fallito|fracasado)\b/i
    };
    
    // Define enhanced mood keywords with cultural variations and context
    const moodKeywords = {
      happy: [
        // English
        'happy', 'joy', 'excited', 'great', 'amazing', 'wonderful', 'fantastic', 'good', 'positive',
        'pleased', 'delighted', 'cheerful', 'glad', 'thrilled', 'ecstatic', 'elated', 'content',
        // Dutch - Extended
        'blij', 'vrolijk', 'gelukkig', 'opgewekt', 'enthousiast', 'geweldig', 'fantastisch', 'goed', 'positief',
        'tevreden', 'opgetogen', 'verheugd', 'uitgelaten', 'dolblij', 'super', 'top', 'fijn', 'heerlijk',
        'plezier', 'vreugde', 'lachen', 'glimlach', 'feest', 'geniet', 'geluk',
        // German
        'glücklich', 'fröhlich', 'aufgeregt', 'großartig', 'wunderbar', 'fantastisch', 'gut', 'positiv',
        'froh', 'erfreut', 'begeistert', 'toll', 'prima', 'super',
        // French
        'heureux', 'joie', 'excité', 'formidable', 'merveilleux', 'fantastique', 'bon', 'positif',
        'content', 'ravi', 'enchanté', 'super', 'génial',
        // Spanish
        'feliz', 'alegre', 'emocionado', 'genial', 'maravilloso', 'fantástico', 'bueno', 'positivo',
        'contento', 'dichoso', 'encantado', 'estupendo',
        // Italian
        'felice', 'gioia', 'eccitato', 'grande', 'meraviglioso', 'fantastico', 'buono', 'positivo',
        'contento', 'allegro', 'entusiasta',
        // Portuguese
        'feliz', 'alegre', 'animado', 'ótimo', 'maravilhoso', 'fantástico', 'bom', 'positivo',
        'contente', 'radiante', 'empolgado'
      ],
      sad: [
        // English
        'sad', 'down', 'depressed', 'hurt', 'disappointed', 'low', 'terrible', 'awful', 'bad',
        'unhappy', 'miserable', 'sorrowful', 'heartbroken', 'blue', 'gloomy', 'melancholy',
        // Dutch - Extended
        'verdrietig', 'down', 'depressief', 'gekwetst', 'teleurgesteld', 'laag', 'verschrikkelijk', 'slecht', 'neerslachtig',
        'bedroefd', 'somber', 'droevig', 'zwaarmoedig', 'ellendig', 'moedeloos', 'terneergeslagen', 'triest',
        'huilen', 'tranen', 'pijn', 'verdriet', 'rouw', 'verlies',
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
        'tense', 'uneasy', 'restless', 'apprehensive', 'fearful', 'jittery', 'on edge',
        // Dutch - Extended
        'angstig', 'bezorgd', 'nerveus', 'bang', 'paniek', 'stress', 'overweldigd', 'gespannen',
        'onrustig', 'ongerust', 'bevreesd', 'benauwd', 'paniekerig', 'zenuwachtig', 'gejaagd',
        'zorgen', 'angst', 'spanning', 'onrust', 'vrees', 'schrik',
        // German
        'ängstlich', 'besorgt', 'nervös', 'verängstigt', 'panik', 'stress', 'überwältigt',
        'unruhig', 'sorge', 'aufgeregt', 'bange', 'furcht',
        // French
        'anxieux', 'inquiet', 'nerveux', 'effrayé', 'panique', 'stress', 'débordé',
        'soucieux', 'agité', 'préoccupé', 'craintif', 'tracas',
        // Spanish
        'ansioso', 'preocupado', 'nervioso', 'asustado', 'pánico', 'estrés', 'abrumado',
        'inquieto', 'agitado', 'temeroso', 'intranquilo', 'congoja',
        // Italian
        'ansioso', 'preoccupato', 'nervoso', 'spaventato', 'panico', 'stress', 'sopraffatto',
        'inquieto', 'agitato', 'timoroso', 'impaurito', 'apprensione',
        // Portuguese
        'ansioso', 'preocupado', 'nervoso', 'assustado', 'pânico', 'stress', 'sobrecarregado',
        'inquieto', 'agitado', 'receoso', 'apreensivo', 'aflição',
        // Japanese
        '不安', '心配', '緊張', '恐れ', 'パニック', 'ストレス',
        'ふあん', 'しんぱい', 'きんちょう', 'おそれ', 'すとれす',
        // Korean
        '불안한', '걱정되는', '긴장된', '두려운', '스트레스', '초조한',
        // Chinese (Simplified)
        '焦虑', '担心', '紧张', '害怕', '恐惧', '压力', '忧虑',
        // Arabic
        'قلق', 'خائف', 'متوتر', 'مضطرب', 'هلع', 'ضغط',
        // Hindi
        'चिंतित', 'परेशान', 'घबराया', 'डरा', 'तनाव', 'व्याकुल'
      ],
      angry: [
        // English
        'angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated', 'rage',
        'hostile', 'livid', 'outraged', 'irate', 'resentful', 'indignant',
        // Dutch - Extended
        'boos', 'kwaad', 'woedend', 'geïrriteerd', 'gefrustreerd', 'geërgerd', 'woede',
        'razend', 'pissig', 'verstoord', 'gebelgd', 'toornig', 'verontwaardigd',
        // German
        'wütend', 'sauer', 'verärgert', 'frustriert', 'gereizt', 'zorn',
        'ärgerlich', 'empört', 'aufgebracht', 'erzürnt', 'verbittert',
        // French
        'en colère', 'fâché', 'furieux', 'agacé', 'frustré', 'irrité', 'rage',
        'mécontent', 'indigné', 'révolté', 'exaspéré', 'courroucé',
        // Spanish
        'enojado', 'enfadado', 'furioso', 'molesto', 'frustrado', 'irritado', 'rabia',
        'indignado', 'airado', 'iracundo', 'cabreado', 'ofuscado',
        // Italian
        'arrabbiato', 'furioso', 'infastidito', 'frustrato', 'irritato', 'rabbia',
        'adirato', 'indignato', 'incavolato', 'alterato', 'risentito',
        // Portuguese
        'bravo', 'irritado', 'furioso', 'aborrecido', 'frustrado', 'raiva',
        'indignado', 'irado', 'revoltado', 'zangado', 'contrariado',
        // Japanese
        '怒り', '腹立たしい', 'むかつく', '激怒', 'イライラ',
        'いかり', 'はらだたしい', 'げきど', 'いらいら',
        // Korean
        '화난', '짜증나는', '분노한', '격분한', '성난',
        // Chinese (Simplified)
        '愤怒', '生气', '愤慨', '恼火', '气愤', '恼怒',
        // Arabic
        'غاضب', 'مستاء', 'محتد', 'مغضب', 'ساخط',
        // Hindi
        'गुस्सा', 'क्रोधित', 'नाराज', 'चिढ़', 'रोष'
      ],
      peaceful: [
        // English
        'peaceful', 'calm', 'relaxed', 'serene', 'quiet', 'tranquil', 'content',
        'soothing', 'restful', 'harmonious', 'zen', 'meditative',
        // Dutch - Extended
        'vredig', 'rustig', 'ontspannen', 'sereen', 'kalm', 'tevreden', 'vreedzaam',
        'harmonieus', 'stil', 'bedaard', 'gelijkmoedig', 'zen',
        // German
        'friedlich', 'ruhig', 'entspannt', 'gelassen', 'still', 'zufrieden',
        'harmonisch', 'ausgeglichen', 'besonnen', 'gemütlich',
        // French
        'paisible', 'calme', 'détendu', 'serein', 'tranquille', 'content',
        'apaisé', 'reposé', 'harmonieux', 'zen',
        // Spanish
        'pacífico', 'tranquilo', 'relajado', 'sereno', 'silencioso', 'contento',
        'apacible', 'sosegado', 'plácido', 'armonioso',
        // Italian
        'pacifico', 'calmo', 'rilassato', 'sereno', 'tranquillo', 'contento',
        'placido', 'quieto', 'armonioso', 'riposato',
        // Portuguese
        'pacífico', 'calmo', 'relaxado', 'sereno', 'tranquilo', 'contente',
        'sossegado', 'plácido', 'harmonioso', 'descansado',
        // Japanese
        '平和', '穏やか', '静か', 'リラックス', '落ち着いた', '安らか',
        'へいわ', 'おだやか', 'しずか', 'おちついた', 'やすらか',
        // Korean
        '평화로운', '차분한', '편안한', '고요한', '안정된', '평온한',
        // Chinese (Simplified)
        '平静', '安静', '宁静', '祥和', '安详', '平和', '轻松',
        // Arabic
        'هادئ', 'مسالم', 'مطمئن', 'ساكن', 'مرتاح',
        // Hindi
        'शांत', 'शांतिपूर्ण', 'आरामदायक', 'सुकून', 'निश्चिंत'
      ],
      grateful: [
        // English
        'grateful', 'thankful', 'blessed', 'appreciate', 'lucky', 'fortunate',
        'appreciative', 'indebted', 'obliged', 'recognition',
        // Dutch - Extended
        'dankbaar', 'gezegend', 'waarderen', 'gelukkig', 'bevoorrecht',
        'erkentelijk', 'waardering', 'dank', 'geluk', 'zegening',
        // German
        'dankbar', 'gesegnet', 'schätzen', 'glücklich', 'bevorzugt',
        'wertschätzen', 'anerkennung', 'dank', 'verbunden',
        // French
        'reconnaissant', 'béni', 'apprécier', 'chanceux', 'privilégié',
        'gratitude', 'remerciement', 'reconnaissance', 'obligé',
        // Spanish
        'agradecido', 'bendecido', 'apreciar', 'afortunado', 'privilegiado',
        'gratitud', 'reconocimiento', 'bendición', 'gracias',
        // Italian
        'grato', 'benedetto', 'apprezzare', 'fortunato', 'privilegiato',
        'gratitudine', 'riconoscente', 'ringraziamento', 'benedizione',
        // Portuguese
        'grato', 'abençoado', 'apreciar', 'sortudo', 'privilegiado',
        'agradecido', 'gratidão', 'reconhecimento', 'afortunado',
        // Japanese
        '感謝', 'ありがとう', '幸せ', '恵まれた', '幸運',
        'かんしゃ', 'しあわせ', 'めぐまれた', 'こううん',
        // Korean
        '감사한', '고마운', '축복받은', '행운의', '감사',
        // Chinese (Simplified)
        '感激', '感谢', '感恩', '幸运', '有福', '庆幸',
        // Arabic
        'ممتن', 'شاكر', 'محظوظ', 'مبارك', 'شكر',
        // Hindi
        'आभारी', 'कृतज्ञ', 'धन्य', 'भाग्यशाली', 'धन्यवाद'
      ],
      confused: [
        // English
        'confused', 'lost', 'uncertain', 'unclear', 'mixed', 'conflicted',
        'puzzled', 'bewildered', 'perplexed', 'disoriented', 'baffled',
        // Dutch - Extended
        'verward', 'verloren', 'onzeker', 'onduidelijk', 'gemengd', 'conflicterend',
        'verbijsterd', 'gedesoriënteerd', 'twijfel', 'verbaasd', 'verwarring',
        // German
        'verwirrt', 'verloren', 'unsicher', 'unklar', 'gemischt', 'konfliktreich',
        'ratlos', 'durcheinander', 'orientierungslos', 'zweifel',
        // French
        'confus', 'perdu', 'incertain', 'flou', 'mélangé', 'conflictuel',
        'désorienté', 'perplexe', 'embrouillé', 'trouble',
        // Spanish
        'confundido', 'perdido', 'incierto', 'poco claro', 'mezclado', 'conflictivo',
        'desconcertado', 'desorientado', 'perplejo', 'dudoso',
        // Italian
        'confuso', 'perso', 'incerto', 'poco chiaro', 'misto', 'conflittuale',
        'disorientato', 'perplesso', 'smarrito', 'dubbioso',
        // Portuguese
        'confuso', 'perdido', 'incerto', 'pouco claro', 'misturado', 'conflituoso',
        'desorientado', 'perplexo', 'desnorteado', 'duvidoso',
        // Japanese
        '混乱', '迷う', '困惑', '不明', 'わからない', '戸惑い',
        'こんらん', 'まよう', 'こんわく', 'ふめい', 'とまどい',
        // Korean
        '혼란스러운', '헷갈리는', '어리둥절한', '막막한', '혼동',
        // Chinese (Simplified)
        '困惑', '迷茫', '混乱', '不清楚', '糊涂', '疑惑',
        // Arabic
        'محتار', 'مرتبك', 'حائر', 'مشوش', 'غامض',
        // Hindi
        'भ्रमित', 'उलझन', 'असमंजस', 'संशय', 'परेशान'
      ],
      lonely: [
        // English
        'lonely', 'alone', 'isolated', 'empty', 'disconnected',
        'solitary', 'abandoned', 'forsaken', 'friendless', 'lonesome',
        // Dutch - Extended
        'eenzaam', 'alleen', 'geïsoleerd', 'leeg', 'afgesloten',
        'verlaten', 'afgescheiden', 'vereenzaamd', 'alleenstaand', 'afzondering',
        // German
        'einsam', 'allein', 'isoliert', 'leer', 'getrennt',
        'verlassen', 'vereinsamt', 'abgeschieden', 'alleinstehend',
        // French
        'seul', 'isolé', 'vide', 'déconnecté',
        'abandonné', 'esseulé', 'délaissé', 'solitude', 'solitaire',
        // Spanish
        'solo', 'aislado', 'vacío', 'desconectado',
        'abandonado', 'desamparado', 'soledad', 'aislamiento', 'solitario',
        // Italian
        'solo', 'isolato', 'vuoto', 'disconnesso',
        'abbandonato', 'solitudine', 'desolato', 'isolamento', 'solitario',
        // Portuguese
        'sozinho', 'isolado', 'vazio', 'desconectado',
        'abandonado', 'desamparado', 'solidão', 'isolamento', 'solitário',
        // Japanese
        '孤独', '寂しい', '一人', '孤立', '独り',
        'こどく', 'さびしい', 'ひとり', 'こりつ',
        // Korean
        '외로운', '고독한', '혼자', '쓸쓸한', '적적한',
        // Chinese (Simplified)
        '孤独', '寂寞', '孤单', '独自', '空虚', '冷清',
        // Arabic
        'وحيد', 'منعزل', 'منفرد', 'وحدة', 'معزول',
        // Hindi
        'अकेला', 'एकाकी', 'तन्हा', 'अलग', 'खाली'
      ],
      energetic: [
        // English
        'energetic', 'motivated', 'inspired', 'driven', 'active', 'productive',
        'enthusiastic', 'vibrant', 'dynamic', 'vigorous', 'lively', 'spirited',
        // Dutch - Extended  
        'energiek', 'gemotiveerd', 'geïnspireerd', 'gedreven', 'actief', 'productief',
        'enthousiast', 'levendig', 'dynamisch', 'krachtig', 'vol energie', 'bezield',
        // German
        'energisch', 'motiviert', 'inspiriert', 'getrieben', 'aktiv', 'produktiv',
        'enthusiastisch', 'lebendig', 'dynamisch', 'kraftvoll', 'schwungvoll',
        // French
        'énergique', 'motivé', 'inspiré', 'déterminé', 'actif', 'productif',
        'enthousiaste', 'vivace', 'dynamique', 'vigoureux', 'animé',
        // Spanish
        'enérgico', 'motivado', 'inspirado', 'decidido', 'activo', 'productivo',
        'entusiasta', 'vibrante', 'dinámico', 'vigoroso', 'animado',
        // Italian
        'energico', 'motivato', 'ispirato', 'determinato', 'attivo', 'produttivo',
        'entusiasta', 'vivace', 'dinamico', 'vigoroso', 'animato',
        // Portuguese
        'enérgico', 'motivado', 'inspirado', 'determinado', 'ativo', 'produtivo',
        'entusiástico', 'vibrante', 'dinâmico', 'vigoroso', 'animado',
        // Japanese
        '元気', 'やる気', 'エネルギッシュ', '活発', '意欲', '活力',
        'げんき', 'やるき', 'かっぱつ', 'いよく', 'かつりょく',
        // Korean
        '활기찬', '의욕적인', '열정적인', '에너지', '활력', '생기',
        // Chinese (Simplified)
        '精力充沛', '有活力', '积极', '活跃', '充满活力', '有动力',
        // Arabic
        'نشيط', 'متحمس', 'ملهم', 'طاقة', 'حيوي', 'فعال',
        // Hindi
        'ऊर्जावान', 'उत्साही', 'प्रेरित', 'सक्रिय', 'जोशीला', 'शक्तिशाली'
      ]
    };
    
    let detectedMoods = [];
    let allEmotionalIndicators = [];
    let overallSentiment = 'neutral';
    let contextualFactors = {};
    
    // Enhanced emotional pattern detection
    const patternMatches = {};
    Object.keys(emotionalPatterns).forEach(pattern => {
      const matches = text.match(emotionalPatterns[pattern]);
      if (matches) {
        patternMatches[pattern] = matches;
      }
    });
    
    // Detect intensifier/diminisher effects
    const intensifierCount = (text.match(emotionalPatterns.intensifiers) || []).length;
    const diminisherCount = (text.match(emotionalPatterns.diminishers) || []).length;
    const intensityModifier = (intensifierCount * 0.3) - (diminisherCount * 0.2);
    
    // Check for ALL mood keywords and score them with enhanced analysis
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      const matchedKeywords = keywords.filter(keyword => textLower.includes(keyword));
      if (matchedKeywords.length > 0) {
        // Base mood strength from keyword matches
        let moodStrength = matchedKeywords.length;
        
        // Boost strength if multiple instances of same keyword
        const keywordCounts = {};
        matchedKeywords.forEach(keyword => {
          const matches = (textLower.match(new RegExp(keyword, 'g')) || []).length;
          keywordCounts[keyword] = matches;
          if (matches > 1) moodStrength += (matches - 1) * 0.5;
        });
        
        // Apply contextual pattern bonuses/penalties
        
        // Masked emotion detection
        if (patternMatches.maskedPositive && ['happy', 'peaceful', 'grateful'].includes(mood)) {
          moodStrength += 0.8; // "not bad" actually indicates some positivity
          contextualFactors.maskedPositive = true;
        }
        if (patternMatches.maskedNegative && ['sad', 'anxious', 'confused'].includes(mood)) {
          moodStrength += 1.2; // "fine" often masks negative emotions
          contextualFactors.maskedNegative = true;
        }
        
        // Temporal pattern adjustments
        if (patternMatches.pastRegret && ['sad', 'regretful', 'reflective'].includes(mood)) {
          moodStrength += 0.6;
          contextualFactors.pastRegret = true;
        }
        if (patternMatches.futureAnxiety && ['anxious', 'stressed', 'worried'].includes(mood)) {
          moodStrength += 0.7;
          contextualFactors.futureAnxiety = true;
        }
        
        // Social context adjustments
        if (patternMatches.isolation && mood === 'lonely') {
          moodStrength += 1.0;
          contextualFactors.isolation = true;
        }
        if (patternMatches.connection && ['happy', 'grateful', 'peaceful'].includes(mood)) {
          moodStrength += 0.5;
          contextualFactors.socialConnection = true;
        }
        
        // Achievement context adjustments
        if (patternMatches.success && ['happy', 'grateful', 'energetic', 'proud'].includes(mood)) {
          moodStrength += 0.8;
          contextualFactors.achievement = true;
        }
        if (patternMatches.failure && ['sad', 'frustrated', 'disappointed'].includes(mood)) {
          moodStrength += 0.9;
          contextualFactors.failure = true;
        }
        
        // Linguistic pattern adjustments
        
        // Sentence structure influence
        if (textMetrics.avgWordsPerSentence < 6 && ['stressed', 'angry', 'anxious'].includes(mood)) {
          moodStrength += 0.4; // Short sentences suggest urgency/stress
        }
        if (textMetrics.avgWordsPerSentence > 15 && ['reflective', 'peaceful', 'contemplative'].includes(mood)) {
          moodStrength += 0.3; // Long sentences suggest reflection
        }
        
        // Punctuation influence
        if (textMetrics.exclamationCount > 0) {
          if (['happy', 'energetic', 'excited'].includes(mood)) {
            moodStrength += 0.5;
          } else if (['angry', 'frustrated'].includes(mood)) {
            moodStrength += 0.6;
          }
        }
        
        if (textMetrics.ellipsisCount > 0 && ['sad', 'confused', 'uncertain', 'lonely'].includes(mood)) {
          moodStrength += 0.4; // Ellipses suggest hesitation/sadness
        }
        
        if (textMetrics.questionCount > 0 && ['confused', 'anxious', 'uncertain'].includes(mood)) {
          moodStrength += 0.3; // Questions suggest uncertainty
        }
        
        // Apply intensity modifiers from intensifiers/diminishers
        moodStrength += intensityModifier;
        
        // Calculate mood score with enhanced logic
        let moodScore;
        switch (mood) {
          case 'happy':
          case 'grateful':
          case 'peaceful':
          case 'energetic':
            moodScore = Math.min(10, Math.max(3, 6 + moodStrength));
            break;
          case 'sad':
          case 'anxious':
          case 'angry':
          case 'lonely':
          case 'frustrated':
            moodScore = Math.min(10, Math.max(3, 4 + moodStrength));
            break;
          case 'confused':
          case 'reflective':
            moodScore = Math.min(10, Math.max(2, 4 + (moodStrength * 0.5)));
            break;
          default:
            moodScore = Math.min(10, Math.max(2, 5 + (moodStrength * 0.3)));
        }
        
        detectedMoods.push({
          mood: mood,
          score: Math.round(moodScore * 10) / 10, // Round to 1 decimal
          strength: Math.round(moodStrength * 10) / 10,
          keywords: [...new Set(matchedKeywords)], // Remove duplicates
          keywordCounts: keywordCounts,
          layerType: contextualFactors.maskedNegative || contextualFactors.maskedPositive ? 'masked' : 'surface',
          contextualFactors: Object.keys(contextualFactors).length > 0 ? contextualFactors : null
        });
        
        allEmotionalIndicators.push(...matchedKeywords);
      }
    }
    
    // Sort moods by strength (most prominent first) and limit to 5
    detectedMoods.sort((a, b) => b.strength - a.strength);
    detectedMoods = detectedMoods.slice(0, 5);
    
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
    
    // Enhanced confidence calculation for fallback
    let baseConfidence = 0.3; // Lower baseline for keyword-based detection
    if (detectedMoods.length > 0) {
      baseConfidence = 0.4 + (detectedMoods.length * 0.08); // Multiple moods increase confidence
      
      // Boost confidence for contextual patterns
      if (Object.keys(contextualFactors).length > 0) {
        baseConfidence += 0.1;
      }
      
      // Boost for linguistic patterns alignment
      const strongestMood = detectedMoods[0];
      if (textMetrics.exclamationCount > 0 && ['happy', 'angry', 'energetic'].includes(strongestMood.mood)) {
        baseConfidence += 0.05;
      }
      if (textMetrics.ellipsisCount > 0 && ['sad', 'confused', 'lonely'].includes(strongestMood.mood)) {
        baseConfidence += 0.05;
      }
      
      // Cap at reasonable maximum for keyword-based detection
      baseConfidence = Math.min(0.8, baseConfidence);
    }

    // Determine predominant theme for fallback
    let predominantTheme = 'daily_life';
    if (textMetrics.hasWorkContext) {
      predominantTheme = 'work';
    } else if (textMetrics.hasSocialContext) {
      predominantTheme = 'relationships';
    } else if (patternMatches.success || patternMatches.failure) {
      predominantTheme = 'personal_growth';
    }

    // Create enhanced mood description
    let moodDescription = `Detected ${validPrimaryMood} mood`;
    if (detectedMoods.length > 1) {
      moodDescription = `Multiple emotional states detected: ${detectedMoods.slice(0, 3).map(m => m.mood).join(', ')}`;
    }
    if (Object.keys(contextualFactors).length > 0) {
      moodDescription += ` with contextual indicators`;
    }

    // Generate wellbeing suggestion based on detected mood
    let suggestedFocus = `Consider reflecting on your ${validPrimaryMood} feelings and what might be contributing to them.`;
    switch (validPrimaryMood) {
      case 'happy':
      case 'grateful':
        suggestedFocus = 'Try to identify what brought you joy today so you can cultivate more of these positive experiences.';
        break;
      case 'sad':
      case 'lonely':
        suggestedFocus = 'Consider reaching out to someone you trust or engaging in a self-care activity that brings you comfort.';
        break;
      case 'anxious':
      case 'stressed':
        suggestedFocus = 'Practice deep breathing or grounding techniques to help manage these feelings of tension.';
        break;
      case 'angry':
      case 'frustrated':
        suggestedFocus = 'Take some time to cool down and consider what specific issue is causing these feelings.';
        break;
      case 'confused':
        suggestedFocus = 'Break down complex thoughts into smaller parts or talk through your concerns with someone.';
        break;
      case 'energetic':
        suggestedFocus = 'Channel this positive energy into activities or projects that are meaningful to you.';
        break;
    }

    return {
      primaryMood: validPrimaryMood,
      moodScore: Math.round(primaryMood.score * 10) / 10,
      confidence: Math.round(baseConfidence * 100) / 100,
      emotionalIndicators: [...new Set(allEmotionalIndicators.slice(0, 5))], // Limit to 5 most relevant
      overallSentiment,
      emotionalIntensity: Math.ceil(primaryMood.score / 2),
      moodDescription,
      detectedMoods: detectedMoods.map(m => ({
        mood: m.mood,
        score: m.score,
        strength: m.strength,
        keywords: m.keywords.slice(0, 3), // Limit to top 3 keywords per mood
        layerType: m.layerType || 'surface'
      })),
      moodCount: detectedMoods.length,
      emotionalTransition: 'stable', // Default for keyword-based detection
      suggestedFocus,
      culturalContext: null, // Not available in keyword-based fallback
      emotionalComplexity: Math.min(5, Math.max(1, detectedMoods.length + (overallSentiment === 'mixed' ? 1 : 0))),
      predominantTheme,
      // Additional metadata for debugging/improvement
      fallbackMethod: 'enhanced-keyword-analysis',
      textMetrics: {
        wordCount: textMetrics.wordCount,
        sentenceCount: textMetrics.sentenceCount,
        avgWordsPerSentence: Math.round(textMetrics.avgWordsPerSentence * 10) / 10,
        hasContextualPatterns: Object.keys(contextualFactors).length > 0,
        detectedPatterns: Object.keys(patternMatches)
      }
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
      
      // Generate AI insights using OpenAI GPT-4o
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
      // Use primary mood from AI analysis if available, otherwise fall back to basic mood
      let moodToUse = entry.mood;
      if (entry.moodAnalysis?.detectedMoods && entry.moodAnalysis.detectedMoods.length > 0) {
        moodToUse = entry.moodAnalysis.detectedMoods[0].mood;
      }
      
      if (moodToUse && moodScores[moodToUse]) {
        moodCounts[moodToUse] = (moodCounts[moodToUse] || 0) + 1;
        totalScore += moodScores[moodToUse];
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
      // Use primary mood from AI analysis if available, otherwise fall back to basic mood
      let moodToUse = entry.mood;
      if (entry.moodAnalysis?.detectedMoods && entry.moodAnalysis.detectedMoods.length > 0) {
        moodToUse = entry.moodAnalysis.detectedMoods[0].mood;
      }
      
      if (moodToUse && moodScores[moodToUse]) {
        total += moodScores[moodToUse];
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

      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const response = result.choices[0].message;
      let text = response.content;
      
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

      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const response = result.choices[0].message;
      let text = response.content;
      
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

  /**
   * Check grammar and spelling for text input
   */
  async checkGrammarAndSpelling(text, language = 'auto', checkTypes = ['spelling', 'grammar']) {
    try {
      console.log(`Checking text for ${checkTypes.join(', ')} in language: ${language}`);
      
      // Detect language if auto
      let detectedLanguage = language;
      if (language === 'auto') {
        detectedLanguage = await this.detectLanguage(text);
      }
      
      // If nonsense check is requested, do it first and return early if nonsense is detected
      if (checkTypes.includes('nonsense')) {
        console.log('Performing nonsense check first...');
        const isNonsense = await this.checkForNonsense(text, detectedLanguage);
        if (isNonsense) {
          console.log('Nonsense detected - skipping grammar check');
          return {
            errors: [],
            isNonsense: true,
            nonsenseReason: "Text contains gibberish or meaningless content",
            detectedLanguage: detectedLanguage,
            overallQuality: "poor",
            readabilityScore: 1,
            suggestions: []
          };
        }
        console.log('No nonsense detected - proceeding with grammar check');
      }
      
      // Build analysis types based on checkTypes (excluding nonsense since it's already checked)
      const analysisTypes = [];
      if (checkTypes.includes('spelling')) analysisTypes.push('1. Spelling errors');
      if (checkTypes.includes('grammar')) analysisTypes.push('2. Grammar mistakes');
      if (checkTypes.includes('punctuation')) analysisTypes.push('3. Punctuation issues');
      
      const prompt = `
        You are a professional text checker specializing in ${detectedLanguage === 'nl' ? 'Dutch' : detectedLanguage === 'en' ? 'English' : 'multiple languages'}. Analyze the following text for:
        ${analysisTypes.join('\n        ')}
        
        Text language: ${detectedLanguage}
        Text to analyze: "${text}"
        
        Provide your analysis in this exact JSON format:
        {
          "errors": [
            {
              "type": "grammar|spelling|punctuation",
              "error": "incorrect text",
              "suggestion": "corrected text", 
              "start": start_position,
              "end": end_position,
              "explanation": "clear explanation"
            }
          ],
          "isNonsense": false,
          "nonsenseReason": null,
          "detectedLanguage": "${detectedLanguage}",
          "overallQuality": "excellent|good|fair|poor",
          "readabilityScore": 7,
          "suggestions": []
        }
        
        For Dutch texts, check for:
        - Subject-verb agreement
        - Incorrect use of "de/het" articles
        - Wrong verb conjugations
        - Word order mistakes
        - Common spelling errors
        
        For position indices:
        - Use 0-based character positions
        - Ensure text.substring(start, end) equals the error text
        
        Be helpful but not overly pedantic. Focus on meaningful errors.
      `;
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const responseText = result.choices[0].message.content;
      console.log('Raw OpenAI GPT-4o response for grammar check:', responseText);
      
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      
      // Remove ```json and ``` markers
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      console.log('Cleaned OpenAI response for grammar check:', cleanedText);
      
      const analysis = JSON.parse(cleanedText);
      
      // Validate and fix the response
      if (!analysis.errors) analysis.errors = [];
      if (typeof analysis.isNonsense !== 'boolean') analysis.isNonsense = false;
      if (!analysis.detectedLanguage) analysis.detectedLanguage = detectedLanguage || 'en';
      if (!analysis.overallQuality) analysis.overallQuality = 'good';
      if (!analysis.readabilityScore) analysis.readabilityScore = 7;
      if (!analysis.suggestions) analysis.suggestions = [];
      
      // Validate and fix error positions
      if (analysis.errors && analysis.errors.length > 0) {
        analysis.errors = analysis.errors.filter(error => {
          if (!error.error || typeof error.start !== 'number' || typeof error.end !== 'number') {
            console.warn('Invalid error object, removing:', error);
            return false;
          }
          
          // Check if positions are correct
          const actualText = text.substring(error.start, error.end);
          if (actualText !== error.error) {
            console.warn(`Position mismatch for error "${error.error}": found "${actualText}" at ${error.start}-${error.end}`);
            
            // Try to find correct position
            const correctStart = text.indexOf(error.error);
            if (correctStart !== -1) {
              error.start = correctStart;
              error.end = correctStart + error.error.length;
              console.log(`Corrected positions to ${error.start}-${error.end}`);
            } else {
              console.warn(`Could not find error text "${error.error}" in original text`);
              return false;
            }
          }
          
          return true;
        });
        
        // Sort errors by position
        analysis.errors.sort((a, b) => a.start - b.start);
        
        // Map errors to suggestions format for frontend
        analysis.suggestions = analysis.errors;
      }
      
      return analysis;
      
    } catch (error) {
      console.error('Error checking grammar and spelling:', error);
      return this.getDefaultGrammarAnalysis();
    }
  }

  /**
   * Check if text is nonsense (gibberish or meaningless content)
   */
  async checkForNonsense(text, language = 'en') {
    try {
      const prompt = `
        Analyze if the following text is nonsense, gibberish, or meaningless content:
        
        Text: "${text}"
        
        Return only "true" if the text is nonsense/gibberish, or "false" if it contains meaningful content.
        
        Consider as nonsense:
        - Random characters or symbols
        - Repeated nonsensical strings  
        - Complete gibberish without any meaningful words
        - Test strings like "asdkasd" or keyboard mashing
        - Mixed text where meaningful content is combined with significant amounts of gibberish
        - Any text containing substantial portions of random letter combinations
        
        CRITICAL RULE: If ANY significant portion of the text contains gibberish/random letter combinations (like "askldjaslkd", "alskdjalskd"), mark as nonsense.
        
        STRICT RULE: If more than 15% of the text consists of gibberish/random characters, mark as nonsense.
        
        Do NOT consider as nonsense:
        - Poor grammar or spelling errors
        - Simple sentences
        - Emotional expressions
        - Different languages (including mixed languages)
        - Short entries with meaning
        - Typos or autocorrect errors
        
        Return only: true or false
      `;
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const responseText = result.choices[0].message.content.trim().toLowerCase();
      
      return responseText === 'true';
      
    } catch (error) {
      console.error('Error checking for nonsense:', error);
      // Default to false (not nonsense) on error
      return false;
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
      
      // Detect language first
      const detectedLanguage = await this.detectLanguage(text);
      console.log('Detected language:', detectedLanguage);
      
      // Check for nonsense
      const isNonsense = await this.checkForNonsense(text, detectedLanguage);
      
      const result = {
        isNonsense,
        reason: isNonsense ? "Text contains gibberish or meaningless content" : null,
        detectedLanguage
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
   * Detect the language of text
   */
  async detectLanguage(text) {
    try {
      if (!text || text.trim().length < 10) {
        return 'en'; // Default to English for short text
      }
      
      const prompt = `
        Detect the language of this text and return only the language code (e.g., "en", "nl", "de", "fr", "es", "it", "pt", "ru", "zh", "ja", "ko", "ar", "hi"):
        
        Text: "${text.substring(0, 200)}" ${text.length > 200 ? '...' : ''}
        
        Return only the 2-letter language code, nothing else.
      `;
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const detectedLang = result.choices[0].message.content.trim().toLowerCase();
      
      // Validate the detected language
      const supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'];
      if (supportedLanguages.includes(detectedLang)) {
        return detectedLang;
      }
      
      return 'en'; // Default fallback
      
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'en'; // Default fallback
    }
  }

  /**
   * Verify if content is appropriate for a journal entry
   */
  async verifyJournalContext(text, language = 'auto') {
    try {
      console.log(`Verifying journal context for text in language: ${language}`);
      
      // Detect language if auto
      let detectedLanguage = language;
      if (language === 'auto') {
        detectedLanguage = await this.detectLanguage(text);
      }
      
      const prompt = `
        You are an AI assistant helping to verify if text content is appropriate for a personal journal entry.
        
        A journal entry should typically:
        - Express personal thoughts, feelings, or experiences
        - Describe events from the author's life or perspective  
        - Reflect on emotions, relationships, or personal growth
        - Share daily activities, goals, or challenges
        - Be written in first person or from a personal perspective
        - Show introspection or self-reflection
        
        Content that is NOT appropriate for a journal:
        - Commercial advertisements or product promotions
        - Technical documentation or code snippets
        - News articles or factual reporting (unless personally reflective)
        - Recipe instructions or how-to guides
        - Academic papers or formal reports
        - Random text, spam, or gibberish
        - Inappropriate or offensive content
        - Content clearly copy-pasted from other sources without personal reflection
        
        Analyze this text: "${text}"
        
        Provide your analysis in this exact JSON format:
        {
          "isAppropriate": true/false,
          "contextScore": 8,
          "reason": "brief explanation of why it's appropriate or not",
          "suggestions": ["suggestion to improve journal context if needed"],
          "detectedLanguage": "${detectedLanguage}",
          "personalityIndicators": ["list of personal elements found"],
          "contentType": "personal_reflection|daily_experience|emotional_expression|goal_setting|inappropriate|unclear"
        }
        
        Score from 1-10 where:
        - 9-10: Excellent personal journal content with clear self-reflection
        - 7-8: Good journal content with personal elements
        - 5-6: Acceptable but could be more personal or reflective
        - 3-4: Questionable journal content, lacks personal perspective
        - 1-2: Inappropriate or completely unrelated to journaling
        
        Be helpful but accurate in your assessment.
      `;
      
      const result = await this.openai.chat.completions.create({ model: this.modelName, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 });
      const responseText = result.choices[0].message.content;
      console.log('Raw OpenAI GPT-4o response for context verification:', responseText);
      
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      
      // Remove ```json and ``` markers
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      console.log('Cleaned OpenAI response for context verification:', cleanedText);
      
      const analysis = JSON.parse(cleanedText);
      
      // Validate and fix the response
      if (typeof analysis.isAppropriate !== 'boolean') analysis.isAppropriate = true;
      if (!analysis.contextScore || analysis.contextScore < 1 || analysis.contextScore > 10) analysis.contextScore = 7;
      if (!analysis.reason) analysis.reason = 'Content appears suitable for journaling';
      if (!analysis.suggestions) analysis.suggestions = [];
      if (!analysis.personalityIndicators) analysis.personalityIndicators = [];
      if (!analysis.contentType) analysis.contentType = 'unclear';
      if (!analysis.detectedLanguage) analysis.detectedLanguage = detectedLanguage;
      
      console.log('Final context verification analysis:', analysis);
      return analysis;
      
    } catch (error) {
      console.error('Error verifying journal context:', error);
      // Return default allowing analysis
      return {
        isAppropriate: true,
        contextScore: 7,
        reason: 'Unable to verify context, allowing entry',
        suggestions: [],
        detectedLanguage: language === 'auto' ? 'en' : language,
        personalityIndicators: [],
        contentType: 'unclear'
      };
    }
  }

  /**
   * Default grammar analysis fallback
   */
  getDefaultGrammarAnalysis() {
    return {
      errors: [],
      isNonsense: false,
      nonsenseReason: null,
      detectedLanguage: 'en',
      overallQuality: 'good',
      readabilityScore: 7,
      suggestions: ['Text appears to be readable']
    };
  }

  /**
   * Generate comprehensive progress insights for user
   */
  async generateProgressInsights(userId, data) {
    try {
      const user = await User.findById(userId);
      const userLanguage = user?.preferredLanguage || 'en';
      const { journalEntries, coachSessions, addictions, timeframe } = data;

      // Build personalized user context
      const userContext = this.buildPersonalizedContext(user, addictions);

      // Language-specific insight instructions
      const languageInstructions = {
        'en': 'Provide all insights, achievements, and recommendations in English.',
        'nl': 'Geef alle inzichten, prestaties en aanbevelingen in het Nederlands.',
        'de': 'Geben Sie alle Erkenntnisse, Erfolge und Empfehlungen auf Deutsch an.',
        'fr': 'Fournissez tous les aperçus, réalisations et recommandations en français.',
        'es': 'Proporcione todos los conocimientos, logros y recomendaciones en español.',
        'it': 'Fornisci tutte le intuizioni, i risultati e le raccomandazioni in italiano.',
        'pt': 'Forneça todas as perceções, conquistas e recomendações em português.',
        'ru': 'Предоставьте все идеи, достижения и рекомендации на русском языке.',
        'zh': '用中文提供所有见解、成就和建议。',
        'ja': 'すべての洞察、成果、推奨事項を日本語で提供してください。',
        'ko': '모든 통찰, 성취, 권장 사항을 한국어로 제공하세요.',
        'hi': 'सभी अंतर्दृष्टि, उपलब्धियाँ और सिफारिशें हिंदी में प्रदान करें।',
        'ar': 'قدم جميع الرؤى والإنجازات والتوصيات باللغة العربية.'
      };

      const langInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

      const prompt = `You are Alex, an empathetic AI addiction recovery coach. Analyze this user's progress over the last ${timeframe} days and provide comprehensive insights.

USER CONTEXT: ${userContext}

DATA TO ANALYZE:
- Journal entries: ${journalEntries.length} entries
- Coach sessions: ${coachSessions.length} sessions
- Active addictions: ${addictions.length}

LANGUAGE INSTRUCTION: ${langInstruction}

Based on the user's data, provide insights in JSON format:
{
  "weeklyProgress": "improving|stable|declining|mixed",
  "keyInsights": [
    "Insight 1 in user's language (${userLanguage})",
    "Insight 2 in user's language (${userLanguage})",
    "Insight 3 in user's language (${userLanguage})"
  ],
  "moodTrend": "improving|stable|declining|volatile",
  "achievements": [
    "Achievement 1 in user's language (${userLanguage})",
    "Achievement 2 in user's language (${userLanguage})"
  ],
  "recommendedActions": [
    "Action 1 in user's language (${userLanguage})",
    "Action 2 in user's language (${userLanguage})"
  ],
  "motivationalMessage": "Encouraging message in user's language (${userLanguage}), max 50 words",
  "areasOfImprovement": [
    "Area 1 in user's language (${userLanguage})",
    "Area 2 in user's language (${userLanguage})"
  ],
  "strengthsIdentified": [
    "Strength 1 in user's language (${userLanguage})",
    "Strength 2 in user's language (${userLanguage})"
  ],
  "riskFactors": [
    "Risk factor 1 (if any)"
  ],
  "overallScore": [0-100 progress score],
  "nextGoals": [
    "Goal 1 in user's language (${userLanguage})",
    "Goal 2 in user's language (${userLanguage})"
  ]
}

Important: All text fields must be in the user's preferred language (${userLanguage}). Be encouraging, specific, and culturally appropriate.`;

      const result = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      });

      const responseText = result.choices[0].message.content;
      
      // Clean the response text
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const insights = JSON.parse(cleanedText);
      
      // Store insights in AI Coach record
      await this.saveAnalysis(userId, 'insight', insights);
      
      return insights;

    } catch (error) {
      console.error('Error generating progress insights:', error);
      const user = await User.findById(userId).catch(() => null);
      return this.getDefaultInsights(user?.preferredLanguage || 'en');
    }
  }
}

module.exports = AICoachService;