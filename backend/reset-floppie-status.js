const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');

async function resetFloppieStatus() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔄 Resetting floppie\'s addiction status to test automatic detection...');
    
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    const alcoholAddiction = await Addiction.findOne({ 
      userId: user._id, 
      type: 'alcohol' 
    });
    
    if (!alcoholAddiction) {
      console.log('❌ No alcohol addiction found');
      process.exit(1);
    }
    
    console.log('📊 Current status:');
    console.log(`   Status: ${alcoholAddiction.status}`);
    console.log(`   Relapse Count: ${alcoholAddiction.relapseCount}`);
    
    // Reset to recovering status
    alcoholAddiction.status = 'recovering';
    alcoholAddiction.lastRelapse = null;
    alcoholAddiction.relapseCount = 0;
    alcoholAddiction.notes = [];
    
    await alcoholAddiction.save();
    
    console.log('✅ Status reset to recovering for testing');
    console.log('📝 Now create a new journal entry with alcohol mention to test automatic detection!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

resetFloppieStatus();