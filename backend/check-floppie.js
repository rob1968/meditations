const mongoose = require('mongoose');
const User = require('./models/User');
const Addiction = require('./models/Addiction');
const JournalEntry = require('./models/JournalEntry');

async function checkFloppie() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meditation-app');
    console.log('🔍 Checking floppie\'s addictions and recent journal entries...');
    
    const user = await User.findOne({ username: 'floppie' });
    if (!user) {
      console.log('❌ User floppie not found');
      process.exit(1);
    }
    
    console.log('✅ User floppie ID:', user._id);
    
    // Check addictions
    const addictions = await Addiction.find({ userId: user._id });
    console.log('\n📊 Floppie\'s addictions:');
    addictions.forEach(addiction => {
      console.log(`- Type: ${addiction.type}`);
      console.log(`  Status: ${addiction.status}`);
      console.log(`  Last Relapse: ${addiction.lastRelapse || 'Never'}`);
      console.log(`  Relapse Count: ${addiction.relapseCount}`);
      console.log(`  Notes: ${addiction.notes.length} notes`);
      console.log('');
    });
    
    // Check recent journal entries
    const recentEntries = await JournalEntry.find({ userId: user._id }).sort({ date: -1 }).limit(5);
    console.log('📝 Recent journal entries:');
    recentEntries.forEach((entry, index) => {
      console.log(`${index + 1}. Date: ${entry.date.toISOString().split('T')[0]}`);
      console.log(`   Title: ${entry.title}`);
      console.log(`   Content: ${entry.content.substring(0, 200)}...`);
      console.log(`   Mood: ${entry.mood || 'No mood'}`);
      
      // Check for alcohol keywords
      const alcoholKeywords = ['wijn', 'wine', 'alcohol', 'drink', 'drank', 'gedronken', 'bier', 'beer'];
      const hasAlcoholMention = alcoholKeywords.some(keyword => 
        entry.content.toLowerCase().includes(keyword) || 
        entry.title.toLowerCase().includes(keyword)
      );
      if (hasAlcoholMention) {
        console.log('   🍷 ALCOHOL MENTION DETECTED!');
      }
      console.log('');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkFloppie();