const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');
const JournalEntry = require('./models/JournalEntry');

async function manualRelapseDetection() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔧 Manual relapse detection for floppie...');
    
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    // Get the journal entry with alcohol mention
    const alcoholEntry = await JournalEntry.findOne({ 
      userId: user._id,
      $or: [
        { content: { $regex: /wijn|wine|alcohol|gedronken|drank/i } },
        { title: { $regex: /wijn|wine|alcohol|gedronken|drank/i } }
      ]
    }).sort({ date: -1 });
    
    if (!alcoholEntry) {
      console.log('❌ No alcohol-related entry found');
      process.exit(1);
    }
    
    console.log('📝 Found entry with alcohol mention:');
    console.log(`   Content: ${alcoholEntry.content}`);
    console.log(`   Date: ${alcoholEntry.date}`);
    
    // Get alcohol addiction
    const alcoholAddiction = await Addiction.findOne({ 
      userId: user._id, 
      type: 'alcohol' 
    });
    
    if (!alcoholAddiction) {
      console.log('❌ No alcohol addiction found');
      process.exit(1);
    }
    
    console.log('🍷 Current alcohol addiction status:');
    console.log(`   Status: ${alcoholAddiction.status}`);
    console.log(`   Relapse Count: ${alcoholAddiction.relapseCount}`);
    console.log(`   Last Relapse: ${alcoholAddiction.lastRelapse || 'Never'}`);
    
    // Manual relapse detection based on content
    const content = alcoholEntry.content.toLowerCase();
    const hasRelapseKeywords = [
      'gedronken', 'heb gedronken', 'wijn gedronken', 
      'alcohol gedronken', 'veel gedronken', 'weer gedronken'
    ].some(keyword => content.includes(keyword));
    
    if (hasRelapseKeywords) {
      console.log('🚨 RELAPSE DETECTED! Updating addiction status...');
      
      // Manually trigger relapse using the model method with journal entry date
      await alcoholAddiction.recordAutomaticRelapse(
        'Manual detection: wijn gedronken', 
        alcoholEntry._id,
        alcoholEntry.date
      );
      
      console.log('✅ Addiction status updated!');
      
      // Verify the update
      const updatedAddiction = await Addiction.findById(alcoholAddiction._id);
      console.log('📊 Updated status:');
      console.log(`   Status: ${updatedAddiction.status}`);
      console.log(`   Relapse Count: ${updatedAddiction.relapseCount}`);
      console.log(`   Last Relapse: ${updatedAddiction.lastRelapse}`);
      console.log(`   Notes: ${updatedAddiction.notes.length} notes`);
      
      if (updatedAddiction.notes.length > 0) {
        const latestNote = updatedAddiction.notes[updatedAddiction.notes.length - 1];
        console.log(`   Latest Note: ${latestNote.note}`);
      }
    } else {
      console.log('❌ No clear relapse keywords found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

manualRelapseDetection();