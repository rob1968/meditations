const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');
const JournalEntry = require('./models/JournalEntry');

async function testRelapseDetection() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔗 Connected to MongoDB');
    
    // Find user floppie
    const user = await User.findOne({ username: 'floppie' });
    if (\!user) {
      console.log('❌ User floppie not found');
      return;
    }
    
    console.log('👤 User floppie found:', user._id);
    
    // Test the improved keyword-based relapse detection function
    const testJournalEntry = {
      userId: user._id,
      content: 'Vandaag heb ik weer wijn gedronken met vrienden. Het was een moeilijke dag.',
      title: 'Moeilijke dag'
    };
    
    console.log('\n🧪 Testing keyword-based relapse detection...');
    console.log('Test content:', testJournalEntry.content);
    
    // Get user's addictions with improved query
    const addictions = await Addiction.find({ 
      userId: user._id, 
      status: { $in: ['active', 'recovering', 'clean'] } 
    });
    
    console.log(`\n🔍 Found ${addictions.length} addictions for relapse detection:`);
    addictions.forEach((addiction, index) => {
      console.log(`   ${index + 1}. ${addiction.type} - ${addiction.status}`);
    });
    
    // Simulate keyword-based detection
    const content = (testJournalEntry.content + ' ' + testJournalEntry.title).toLowerCase();
    console.log('\n🔍 Lowercase content for analysis:', content);
    
    // Test Dutch alcohol keywords
    const alcoholKeywords = ['gedronken', 'heb gedronken', 'wijn gedronken', 'alcohol gedronken'];
    const foundKeywords = alcoholKeywords.filter(keyword => content.includes(keyword));
    
    console.log('\n🔍 Alcohol keyword matches:', foundKeywords);
    
    if (foundKeywords.length > 0) {
      console.log('🚨 RELAPSE WOULD BE DETECTED\!');
      console.log('   Trigger:', foundKeywords[0]);
      console.log('   Confidence: 0.7');
      console.log('   Related Addiction: alcohol');
      
      // Check if alcohol addiction would be found
      const alcoholAddiction = await Addiction.findOne({ 
        userId: user._id, 
        type: 'alcohol',
        status: { $in: ['recovering', 'active', 'clean'] }
      });
      
      if (alcoholAddiction) {
        console.log('✅ Alcohol addiction found - status:', alcoholAddiction.status);
        console.log('   Would be updated to "relapsed"');
      } else {
        console.log('❌ Alcohol addiction NOT found with current query');
      }
    } else {
      console.log('❌ No alcohol keywords detected');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testRelapseDetection();
EOF < /dev/null
