require('dotenv').config();

console.log('=== OpenAI API Key Check ===');
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('Key starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 15) + '...' : 'NO KEY');

// Test loading the service
try {
  const enhancedInsightsService = require('./services/enhancedInsightsService');
  console.log('Service loaded successfully');
  console.log('OpenAI instance present:', !!enhancedInsightsService.openai);
} catch (error) {
  console.error('Error loading service:', error.message);
}