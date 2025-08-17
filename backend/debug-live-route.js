const express = require('express');
const mongoose = require('mongoose');
const auth = require('./middleware/auth');

// Create a minimal express app to test the actual route
const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meditation-app');

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Test route that uses EXACT same logic as custom backgrounds route
app.get('/test-custom-backgrounds', auth, async (req, res) => {
  console.log('=== EXACT ROUTE LOGIC TEST ===');
  console.log('User ID:', req.user._id);
  
  try {
    const path = require('path');
    const fs = require('fs');
    const fsPromises = require('fs').promises;
    
    const userId = req.user._id;
    const backgrounds = [];
    const CUSTOM_BACKGROUNDS_DIR = path.join(__dirname, '..', 'custom-backgrounds');
    
    console.log('1. Testing system backgrounds...');
    const systemDir = path.join(CUSTOM_BACKGROUNDS_DIR, 'system');
    if (fs.existsSync(systemDir)) {
      const systemFiles = await fsPromises.readdir(systemDir);
      console.log('System files:', systemFiles.length);
      
      for (const file of systemFiles) {
        if (file.endsWith('.json') && file.startsWith('metadata-')) {
          try {
            const metadataPath = path.join(systemDir, file);
            const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
            
            const assetsDir = path.join(__dirname, '..', 'assets');
            const audioPath = path.join(assetsDir, metadata.filename);
            if (fs.existsSync(audioPath)) {
              backgrounds.push(metadata);
              console.log('Added system:', metadata.customName);
            }
          } catch (error) {
            console.error(`Error with system file ${file}:`, error.message);
          }
        }
      }
    }
    
    console.log('2. Testing user backgrounds...');
    const userIdString = userId.toString(); // Convert ObjectId to string
    const userDir = path.join(CUSTOM_BACKGROUNDS_DIR, userIdString);
    console.log('User dir:', userDir);
    console.log('User dir exists:', fs.existsSync(userDir));
    
    if (fs.existsSync(userDir)) {
      console.log('Reading user directory...');
      const files = await fsPromises.readdir(userDir);
      console.log('User files:', files.length);

      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('metadata-')) {
          try {
            console.log('Processing user file:', file);
            const metadataPath = path.join(userDir, file);
            const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
            
            const audioPath = path.join(userDir, metadata.filename);
            if (fs.existsSync(audioPath)) {
              backgrounds.push(metadata);
              console.log('Added user background');
            } else {
              console.log('ATTEMPTING TO DELETE ORPHANED FILE:', metadataPath);
              // This could be the problematic line!
              await fsPromises.unlink(metadataPath);
              console.log('Deleted orphaned metadata');
            }
          } catch (error) {
            console.error(`❌ Error with user file ${file}:`, error.message);
            throw error; // Let's see if this is causing the issue
          }
        }
      }
    }
    
    console.log('3. Sorting backgrounds...');
    backgrounds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('4. Sending response...');
    res.json({ backgrounds });
    console.log('✅ EXACT ROUTE LOGIC SUCCESS');
    
  } catch (error) {
    console.error('❌ EXACT ROUTE ERROR:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to get custom backgrounds' });
  }
});

// Start the test server
const PORT = 5005;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`Test the route with: curl -H "x-user-id: 68a02a3173a675b2d6693db1" "http://localhost:${PORT}/test-custom-backgrounds"`);
});