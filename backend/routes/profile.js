const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');

// Create profile images directory if it doesn't exist
const profileImagesDir = path.join(__dirname, '..', 'profile-images');
fs.mkdir(profileImagesDir, { recursive: true }).catch(console.error);

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userDir = path.join(profileImagesDir, req.body.userId || 'temp');
    await fs.mkdir(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload profile image
router.post('/upload-image', upload.single('profileImage'), async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Find user and update profile image
    const user = await User.findById(userId);
    
    if (!user) {
      // Delete uploaded file if user not found
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete old profile image if exists
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '..', user.profileImage);
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        console.log('Could not delete old profile image:', err.message);
      }
    }
    
    // Save relative path to database
    const relativePath = `/profile-images/${userId}/${req.file.filename}`;
    user.profileImage = relativePath;
    await user.save();
    
    res.json({ 
      success: true, 
      profileImage: relativePath,
      message: 'Profile image uploaded successfully'
    });
    
  } catch (error) {
    console.error('Profile image upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting file:', unlinkErr);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Delete profile image
router.delete('/delete-image/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.profileImage) {
      return res.status(400).json({ error: 'No profile image to delete' });
    }
    
    // Delete image file
    const imagePath = path.join(__dirname, '..', user.profileImage);
    try {
      await fs.unlink(imagePath);
    } catch (err) {
      console.log('Could not delete profile image file:', err.message);
    }
    
    // Remove from database
    user.profileImage = null;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Profile image deleted successfully'
    });
    
  } catch (error) {
    console.error('Profile image delete error:', error);
    res.status(500).json({ error: 'Failed to delete profile image' });
  }
});

// Get user profile with image
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-creditTransactions -emergencyContacts');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      username: user.username,
      profileImage: user.profileImage,
      bio: user.bio,
      location: user.location,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
      credits: user.credits,
      totalMeditations: user.meditations.length
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;