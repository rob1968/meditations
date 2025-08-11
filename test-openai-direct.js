// Test OpenAI service methods direct
require('dotenv').config();
const mongoose = require('mongoose');
const aiCoachService = require('./backend/services/aiCoachService');

async function testOpenAIDirect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🧪 Testing OpenAI service methods directly...\n');
    
    // Test 1: Nonsense detection
    console.log('1. Testing nonsense detection:');
    const nonsenseResult = await aiCoachService.checkNonsenseOnly('asdfkjlasdf qwerty 12345 aaaaaaa');
    console.log('   Result:', nonsenseResult);
    
    // Test 2: Normal text (should NOT be nonsense)
    console.log('\n2. Testing normal text:');
    const normalResult = await aiCoachService.checkNonsenseOnly('Ik voel me vandaag heel blij en gelukkig!');
    console.log('   Result:', normalResult);
    
    // Test 3: Grammar and mood check
    console.log('\n3. Testing grammar and mood:');
    const grammarResult = await aiCoachService.checkGrammarAndMood('Ik ben heel blij vandag!', 'nl');
    console.log('   Result:', grammarResult);
    
    console.log('\n🎉 Direct OpenAI service tests completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testOpenAIDirect();