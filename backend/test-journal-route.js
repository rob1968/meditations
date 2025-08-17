const mongoose = require('mongoose');
const User = require('./models/User');
const JournalEntry = require('./models/JournalEntry');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meditation-app';

async function testJournalRoute() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const testUserId = '68a02a3173a675b2d6693db1';
    const user = await User.findById(testUserId);
    console.log('User found:', user.username);

    // Test today's entry logic exactly like the route
    console.log('Testing today\'s entry logic...');
    const userId = user._id;
    
    console.log('Fetching today\'s journal entry for user:', userId);
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('Date range:', startOfDay, 'to', endOfDay);
    
    const todayEntry = await JournalEntry.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).populate('userId', 'username');
    
    console.log('Today\'s entry found:', !!todayEntry);
    
    if (todayEntry) {
      console.log('Entry details:', {
        _id: todayEntry._id,
        title: todayEntry.title,
        date: todayEntry.date,
        userId: todayEntry.userId
      });
    }

    // Test the entries route logic
    console.log('\nTesting entries route logic...');
    const filter = { userId };
    console.log('Filter:', filter);
    
    const entries = await JournalEntry.find(filter)
      .populate('userId', 'username')
      .sort({ date: -1 })
      .limit(20);
      
    console.log('Found entries:', entries.length);

    console.log('Test completed successfully');

  } catch (error) {
    console.error('Test error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testJournalRoute();