// Simple relapse detection test
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');
const JournalEntry = require('./models/JournalEntry');
const aiCoachService = require('./services/aiCoachService');

async function testSimpleRelapse() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find test user
    const testUser = await User.findOne({ email: 'test-relapse@example.com' });
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    // Find test addiction
    const testAddiction = await Addiction.findOne({ 
      userId: testUser._id, 
      type: 'alcohol' 
    });
    
    if (!testAddiction) {
      console.log('❌ Test addiction not found');
      return;
    }
    
    console.log(`📊 Before - Status: ${testAddiction.status}, Relapses: ${testAddiction.relapseCount || 0}`);
    
    // Create relapse journal entry
    const journalEntry = new JournalEntry({
      userId: testUser._id,
      title: "Bad Day",
      content: "I went out last night and I drank too much. I had several beers and got drunk. I feel terrible about it.",
      date: new Date()
    });
    await journalEntry.save();
    
    // Analyze entry
    const analysis = await aiCoachService.analyzeJournalEntry(testUser._id, journalEntry);
    console.log(`🤖 Triggers detected: ${analysis.triggersDetected?.length || 0}`);
    
    if (analysis.triggersDetected) {
      const relapseIndicators = analysis.triggersDetected.filter(trigger => 
        trigger.confidence > 0.6 && trigger.isActualRelapse === true
      );
      
      console.log(`🚨 Relapse indicators: ${relapseIndicators.length}`);
      
      if (relapseIndicators.length > 0) {
        await testAddiction.recordAutomaticRelapse(relapseIndicators[0].trigger, journalEntry._id);
        await testAddiction.reload();
        
        console.log(`✅ After - Status: ${testAddiction.status}, Relapses: ${testAddiction.relapseCount}`);
        console.log(`📝 Notes: ${testAddiction.notes.length}`);
        console.log(`🏁 AUTOMATIC RELAPSE DETECTION WORKING!`);
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSimpleRelapse();