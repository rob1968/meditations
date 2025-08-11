const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Meditation = require('../models/Meditation');
const JournalEntry = require('../models/JournalEntry');
const AICoach = require('../models/AICoach');
const SharedMeditation = require('../models/SharedMeditation');
const Addiction = require('../models/Addiction');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
const crypto = require('crypto');
const axios = require('axios');
const { getElevenlabsStats } = require('../utils/elevenlabsTracking');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'assets', 'images', 'custom');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random hash
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, 'meditation-' + uniqueSuffix + extension);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Function to extract audio duration using ffprobe
const getAudioDuration = async (filePath) => {
  return new Promise((resolve, reject) => {
    const ffprobePath = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';
    
    const ffprobe = spawn(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let output = '';
    let error = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      error += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed with code ${code}: ${error}`));
        return;
      }

      try {
        const metadata = JSON.parse(output);
        const duration = parseFloat(metadata.format.duration);
        resolve(duration);
      } catch (parseError) {
        reject(new Error(`Failed to parse ffprobe output: ${parseError.message}`));
      }
    });
  });
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      birthDate, 
      age, 
      country, 
      countryCode, 
      city, 
      gender, 
      preferredLanguage, 
      bio,
      locationData 
    } = req.body;
    
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Create new user with profile information
    const userData = {
      username: username.trim()
    };
    
    // Add optional profile fields if provided
    if (birthDate) {
      userData.birthDate = new Date(birthDate);
    }
    if (age) {
      userData.age = age;
    }
    if (city || country || countryCode || locationData) {
      userData.location = {
        city: city || '',
        country: country || '',
        countryCode: countryCode || ''
      };
      
      // Add Google Places data if provided
      if (locationData) {
        if (locationData.placeId) {
          userData.location.placeId = locationData.placeId;
        }
        if (locationData.formattedAddress) {
          userData.location.formattedAddress = locationData.formattedAddress;
        }
        if (locationData.coordinates) {
          userData.location.coordinates = {
            latitude: locationData.coordinates.lat,
            longitude: locationData.coordinates.lng
          };
        }
      }
    }
    if (gender) {
      userData.gender = gender;
    }
    if (preferredLanguage) {
      userData.preferredLanguage = preferredLanguage;
    }
    if (bio) {
      userData.bio = bio;
    }
    
    const user = new User(userData);
    await user.save();
    
    // Initialize credits for new user
    await user.initializeCredits();
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        birthDate: user.birthDate,
        age: user.age,
        location: user.location,
        gender: user.gender,
        preferredLanguage: user.preferredLanguage,
        bio: user.bio,
        credits: user.credits,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    
    // Find user
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(404).json({ error: 'Username not found' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        birthDate: user.birthDate,
        age: user.age,
        location: user.location,
        gender: user.gender,
        preferredLanguage: user.preferredLanguage,
        bio: user.bio,
        credits: user.credits,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user's meditation history
router.get('/user/:userId/meditations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).populate({
      path: 'meditations',
      options: { sort: { createdAt: -1 } }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      meditations: user.meditations
    });
  } catch (error) {
    console.error('Error fetching user meditations:', error);
    res.status(500).json({ error: 'Failed to fetch meditations' });
  }
});

// Get user statistics
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    try {
      const user = await User.findById(userId).populate('meditations');
      
      if (!user) {
        // Return default stats if user not found or DB unavailable
        return res.json({
          totalMeditations: 0,
          totalTime: 0,
          uniqueLanguages: 0,
          totalAudioFiles: 0,
          meditationTypes: {},
          favoriteType: 'sleep'
        });
      }
      
      const meditations = user.meditations;
      
      // Calculate statistics
      const totalMeditations = meditations.length;
      const totalTime = meditations.reduce((total, meditation) => total + meditation.duration, 0);
      
      // Count unique languages
      const languages = new Set();
      meditations.forEach(meditation => {
        languages.add(meditation.originalLanguage);
        if (meditation.audioFiles) {
          meditation.audioFiles.forEach(audio => {
            languages.add(audio.language);
          });
        }
      });
      
      // Count meditation types
      const meditationTypes = {};
      meditations.forEach(meditation => {
        meditationTypes[meditation.meditationType] = (meditationTypes[meditation.meditationType] || 0) + 1;
      });
      
      // Total audio files generated
      const totalAudioFiles = meditations.reduce((total, meditation) => {
        return total + (meditation.audioFiles ? meditation.audioFiles.length : 0);
      }, 0);
      
      res.json({
        totalMeditations,
        totalTime,
        uniqueLanguages: languages.size,
        totalAudioFiles,
        meditationTypes,
        favoriteType: Object.keys(meditationTypes).reduce((a, b) => 
          meditationTypes[a] > meditationTypes[b] ? a : b, 'sleep'
        )
      });
    } catch (dbError) {
      // Database connection failed, return default stats
      console.log('Database unavailable, returning default stats');
      res.json({
        totalMeditations: 0,
        totalTime: 0,
        uniqueLanguages: 0,
        totalAudioFiles: 0,
        meditationTypes: {},
        favoriteType: 'sleep'
      });
    }
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Upload custom image for meditation
router.post('/meditation/:meditationId/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { meditationId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    // Find the meditation
    const meditation = await Meditation.findById(meditationId);
    if (!meditation) {
      return res.status(404).json({ error: 'Meditation not found' });
    }
    
    // Delete old custom image if exists
    if (meditation.customImage && meditation.customImage.filename) {
      const oldImagePath = path.join(__dirname, '..', 'assets', 'images', 'custom', meditation.customImage.filename);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // Save new image info
    meditation.customImage = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      uploadedAt: new Date()
    };
    
    await meditation.save();
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: `/assets/images/custom/${req.file.filename}`,
      filename: req.file.filename
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Delete custom image for meditation
router.delete('/meditation/:meditationId/custom-image', async (req, res) => {
  try {
    const { meditationId } = req.params;
    
    const meditation = await Meditation.findById(meditationId);
    if (!meditation) {
      return res.status(404).json({ error: 'Meditation not found' });
    }
    
    if (meditation.customImage && meditation.customImage.filename) {
      // Delete the image file
      const imagePath = path.join(__dirname, '..', 'assets', 'images', 'custom', meditation.customImage.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      
      // Remove from database
      meditation.customImage = undefined;
      await meditation.save();
      
      res.json({ message: 'Custom image deleted successfully' });
    } else {
      res.status(404).json({ error: 'No custom image found' });
    }
    
  } catch (error) {
    console.error('Error deleting custom image:', error);
    res.status(500).json({ error: 'Failed to delete custom image' });
  }
});

// Update existing audio files with duration
router.post('/update-audio-durations', async (req, res) => {
  try {
    console.log('Starting audio duration update process...');
    
    // Get all meditations with audio files
    const meditations = await Meditation.find({
      'audioFiles.0': { $exists: true }
    });
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const meditation of meditations) {
      let meditationUpdated = false;
      
      for (let i = 0; i < meditation.audioFiles.length; i++) {
        const audioFile = meditation.audioFiles[i];
        
        // Skip if duration already exists
        if (audioFile.duration) {
          continue;
        }
        
        // Construct path to audio file
        const audioPath = path.join(__dirname, '..', 'assets', 'meditations', audioFile.filename);
        
        // Check if file exists
        if (!fs.existsSync(audioPath)) {
          console.warn(`Audio file not found: ${audioPath}`);
          errorCount++;
          continue;
        }
        
        try {
          // Extract duration
          const duration = await getAudioDuration(audioPath);
          
          // Update the audio file with duration
          meditation.audioFiles[i].duration = duration;
          meditationUpdated = true;
          
          console.log(`Updated ${audioFile.filename} with duration: ${duration}s`);
          updatedCount++;
        } catch (durationError) {
          console.error(`Failed to extract duration from ${audioFile.filename}:`, durationError.message);
          errorCount++;
        }
      }
      
      // Save meditation if any audio files were updated
      if (meditationUpdated) {
        await meditation.save();
      }
    }
    
    console.log(`Audio duration update completed. Updated: ${updatedCount}, Errors: ${errorCount}`);
    
    res.json({
      message: 'Audio duration update completed',
      updatedCount,
      errorCount,
      totalProcessed: updatedCount + errorCount
    });
    
  } catch (error) {
    console.error('Error updating audio durations:', error);
    res.status(500).json({ error: 'Failed to update audio durations' });
  }
});

// Credit Management Routes

// Get user credits and stats
router.get('/user/:id/credits', async (req, res) => {
  try {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        // Return default credits if user not found or DB unavailable
        return res.json({
          credits: 10,
          totalCreditsEarned: 10,
          totalCreditsSpent: 0
        });
      }
      
      res.json({
        credits: user.credits,
        totalCreditsEarned: user.totalCreditsEarned,
        totalCreditsSpent: user.totalCreditsSpent
      });
    } catch (dbError) {
      // Database connection failed, return default credits
      console.log('Database unavailable, returning default credits');
      res.json({
        credits: 10,
        totalCreditsEarned: 10,
        totalCreditsSpent: 0
      });
    }
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

// Get ElevenLabs usage stats for a user
router.get('/user/:id/elevenlabs-stats', async (req, res) => {
  try {
    const stats = await getElevenlabsStats(req.params.id);
    if (!stats) {
      // Return default/test data if user not found or no data available
      return res.json({
        charactersUsedTotal: 0,
        charactersUsedThisMonth: 0,
        estimatedCostThisMonth: 0,
        currentTier: {
          name: 'Free',
          limit: 10000,
          price: 0
        },
        nextTierLimit: 10000,
        lastReset: new Date()
      });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching ElevenLabs stats:', error);
    // Return default data on error as well
    res.json({
      charactersUsedTotal: 0,
      charactersUsedThisMonth: 0,
      estimatedCostThisMonth: 0,
      currentTier: {
        name: 'Free',
        limit: 10000,
        price: 0
      },
      nextTierLimit: 10000,
      lastReset: new Date()
    });
  }
});

// Get credit transaction history
router.get('/user/:id/credit-history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Sort transactions by newest first and apply pagination
    const transactions = user.creditTransactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      transactions,
      total: user.creditTransactions.length
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    res.status(500).json({ error: 'Failed to fetch credit history' });
  }
});

// Spend credits (internal route for meditation generation/sharing)
router.post('/user/:id/credits/spend', async (req, res) => {
  try {
    const { amount, type, description, relatedId } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.hasEnoughCredits(amount)) {
      return res.status(400).json({ 
        error: 'Insufficient credits',
        currentCredits: user.credits,
        required: amount
      });
    }
    
    await user.spendCredits(amount, type, description, relatedId);
    
    res.json({
      success: true,
      creditsRemaining: user.credits,
      transaction: {
        type,
        amount: -amount,
        description,
        relatedId
      }
    });
  } catch (error) {
    console.error('Error spending credits:', error);
    if (error.message === 'Insufficient credits') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to spend credits' });
  }
});

// Add credits (for future payment integration)
router.post('/user/:id/credits/add', async (req, res) => {
  try {
    const { amount, type = 'purchase', description, relatedId } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    await user.addCredits(amount, type, description, relatedId);
    
    res.json({
      success: true,
      creditsTotal: user.credits,
      transaction: {
        type,
        amount,
        description,
        relatedId
      }
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ error: 'Failed to add credits' });
  }
});

// Update user profile
router.put('/user/:id/profile', async (req, res) => {
  try {
    const { preferredLanguage, city, country, countryCode, gender, bio, locationData } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate gender enum before saving
    if (gender !== undefined && gender !== null && gender !== '') {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ 
          error: 'Invalid gender value. Must be one of: ' + validGenders.join(', ')
        });
      }
    }
    
    // Validate preferredLanguage enum before saving
    if (preferredLanguage !== undefined && preferredLanguage !== null && preferredLanguage !== '') {
      const validLanguages = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'nl'];
      if (!validLanguages.includes(preferredLanguage)) {
        return res.status(400).json({ 
          error: 'Invalid language value. Must be one of: ' + validLanguages.join(', ')
        });
      }
    }
    
    // Validate field lengths
    if (bio !== undefined && bio !== null && bio.length > 500) {
      return res.status(400).json({ error: 'Bio must be 500 characters or less' });
    }
    if (city !== undefined && city !== null && city.length > 100) {
      return res.status(400).json({ error: 'City name must be 100 characters or less' });
    }
    if (country !== undefined && country !== null && country.length > 100) {
      return res.status(400).json({ error: 'Country name must be 100 characters or less' });
    }
    if (countryCode !== undefined && countryCode !== null && countryCode.length > 5) {
      return res.status(400).json({ error: 'Country code must be 5 characters or less' });
    }
    
    // Update user profile fields
    if (preferredLanguage !== undefined) {
      user.preferredLanguage = preferredLanguage === '' ? undefined : preferredLanguage;
    }
    
    if (city !== undefined || country !== undefined || countryCode !== undefined || locationData) {
      // Ensure location object exists
      if (!user.location) {
        user.location = {};
      }
      
      user.location = {
        city: city !== undefined ? city : (user.location.city || ''),
        country: country !== undefined ? country : (user.location.country || ''),
        countryCode: countryCode !== undefined ? countryCode : (user.location.countryCode || ''),
        // Google Places data - only set if they have actual values
        ...(locationData?.placeId && { placeId: locationData.placeId }),
        ...(user.location?.placeId && !locationData?.placeId && { placeId: user.location.placeId }),
        ...(locationData?.formattedAddress && { formattedAddress: locationData.formattedAddress }),
        ...(user.location?.formattedAddress && !locationData?.formattedAddress && { formattedAddress: user.location.formattedAddress }),
        // Only include coordinates if they have valid latitude/longitude format
        ...(locationData?.coordinates?.latitude && locationData?.coordinates?.longitude && { 
          coordinates: {
            latitude: locationData.coordinates.latitude,
            longitude: locationData.coordinates.longitude
          }
        }),
        ...(user.location?.coordinates?.latitude && user.location?.coordinates?.longitude && !locationData?.coordinates && { 
          coordinates: {
            latitude: user.location.coordinates.latitude,
            longitude: user.location.coordinates.longitude
          }
        })
      };
    }
    
    if (gender !== undefined) {
      user.gender = gender === '' ? undefined : gender;
    }
    
    if (bio !== undefined) {
      user.bio = bio;
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        preferredLanguage: user.preferredLanguage,
        location: user.location,
        gender: user.gender,
        bio: user.bio,
        age: user.age,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    // Handle specific Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    // Handle cast errors (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Pi Network authentication
router.post('/pi-login', async (req, res) => {
  try {
    const { piUserId, piUsername, accessToken, authMethod } = req.body;
    
    console.log('Pi authentication request:', { 
      piUserId, 
      piUsername, 
      authMethod,
      userIdType: typeof piUserId,
      userIdLength: piUserId ? piUserId.length : 0
    });
    
    // Enhanced validation for Pi authentication data
    if (!piUserId || typeof piUserId !== 'string' || piUserId.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid Pi user ID is required',
        errorCode: 'INVALID_PI_USER_ID'
      });
    }
    
    if (!piUsername || typeof piUsername !== 'string' || piUsername.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid Pi username is required',
        errorCode: 'INVALID_PI_USERNAME'
      });
    }
    
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid Pi access token is required',
        errorCode: 'INVALID_ACCESS_TOKEN'
      });
    }
    
    if (authMethod !== 'pi') {
      return res.status(400).json({
        success: false,
        error: 'Invalid authentication method. Expected "pi"',
        errorCode: 'INVALID_AUTH_METHOD'
      });
    }
    
    // Additional validation for Pi fields length and format
    if (piUserId.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Pi user ID too long',
        errorCode: 'PI_USER_ID_TOO_LONG'
      });
    }
    
    if (piUsername.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Pi username too long',
        errorCode: 'PI_USERNAME_TOO_LONG'
      });
    }
    
    // Sanitize inputs
    const sanitizedPiUserId = piUserId.trim();
    const sanitizedPiUsername = piUsername.trim();
    const sanitizedAccessToken = accessToken.trim();
    
    let verifiedUsername = sanitizedPiUsername; // Default to provided username
    
    // Verify Pi Network access token with Pi Platform API
    try {
      console.log('Verifying Pi authentication with Pi Platform API...');
      
      // Determine API URL based on sandbox mode
      const piApiBaseUrl = process.env.PI_SANDBOX_MODE === 'true' 
        ? 'https://sandbox.minepi.com' 
        : 'https://api.minepi.com';
      
      console.log('Using Pi API URL:', piApiBaseUrl);
      
      // Call Pi Platform API to verify user
      const verifyResponse = await axios.get(`${piApiBaseUrl}/v2/me`, {
        headers: {
          'Authorization': `Bearer ${sanitizedAccessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Pi Platform API verification successful:', {
        uid: verifyResponse.data.uid,
        username: verifyResponse.data.username
      });
      
      // Check if Pi API returned valid data
      if (!verifyResponse.data.uid || !verifyResponse.data.username) {
        console.warn('Pi API returned incomplete data:', {
          uid: verifyResponse.data.uid,
          username: verifyResponse.data.username,
          rawResponse: verifyResponse.data
        });
        
        // In sandbox mode, Pi API might not return complete data
        // For development purposes, we'll allow authentication with provided credentials
        if (process.env.PI_SANDBOX_MODE === 'true') {
          console.warn('Sandbox mode: Accepting authentication despite incomplete Pi API response');
          // Use the provided credentials since Pi sandbox API is unreliable
          verifiedUsername = sanitizedPiUsername;
        } else {
          // In production, require valid Pi API response
          return res.status(401).json({
            success: false,
            error: 'Pi API verification failed: Incomplete user data received',
            errorCode: 'PI_API_INCOMPLETE_DATA'
          });
        }
      } else {
        // Verify that the user data matches
        // Allow for case-insensitive comparison and trim whitespace
        const claimedId = sanitizedPiUserId.toLowerCase().trim();
        const verifiedId = (verifyResponse.data.uid || '').toString().toLowerCase().trim();
        
        if (claimedId !== verifiedId) {
          console.error('Pi user ID mismatch:', {
            claimed: sanitizedPiUserId,
            claimedLower: claimedId,
            verified: verifyResponse.data.uid,
            verifiedLower: verifiedId,
            claimedLength: claimedId.length,
            verifiedLength: verifiedId.length
          });
          
          return res.status(401).json({
            success: false,
            error: 'Pi user verification failed: User ID mismatch',
            errorCode: 'PI_USER_ID_MISMATCH'
          });
        }
        
        // Update username if Pi Platform API returns a different one
        verifiedUsername = verifyResponse.data.username || sanitizedPiUsername;
      }
      
    } catch (verifyError) {
      console.error('Pi Platform API verification failed:', verifyError.message);
      
      if (verifyError.response) {
        console.error('Pi API response:', {
          status: verifyError.response.status,
          data: verifyError.response.data
        });
        
        if (verifyError.response.status === 401) {
          return res.status(401).json({
            success: false,
            error: 'Pi authentication token is invalid or expired',
            errorCode: 'PI_TOKEN_INVALID'
          });
        }
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to verify Pi authentication',
        errorCode: 'PI_VERIFICATION_FAILED'
      });
    }
    
    // Check if user already exists with this Pi ID
    let user = await User.findOne({ piUserId: sanitizedPiUserId });
    
    if (user) {
      // Existing Pi user, update last login and username if changed
      console.log('Existing Pi user found:', user.username);
      
      // Update Pi username if it has changed (use verified username)
      if (user.piUsername !== verifiedUsername) {
        user.piUsername = verifiedUsername;
      }
      
      user.lastLogin = new Date();
      await user.save();
      
      console.log('Pi user login successful:', user.username);
    } else {
      // New Pi user, create account
      console.log('Creating new Pi user:', sanitizedPiUsername);
      
      // Generate a unique username based on verified Pi username with error handling
      let username = verifiedUsername;
      let counter = 1;
      const maxAttempts = 100; // Prevent infinite loops
      
      // Ensure username is unique in our system
      try {
        while (await User.findOne({ username: username }) && counter <= maxAttempts) {
          username = `${sanitizedPiUsername}_${counter}`;
          counter++;
        }
        
        if (counter > maxAttempts) {
          return res.status(500).json({
            success: false,
            error: 'Unable to generate unique username',
            errorCode: 'USERNAME_GENERATION_FAILED'
          });
        }
      } catch (dbError) {
        console.error('Database error during username check:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error during user creation',
          errorCode: 'DATABASE_ERROR'
        });
      }
      
      // Create new user with Pi authentication and enhanced error handling
      try {
        user = new User({
          username: username,
          authMethod: 'pi',
          piUserId: sanitizedPiUserId,
          piUsername: verifiedUsername,
          // Default values for Pi users
          credits: 10,
          totalCreditsEarned: 10,
          preferredLanguage: 'en', // Default to English, can be changed later
          createdAt: new Date(),
          lastLogin: new Date()
        });
        
        await user.save();
      } catch (userCreationError) {
        console.error('Error creating Pi user:', userCreationError);
        
        // Handle specific Mongoose validation errors
        if (userCreationError.name === 'ValidationError') {
          const validationErrors = Object.values(userCreationError.errors).map(err => err.message);
          return res.status(400).json({
            success: false,
            error: 'User validation failed',
            details: validationErrors,
            errorCode: 'USER_VALIDATION_ERROR'
          });
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to create Pi user account',
          errorCode: 'USER_CREATION_FAILED'
        });
      }
      
      // Initialize welcome credits
      await user.initializeCredits();
      
      console.log('New Pi user created successfully:', user.username);
    }
    
    // Create user credits object
    const userCredits = {
      credits: user.credits,
      totalCreditsEarned: user.totalCreditsEarned,
      totalCreditsSpent: user.totalCreditsSpent
    };
    
    // Return success response
    res.json({
      success: true,
      message: user.isNew ? 'Pi user created successfully' : 'Pi login successful',
      user: {
        id: user._id,
        username: user.username,
        authMethod: user.authMethod,
        piUsername: user.piUsername,
        preferredLanguage: user.preferredLanguage,
        location: user.location,
        gender: user.gender,
        bio: user.bio,
        age: user.age,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      token: accessToken, // Use Pi's access token for now
      credits: userCredits
    });
    
  } catch (error) {
    console.error('Error in Pi authentication:', error);
    
    // Handle duplicate key errors (shouldn't happen with sparse index, but just in case)
    if (error.code === 11000) {
      if (error.message.includes('piUserId')) {
        return res.status(400).json({ 
          success: false,
          error: 'Pi user ID already exists in system' 
        });
      }
      if (error.message.includes('username')) {
        return res.status(400).json({ 
          success: false,
          error: 'Username already taken' 
        });
      }
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Pi authentication failed' 
    });
  }
});

// Pi Network validation key endpoint
router.get('/validation-key', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(process.env.PI_VALIDATION_KEY || 'e9ab4e70062f0f03a03f2e7be0d6f536690d28a03ccdc86892107e131516eaec58ae98d059f7f9f81d2fd956e18ba2945562bea7f01e711d1743e45120baf9f7');
});

// Delete user account and all associated data
router.delete('/delete-account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirmUsername } = req.body;

    console.log('[Auth] Account deletion request for userId:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify username confirmation
    if (confirmUsername !== user.username) {
      return res.status(400).json({
        success: false,
        error: 'Username confirmation does not match'
      });
    }

    // Comprehensive user data deletion
    const deletionResults = await deleteAllUserData(userId, user.username);

    res.json({
      success: true,
      message: 'Account and all associated data deleted successfully',
      deletedData: deletionResults
    });

  } catch (error) {
    console.error('[Auth] Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
});

// Complete Pi user registration with additional profile information
router.post('/complete-pi-registration', async (req, res) => {
  try {
    const { userId, username, birthDate, age, country, countryCode, city, gender, preferredLanguage, bio, locationData } = req.body;

    console.log('[Auth] Completing Pi user registration for userId:', userId, 'with username:', username);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 20 characters'
      });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists. Please choose a different username.'
      });
    }

    // Find and update the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update username
    user.username = username.trim();

    // Update user profile with provided information
    if (birthDate) {
      user.birthDate = new Date(birthDate);
      user.age = age;
    }
    if (country) {
      user.location.country = country;
      user.location.countryCode = countryCode;
    }
    if (city) {
      user.location.city = city;
    }
    
    // Update Google Places location data if provided
    if (locationData) {
      if (locationData.placeId) {
        user.location.placeId = locationData.placeId;
      }
      if (locationData.formattedAddress) {
        user.location.formattedAddress = locationData.formattedAddress;
      }
      if (locationData.coordinates) {
        user.location.coordinates = {
          latitude: locationData.coordinates.lat,
          longitude: locationData.coordinates.lng
        };
      }
    }
    if (gender) {
      user.gender = gender;
    }
    if (preferredLanguage) {
      user.preferredLanguage = preferredLanguage;
    }
    if (bio) {
      user.bio = bio;
    }

    // Mark profile as updated
    user.profileUpdatedAt = new Date();

    await user.save();

    console.log('[Auth] Pi user registration completed successfully for:', user.username);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        piUserId: user.piUserId,
        piUsername: user.piUsername,
        credits: user.credits,
        birthDate: user.birthDate,
        age: user.age,
        location: user.location,
        gender: user.gender,
        preferredLanguage: user.preferredLanguage,
        bio: user.bio,
        authMethod: 'pi',
        createdAt: user.createdAt,
        profileUpdatedAt: user.profileUpdatedAt
      }
    });

  } catch (error) {
    console.error('[Auth] Error completing Pi registration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete registration'
    });
  }
});

/**
 * Complete user data cleanup function
 * Removes all traces of user from database and filesystem
 */
async function deleteAllUserData(userId, username) {
  const results = {
    username: username,
    deletedMeditations: 0,
    deletedJournalEntries: 0,
    deletedAICoachSessions: 0,
    deletedSharedMeditations: 0,
    deletedAddictions: 0,
    deletedNotifications: 0,
    deletedCustomBackgrounds: 0,
    deletedVoiceClones: 0,
    deletedJournalAudio: 0,
    deletedUserMeditations: 0,
    removedLikes: 0,
    deletedUserRecord: false
  };
  
  console.log(`🗑️ Starting comprehensive deletion for user ${username} (${userId})`);
  
  try {
    // 1. Delete all user's meditations (Meditation model uses 'user' field)
    const deletedMeditations = await Meditation.deleteMany({ user: userId });
    results.deletedMeditations = deletedMeditations.deletedCount;
    console.log(`✅ Deleted ${results.deletedMeditations} meditations`);
    
    // 2. Delete all journal entries
    const deletedJournalEntries = await JournalEntry.deleteMany({ userId });
    results.deletedJournalEntries = deletedJournalEntries.deletedCount;
    console.log(`✅ Deleted ${results.deletedJournalEntries} journal entries`);
    
    // 3. Delete all AI Coach sessions
    const deletedAICoachSessions = await AICoach.deleteMany({ userId });
    results.deletedAICoachSessions = deletedAICoachSessions.deletedCount;
    console.log(`✅ Deleted ${results.deletedAICoachSessions} AI Coach sessions`);
    
    // 4. Delete all shared meditations by this user
    const deletedSharedMeditations = await SharedMeditation.deleteMany({ creatorId: userId });
    results.deletedSharedMeditations = deletedSharedMeditations.deletedCount;
    console.log(`✅ Deleted ${results.deletedSharedMeditations} shared meditations`);
    
    // 5. Remove user from likes in other shared meditations
    const updatedSharedMeditations = await SharedMeditation.updateMany(
      { 'likes.userId': userId },
      { $pull: { likes: { userId } } }
    );
    
    // 6. Remove user from likes in journal entries
    const updatedJournalEntries = await JournalEntry.updateMany(
      { 'likes.userId': userId },
      { $pull: { likes: { userId } } }
    );
    results.removedLikes = updatedSharedMeditations.modifiedCount + updatedJournalEntries.modifiedCount;
    console.log(`✅ Removed user likes from ${results.removedLikes} posts`);
    
    // 7. Delete all addictions
    const deletedAddictions = await Addiction.deleteMany({ userId });
    results.deletedAddictions = deletedAddictions.deletedCount;
    console.log(`✅ Deleted ${results.deletedAddictions} addiction records`);
    
    // 8. Delete all notifications
    const deletedNotifications = await Notification.deleteMany({ userId });
    results.deletedNotifications = deletedNotifications.deletedCount;
    console.log(`✅ Deleted ${results.deletedNotifications} notifications`);
    
    // 9. Delete custom background files from filesystem
    const customBackgroundsPath = path.join(__dirname, '../custom-backgrounds', userId.toString());
    if (fs.existsSync(customBackgroundsPath)) {
      const files = fs.readdirSync(customBackgroundsPath);
      results.deletedCustomBackgrounds = files.length;
      fs.rmSync(customBackgroundsPath, { recursive: true, force: true });
      console.log(`✅ Deleted ${results.deletedCustomBackgrounds} custom background files`);
    }
    
    // 10. Delete user meditation files from filesystem
    const userMeditationsPath = path.join(__dirname, '../user-meditations', userId.toString());
    if (fs.existsSync(userMeditationsPath)) {
      const files = fs.readdirSync(userMeditationsPath);
      results.deletedUserMeditations = files.length;
      fs.rmSync(userMeditationsPath, { recursive: true, force: true });
      console.log(`✅ Deleted ${results.deletedUserMeditations} user meditation files`);
    }
    
    // 11. Delete voice clone files if they exist
    const voiceClonesPath = path.join(__dirname, '../voice-clones', userId.toString());
    if (fs.existsSync(voiceClonesPath)) {
      const files = fs.readdirSync(voiceClonesPath);
      results.deletedVoiceClones = files.length;
      fs.rmSync(voiceClonesPath, { recursive: true, force: true });
      console.log(`✅ Deleted ${results.deletedVoiceClones} voice clone files`);
    }
    
    // 12. Delete journal audio files
    const journalAudioPath = path.join(__dirname, '../../assets/audio/journals', userId.toString());
    if (fs.existsSync(journalAudioPath)) {
      const files = fs.readdirSync(journalAudioPath);
      results.deletedJournalAudio = files.length;
      fs.rmSync(journalAudioPath, { recursive: true, force: true });
      console.log(`✅ Deleted ${results.deletedJournalAudio} journal audio files`);
    }
    
    // 13. Finally, delete the user record itself
    const deletedUser = await User.findByIdAndDelete(userId);
    results.deletedUserRecord = !!deletedUser;
    console.log(`✅ Deleted user account record: ${results.deletedUserRecord}`);
    
    console.log(`🎉 Complete account deletion successful for user ${username}`);
    console.log('📊 Final deletion summary:', results);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during user data deletion:', error);
    throw error;
  }
}

module.exports = router;