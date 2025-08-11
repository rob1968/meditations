const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');
const JournalEntry = require('./models/JournalEntry');

async function testJournalDateRelapse() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔗 Connected to MongoDB');
    
    // Find user floppie
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('❌ User floppie not found');
      return;
    }
    
    // Reset addiction status first
    const alcoholAddiction = await Addiction.findOne({ 
      userId: user._id, 
      type: 'alcohol' 
    });
    
    if (alcoholAddiction) {
      alcoholAddiction.status = 'recovering';
      alcoholAddiction.lastRelapse = null;
      alcoholAddiction.relapseCount = 0;
      alcoholAddiction.notes = [];
      await alcoholAddiction.save();
      console.log('✅ Reset alcohol addiction status to recovering');
    }
    
    // Create a journal entry with a specific date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    console.log('📅 Creating journal entry for date:', threeDaysAgo.toLocaleDateString('nl-NL'));
    
    const testEntry = new JournalEntry({
      userId: user._id,
      title: 'Test Terugval',
      content: 'Gisteren heb ik helaas weer wijn gedronken op het feestje. Ik voel me er slecht over.',
      date: threeDaysAgo,
      mood: 'sad'
    });
    
    await testEntry.save();
    console.log('✅ Journal entry created with ID:', testEntry._id);
    
    // Simulate the automatic relapse detection
    const performKeywordBasedRelapseDetection = async (journalEntry) => {
      const addictions = await Addiction.find({ 
        userId: journalEntry.userId, 
        status: { $in: ['active', 'recovering', 'clean'] } 
      });
      
      const relapseIndicators = [];
      const content = (journalEntry.content + ' ' + journalEntry.title).toLowerCase();
      
      // Check Dutch alcohol keywords
      const alcoholKeywords = ['gedronken', 'heb gedronken', 'wijn gedronken', 'alcohol gedronken'];
      const foundKeywords = alcoholKeywords.filter(keyword => content.includes(keyword));
      
      if (foundKeywords.length > 0) {
        for (const addiction of addictions) {
          if (addiction.type === 'alcohol') {
            relapseIndicators.push({
              trigger: `Keyword detection: ${foundKeywords[0]}`,
              confidence: 0.7,
              context: `Found in journal: "${content.substring(0, 200)}..."`,
              isActualRelapse: true,
              relatedAddiction: addiction.type,
              detectionMethod: 'keyword-based'
            });
          }
        }
      }
      
      return relapseIndicators;
    };
    
    // Run detection
    const indicators = await performKeywordBasedRelapseDetection(testEntry);
    console.log('🔍 Detected indicators:', indicators.length);
    
    if (indicators.length > 0) {
      const indicator = indicators[0];
      console.log('🚨 Relapse detected:', indicator.trigger);
      
      // Update addiction with journal entry date
      const addiction = await Addiction.findOne({ 
        userId: user._id, 
        type: 'alcohol',
        status: { $in: ['recovering', 'active', 'clean'] }
      });
      
      if (addiction) {
        await addiction.recordAutomaticRelapse(indicator.trigger, testEntry._id, testEntry.date);
        console.log('✅ Addiction updated with journal entry date');
        
        // Check the result
        const updatedAddiction = await Addiction.findById(addiction._id);
        console.log('📊 Final results:');
        console.log('   Status:', updatedAddiction.status);
        console.log('   Last Relapse:', updatedAddiction.lastRelapse);
        console.log('   Journal Date:', testEntry.date);
        console.log('   Match:', updatedAddiction.lastRelapse.toDateString() === testEntry.date.toDateString() ? '✅' : '❌');
        
        // Show latest milestone
        if (updatedAddiction.milestones.length > 0) {
          const latestMilestone = updatedAddiction.milestones[updatedAddiction.milestones.length - 1];
          console.log('   Latest Milestone Date:', latestMilestone.date);
          console.log('   Milestone Match:', latestMilestone.date.toDateString() === testEntry.date.toDateString() ? '✅' : '❌');
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testJournalDateRelapse();