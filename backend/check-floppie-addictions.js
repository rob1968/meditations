const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');

async function checkFloppieAddictions() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔗 Connected to MongoDB');
    
    // Find user floppie
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('❌ User floppie not found');
      return;
    }
    
    console.log('👤 User floppie found:');
    console.log('   ID:', user._id);
    console.log('   Username:', user.username);
    console.log('   Preferred Language:', user.preferredLanguage);
    
    // Find all addictions for floppie
    const addictions = await Addiction.find({ userId: user._id });
    console.log('\n🔍 Total addictions found:', addictions.length);
    
    addictions.forEach((addiction, index) => {
      console.log(`\n📋 Addiction ${index + 1}:`);
      console.log(`   Type: ${addiction.type}`);
      console.log(`   Status: ${addiction.status}`);
      console.log(`   Created: ${addiction.createdAt}`);
      console.log(`   Last Relapse: ${addiction.lastRelapse || 'Never'}`);
      console.log(`   Relapse Count: ${addiction.relapseCount || 0}`);
      
      if (addiction.notes && addiction.notes.length > 0) {
        console.log(`   Notes: ${addiction.notes.length} notes`);
        addiction.notes.slice(-2).forEach((note, i) => {
          console.log(`     ${note.date}: ${note.note.substring(0, 60)}...`);
        });
      }
    });
    
    // Test the query used in relapse detection
    console.log('\n🔍 Testing relapse detection query...');
    const activeAddictions = await Addiction.find({ 
      userId: user._id, 
      status: { $in: ['active', 'recovering'] } 
    });
    console.log('Active/recovering addictions:', activeAddictions.length);
    
    activeAddictions.forEach((addiction, index) => {
      console.log(`   ${index + 1}. ${addiction.type} - ${addiction.status}`);
    });
    
    // Test with different status values
    console.log('\n🔍 Testing different status queries...');
    const allStatuses = await Addiction.find({ userId: user._id }).distinct('status');
    console.log('All addiction statuses:', allStatuses);
    
    for (const status of allStatuses) {
      const count = await Addiction.countDocuments({ 
        userId: user._id, 
        status: status 
      });
      console.log(`   ${status}: ${count} addictions`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFloppieAddictions();