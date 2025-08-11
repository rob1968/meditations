const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');

async function checkMilestones() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔗 Connected to MongoDB');
    
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('❌ User floppie not found');
      return;
    }
    
    const alcoholAddiction = await Addiction.findOne({ 
      userId: user._id, 
      type: 'alcohol' 
    });
    
    if (!alcoholAddiction) {
      console.log('❌ No alcohol addiction found');
      return;
    }
    
    console.log('🍷 Alcohol Addiction Details:');
    console.log('   Status:', alcoholAddiction.status);
    console.log('   Last Relapse:', alcoholAddiction.lastRelapse);
    console.log('   Relapse Count:', alcoholAddiction.relapseCount);
    
    console.log('\n📋 Milestones:');
    if (alcoholAddiction.milestones && alcoholAddiction.milestones.length > 0) {
      alcoholAddiction.milestones.forEach((milestone, index) => {
        console.log(`   ${index + 1}. ${milestone.type} - ${milestone.date} - ${milestone.description}`);
        if (milestone.daysClean !== undefined) {
          console.log(`      Days clean: ${milestone.daysClean}`);
        }
      });
    } else {
      console.log('   No milestones found');
    }
    
    console.log('\n📝 Notes:');
    if (alcoholAddiction.notes && alcoholAddiction.notes.length > 0) {
      alcoholAddiction.notes.forEach((note, index) => {
        console.log(`   ${index + 1}. [${note.type}] ${note.date} - ${note.note}`);
      });
    } else {
      console.log('   No notes found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMilestones();