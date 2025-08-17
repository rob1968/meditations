const mongoose = require('mongoose');
const User = require('./models/User');

// Test the exact same logic as the route but with detailed error reporting
async function debugCustomBackgrounds() {
  try {
    console.log('=== DEBUGGING CUSTOM BACKGROUNDS ROUTE ===');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meditation-app');
    console.log('✓ Connected to MongoDB');
    
    // Test user lookup (same as auth middleware)
    const testUserId = '68a02a3173a675b2d6693db1';
    console.log('Testing with userId:', testUserId);
    
    const user = await User.findById(testUserId);
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log('✓ User found:', user.username);
    
    // Now test the exact custom backgrounds logic
    const path = require('path');
    const fs = require('fs');
    const fsPromises = require('fs').promises;
    
    const CUSTOM_BACKGROUNDS_DIR = path.join(__dirname, '..', 'custom-backgrounds');
    console.log('CUSTOM_BACKGROUNDS_DIR:', CUSTOM_BACKGROUNDS_DIR);
    console.log('Directory exists:', fs.existsSync(CUSTOM_BACKGROUNDS_DIR));
    
    const backgrounds = [];
    
    // Test system backgrounds loading
    console.log('\n--- Testing System Backgrounds ---');
    const systemDir = path.join(CUSTOM_BACKGROUNDS_DIR, 'system');
    console.log('System dir:', systemDir);
    console.log('System dir exists:', fs.existsSync(systemDir));
    
    if (fs.existsSync(systemDir)) {
      try {
        const systemFiles = await fsPromises.readdir(systemDir);
        console.log('System files found:', systemFiles.length);
        
        for (const file of systemFiles) {
          console.log(`Processing file: ${file}`);
          if (file.endsWith('.json') && file.startsWith('metadata-')) {
            try {
              const metadataPath = path.join(systemDir, file);
              const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
              console.log(`  ✓ Read metadata for: ${metadata.customName}`);
              
              // Check if system audio file exists
              const assetsDir = path.join(__dirname, '..', 'assets');
              const audioPath = path.join(assetsDir, metadata.filename);
              console.log(`  Audio path: ${audioPath}`);
              console.log(`  Audio exists: ${fs.existsSync(audioPath)}`);
              
              if (fs.existsSync(audioPath)) {
                backgrounds.push(metadata);
                console.log(`  ✓ Added: ${metadata.customName}`);
              } else {
                console.log(`  ⚠ Skipped (no audio): ${metadata.customName}`);
              }
            } catch (err) {
              console.error(`  ❌ Error processing ${file}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.error('❌ Error reading system directory:', err.message);
        throw err;
      }
    }
    
    // Test user backgrounds loading
    console.log('\n--- Testing User Backgrounds ---');
    const userDir = path.join(CUSTOM_BACKGROUNDS_DIR, testUserId);
    console.log('User dir:', userDir);
    console.log('User dir exists:', fs.existsSync(userDir));
    
    if (fs.existsSync(userDir)) {
      try {
        const userFiles = await fsPromises.readdir(userDir);
        console.log('User files found:', userFiles.length);
        
        for (const file of userFiles) {
          if (file.endsWith('.json') && file.startsWith('metadata-')) {
            try {
              const metadataPath = path.join(userDir, file);
              const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
              console.log(`  ✓ Read user metadata: ${metadata.customName || metadata.originalName}`);
              
              const audioPath = path.join(userDir, metadata.filename);
              console.log(`  User audio exists: ${fs.existsSync(audioPath)}`);
              
              if (fs.existsSync(audioPath)) {
                backgrounds.push({
                  ...metadata,
                  url: `/custom-backgrounds/${testUserId}/${metadata.filename}`,
                  type: 'user'
                });
                console.log(`  ✓ Added user background`);
              }
            } catch (err) {
              console.error(`  ❌ Error processing user file ${file}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.error('❌ Error reading user directory:', err.message);
        throw err;
      }
    }
    
    console.log('\n--- FINAL RESULTS ---');
    console.log(`Total backgrounds found: ${backgrounds.length}`);
    backgrounds.forEach((bg, i) => {
      console.log(`${i + 1}. ${bg.customName || bg.originalName} (${bg.type || 'system'})`);
    });
    
    console.log('\n✅ Custom backgrounds logic completed successfully!');
    console.log('Response would be:', { backgrounds });
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

debugCustomBackgrounds();