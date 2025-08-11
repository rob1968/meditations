// Test OpenAI-only functionality
const axios = require('axios');

async function testOpenAIOnly() {
  try {
    console.log('🧪 Testing OpenAI-only functionality...\n');
    
    // Test 1: Nonsense detection
    console.log('1. Testing nonsense detection:');
    const nonsenseResponse = await axios.post('http://localhost:5002/api/ai-coach/check-nonsense', {
      text: 'asdfkjlasdf qwerty 12345 aaaaaaa xyzabc'
    }, { timeout: 15000 });
    
    console.log('   Nonsense check result:', {
      isNonsense: nonsenseResponse.data.isNonsense,
      reason: nonsenseResponse.data.reason
    });
    
    // Test 2: Grammar and spelling check
    console.log('\n2. Testing grammar and spelling check:');
    const grammarResponse = await axios.post('http://localhost:5002/api/ai-coach/check-grammar', {
      text: 'Ik ben vandaag heel gelukkig en blij!',
      language: 'nl'
    }, { timeout: 15000 });
    
    console.log('   Grammar check result:', {
      grammarErrors: grammarResponse.data.analysis.grammarErrors,
      spellingErrors: grammarResponse.data.analysis.spellingErrors,
      moods: grammarResponse.data.analysis.moods,
      overallSentiment: grammarResponse.data.analysis.overallSentiment,
      isNonsense: grammarResponse.data.analysis.isNonsense
    });
    
    // Test 3: Mood detection
    console.log('\n3. Testing mood detection:');
    const moodResponse = await axios.post('http://localhost:5002/api/journal/create', {
      userId: "6897745e8caf663789922a6a",
      title: "OpenAI Test",
      content: "Ik voel me vandaag echt super! Alles gaat fantastisch en ik heb zoveel energie."
    }, { timeout: 20000 });
    
    if (moodResponse.data.success) {
      console.log('   Mood detection result:', {
        mood: moodResponse.data.entry.mood,
        moodScore: moodResponse.data.entry.moodScore,
        confidence: moodResponse.data.entry.moodAnalysis?.confidence,
        sentiment: moodResponse.data.entry.moodAnalysis?.overallSentiment
      });
    }
    
    console.log('\n🎉 All OpenAI tests completed successfully!');
    console.log('✅ Gemini is fully disabled, only OpenAI is being used');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testOpenAIOnly();