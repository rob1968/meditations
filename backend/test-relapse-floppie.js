const mongoose = require('mongoose');
const User = require('./models/User');
const JournalEntry = require('./models/JournalEntry');
const aiCoachService = require('./services/aiCoachService');

async function testRelapseDetection() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔍 Testing relapse detection for floppie...');
    
    // Get floppie's user data
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('❌ User floppie not found');
      process.exit(1);
    }
    
    // Get the most recent journal entry (with alcohol mention)
    const recentEntry = await JournalEntry.findOne({ userId: user._id }).sort({ date: -1 });
    if (!recentEntry) {
      console.log('❌ No journal entries found');
      process.exit(1);
    }
    
    console.log('📝 Testing entry:');
    console.log(`   Title: ${recentEntry.title}`);
    console.log(`   Content: ${recentEntry.content}`);
    console.log(`   Date: ${recentEntry.date}`);
    console.log('');
    
    // Test AI analysis
    console.log('🧠 Running AI analysis...');
    const analysis = await aiCoachService.analyzeJournalEntry(user._id, recentEntry);
    
    console.log('📊 Analysis result:');
    console.log(JSON.stringify(analysis, null, 2));
    
    // Check for triggers
    if (analysis && analysis.triggersDetected && analysis.triggersDetected.length > 0) {
      console.log('\n⚠️ Triggers detected:');
      analysis.triggersDetected.forEach((trigger, index) => {
        console.log(`${index + 1}. Trigger: "${trigger.trigger}"`);
        console.log(`   Confidence: ${trigger.confidence}`);
        console.log(`   Context: ${trigger.context || 'No context'}`);
        console.log(`   Is Actual Relapse: ${trigger.isActualRelapse}`);
        console.log(`   Related Addiction: ${trigger.relatedAddiction}`);
        
        // Check if this would qualify as relapse
        const isRelapse = trigger.confidence > 0.6 && 
          (trigger.isActualRelapse === true || 
           (trigger.context && (
             trigger.context.toLowerCase().includes('actual relapse') ||
             trigger.context.toLowerCase().includes('used') || 
             trigger.context.toLowerCase().includes('drank') || 
             trigger.context.toLowerCase().includes('gedronken') ||
             trigger.context.toLowerCase().includes('smoked') ||
             trigger.context.toLowerCase().includes('gambled') ||
             trigger.context.toLowerCase().includes('bought') ||
             trigger.context.toLowerCase().includes('relapsed') ||
             trigger.context.toLowerCase().includes('gave in')
           )));
           
        console.log(`   ⚡ Would trigger relapse update: ${isRelapse}`);
        console.log('');
      });
    } else {
      console.log('❌ No triggers detected!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testRelapseDetection();