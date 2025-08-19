const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UserConnection = require('../models/UserConnection');
const User = require('../models/User');

async function cleanupMeetData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Count existing data before cleanup
    const conversationCount = await Conversation.countDocuments();
    const messageCount = await Message.countDocuments();
    const connectionCount = await UserConnection.countDocuments();
    
    console.log('\n📊 Current Meet data:');
    console.log(`  - Conversations: ${conversationCount}`);
    console.log(`  - Messages: ${messageCount}`);
    console.log(`  - User Connections: ${connectionCount}`);

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete all Meet hub data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Starting cleanup...\n');

    // 1. Delete all messages
    const deletedMessages = await Message.deleteMany({});
    console.log(`✅ Deleted ${deletedMessages.deletedCount} messages`);

    // 2. Delete all conversations
    const deletedConversations = await Conversation.deleteMany({});
    console.log(`✅ Deleted ${deletedConversations.deletedCount} conversations`);

    // 3. Delete all user connections
    const deletedConnections = await UserConnection.deleteMany({});
    console.log(`✅ Deleted ${deletedConnections.deletedCount} user connections`);

    // 4. Clear Meet-related fields from users (optional)
    // This keeps user accounts but removes Meet-specific data
    const updatedUsers = await User.updateMany(
      {},
      {
        $unset: {
          lastSeenInMeet: 1,
          meetPreferences: 1,
          meetProfile: 1
        }
      }
    );
    console.log(`✅ Cleaned Meet data from ${updatedUsers.modifiedCount} users`);

    console.log('\n🎉 Meet hub cleanup complete!');
    console.log('All conversations, messages, and connections have been removed.');
    console.log('The Meet hub is now ready for a fresh start.\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
cleanupMeetData();