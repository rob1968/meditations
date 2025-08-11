const mongoose = require('mongoose');
const Addiction = require('./models/Addiction');
const User = require('./models/User');

async function checkAddictionAPI() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('User not found');
      return;
    }
    
    const addictions = await Addiction.find({ userId: user._id })
      .sort({ createdAt: -1 });
    
    console.log('API Response Preview:');
    addictions.forEach((addiction, index) => {
      const addictionObj = addiction.toObject();
      addictionObj.daysClean = addiction.getDaysClean();
      
      console.log(`\nAddiction ${index + 1}:`);
      console.log(`   Type: ${addictionObj.type}`);
      console.log(`   Status: ${addictionObj.status}`);
      console.log(`   Last Relapse: ${addictionObj.lastRelapse || 'Never'}`);
      console.log(`   Relapse Count: ${addictionObj.relapseCount || 0}`);
      console.log(`   Days Clean: ${addictionObj.daysClean}`);
      console.log(`   Created: ${addictionObj.createdAt}`);
      console.log(`   Updated: ${addictionObj.updatedAt}`);
      
      if (addictionObj.milestones && addictionObj.milestones.length > 0) {
        const latest = addictionObj.milestones[addictionObj.milestones.length - 1];
        console.log(`   Latest Milestone: ${latest.type} - ${latest.date}`);
      }
      
      if (addictionObj.notes && addictionObj.notes.length > 0) {
        const latest = addictionObj.notes[addictionObj.notes.length - 1];
        console.log(`   Latest Note: ${latest.note.substring(0, 60)}...`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAddictionAPI();