const mongoose = require('mongoose');
const User = require('./models/User');
const JournalEntry = require('./models/JournalEntry');

// MongoDB connection - adjust if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meditation-app';

async function testAuth() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const testUserId = '68a02a3173a675b2d6693db1';
    console.log('Testing with userId:', testUserId);

    // Check if user exists
    const user = await User.findById(testUserId);
    console.log('User found:', user ? user.username : 'NOT FOUND');

    if (!user) {
      console.log('User not found, checking all users...');
      const allUsers = await User.find({}).limit(5);
      console.log('Available users:', allUsers.map(u => ({ id: u._id, username: u.username })));
      return;
    }

    // Check journal entries for this user
    console.log('Checking journal entries...');
    const entries = await JournalEntry.find({ userId: testUserId }).limit(5);
    console.log('Found entries with exact userId match:', entries.length);

    // Try with ObjectId
    const entriesObjectId = await JournalEntry.find({ userId: user._id }).limit(5);
    console.log('Found entries with ObjectId match:', entriesObjectId.length);

    // Check today's entry
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const todayEntry = await JournalEntry.findOne({
      userId: user._id,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    
    console.log('Today entry found:', !!todayEntry);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAuth();