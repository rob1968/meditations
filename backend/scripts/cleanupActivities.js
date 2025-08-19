const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const Activity = require('../models/Activity');
const ActivityCategory = require('../models/ActivityCategory');

async function cleanupActivityData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Count existing data before cleanup
    const activityCount = await Activity.countDocuments();
    const categoryCount = await ActivityCategory.countDocuments();
    
    console.log('\n📊 Current Activity data:');
    console.log(`  - Activities: ${activityCount}`);
    console.log(`  - Activity Categories: ${categoryCount}`);

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete all calendar/activity data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Starting activity cleanup...\n');

    // 1. Delete all activities
    const deletedActivities = await Activity.deleteMany({});
    console.log(`✅ Deleted ${deletedActivities.deletedCount} activities`);

    // 2. Reset activity count in categories to 0
    const updatedCategories = await ActivityCategory.updateMany(
      {},
      { $set: { activityCount: 0 } }
    );
    console.log(`✅ Reset activity count for ${updatedCategories.modifiedCount} categories`);

    // Optional: Delete categories completely (uncomment if you want to remove categories too)
    // const deletedCategories = await ActivityCategory.deleteMany({});
    // console.log(`✅ Deleted ${deletedCategories.deletedCount} activity categories`);

    console.log('\n🎉 Activity/Calendar cleanup complete!');
    console.log('All activities have been removed from the calendar.');
    console.log('Activity categories are kept but their counts are reset to 0.');
    console.log('The calendar is now completely empty and ready for fresh content.\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
cleanupActivityData();