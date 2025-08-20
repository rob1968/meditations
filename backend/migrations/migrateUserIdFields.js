#!/usr/bin/env node
/**
 * Database Migration Script: userId → user field standardization
 * 
 * This script migrates database collections that use `userId` field to use `user` field
 * for consistency across the application.
 * 
 * Collections affected:
 * - notifications: userId → user
 * - journalentries: userId → user, likes.userId → likes.user
 * - addictions: userId → user
 * - aicoaches: userId → user
 * 
 * Usage: node migrations/migrateUserIdFields.js [--dry-run]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meditations';
const DRY_RUN = process.argv.includes('--dry-run');

async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB:', DB_URI);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrateCollection(collectionName, updates) {
  console.log(`\n🔄 Migrating collection: ${collectionName}`);
  
  const collection = mongoose.connection.db.collection(collectionName);
  
  // Count documents that need migration
  const needsMigration = await collection.countDocuments({ userId: { $exists: true } });
  console.log(`📊 Found ${needsMigration} documents with 'userId' field`);
  
  if (needsMigration === 0) {
    console.log('✅ No migration needed for this collection');
    return { modified: 0, errors: 0 };
  }
  
  if (DRY_RUN) {
    console.log('🏃 DRY RUN: Would migrate these documents but not making changes');
    return { modified: needsMigration, errors: 0 };
  }
  
  let modified = 0;
  let errors = 0;
  
  try {
    for (const update of updates) {
      const result = await collection.updateMany(update.filter, update.update);
      console.log(`   ✅ ${update.description}: ${result.modifiedCount} documents updated`);
      modified += result.modifiedCount;
    }
  } catch (error) {
    console.error(`   ❌ Error migrating ${collectionName}:`, error);
    errors++;
  }
  
  return { modified, errors };
}

async function main() {
  console.log('🚀 Starting database field migration: userId → user');
  console.log('📅 Date:', new Date().toISOString());
  console.log('🎛️  Mode:', DRY_RUN ? 'DRY RUN' : 'LIVE MIGRATION');
  
  await connectDB();
  
  const migrations = [
    {
      collection: 'notifications',
      updates: [
        {
          filter: { userId: { $exists: true } },
          update: { $rename: { userId: 'user' } },
          description: 'Rename userId → user'
        }
      ]
    },
    {
      collection: 'journalentries',
      updates: [
        {
          filter: { userId: { $exists: true } },
          update: { $rename: { userId: 'user' } },
          description: 'Rename userId → user'
        },
        {
          filter: { 'likes.userId': { $exists: true } },
          update: { $rename: { 'likes.$[].userId': 'likes.$[].user' } },
          description: 'Rename likes.userId → likes.user'
        }
      ]
    },
    {
      collection: 'addictions',
      updates: [
        {
          filter: { userId: { $exists: true } },
          update: { $rename: { userId: 'user' } },
          description: 'Rename userId → user'
        }
      ]
    },
    {
      collection: 'aicoaches',
      updates: [
        {
          filter: { userId: { $exists: true } },
          update: { $rename: { userId: 'user' } },
          description: 'Rename userId → user'
        }
      ]
    }
  ];
  
  let totalModified = 0;
  let totalErrors = 0;
  
  for (const migration of migrations) {
    const result = await migrateCollection(migration.collection, migration.updates);
    totalModified += result.modified;
    totalErrors += result.errors;
  }
  
  console.log('\n📈 Migration Summary:');
  console.log(`   📝 Total documents modified: ${totalModified}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
  
  if (DRY_RUN) {
    console.log('\n🏃 DRY RUN completed - no actual changes made');
    console.log('💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log('🔄 Please restart your application to apply schema changes');
  }
  
  // Verify migration success
  if (!DRY_RUN && totalErrors === 0) {
    console.log('\n🔍 Verification check:');
    for (const migration of migrations) {
      const collection = mongoose.connection.db.collection(migration.collection);
      const remaining = await collection.countDocuments({ userId: { $exists: true } });
      if (remaining === 0) {
        console.log(`   ✅ ${migration.collection}: No userId fields remaining`);
      } else {
        console.log(`   ⚠️  ${migration.collection}: ${remaining} userId fields still exist`);
      }
    }
  }
  
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});