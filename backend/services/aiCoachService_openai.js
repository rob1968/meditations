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
    this.modelName = "gpt-4o"; // Change to "gpt-5" if you have access
    
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
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  // Rest of the methods will need to be updated to use callOpenAI instead of this.model.generateContent
  // ... (copying the rest of the methods from original file with updated API calls)
}

module.exports = AICoachService;