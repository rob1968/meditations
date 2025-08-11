const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');

async function testRelapseDetection() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('User floppie not found');
      return;
    }
    
    console.log('User floppie found:', user._id);
    
    // Get addictions with improved query (including 'clean' status)
    const addictions = await Addiction.find({ 
      userId: user._id, 
      status: { $in: ['active', 'recovering', 'clean'] } 
    });
    
    console.log('Found addictions for relapse detection:', addictions.length);
    addictions.forEach((addiction, index) => {
      console.log(`  ${index + 1}. ${addiction.type} - ${addiction.status}`);
    });
    
    // Test Dutch alcohol keywords
    const testContent = 'vandaag heb ik weer wijn gedronken met vrienden moeilijke dag';
    const alcoholKeywords = ['gedronken', 'heb gedronken', 'wijn gedronken', 'alcohol gedronken'];
    const foundKeywords = alcoholKeywords.filter(keyword => testContent.includes(keyword));
    
    console.log('Test content:', testContent);
    console.log('Alcohol keyword matches:', foundKeywords);
    
    if (foundKeywords.length > 0) {
      console.log('RELAPSE WOULD BE DETECTED!');
      console.log('  Trigger:', foundKeywords[0]);
      
      const alcoholAddiction = await Addiction.findOne({ 
        userId: user._id, 
        type: 'alcohol',
        status: { $in: ['recovering', 'active', 'clean'] }
      });
      
      if (alcoholAddiction) {
        console.log('Alcohol addiction found - status:', alcoholAddiction.status);
        console.log('Would be updated to relapsed');
      } else {
        console.log('Alcohol addiction NOT found');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testRelapseDetection();