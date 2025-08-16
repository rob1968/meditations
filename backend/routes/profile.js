const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');

// Create profile images directory in static folder
const profileImagesDir = path.join(__dirname, '..', '..', 'static', 'profile-images');
fs.mkdir(profileImagesDir, { recursive: true }).catch(console.error);

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Use temp directory first, we'll move the file later
    const tempDir = path.join(profileImagesDir, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    cb(null, tempDir);
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
    console.log('File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // Much more permissive - allow any file that looks like an image
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const hasImageExt = /\.(jpeg|jpg|png|gif|webp|avif|bmp|tiff)$/i.test(file.originalname);
    
    console.log('Validation results:', { isImage, hasImageExt, mimetype: file.mimetype });
    
    // Accept if either MIME type suggests image OR file extension suggests image
    if (isImage || hasImageExt) {
      console.log('File accepted:', file.originalname);
      return cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, file.mimetype);
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
    
    // Create user-specific directory
    const userDir = path.join(profileImagesDir, userId);
    await fs.mkdir(userDir, { recursive: true });
    
    // Move file from temp to user directory
    const finalPath = path.join(userDir, req.file.filename);
    await fs.rename(req.file.path, finalPath);
    
    // Delete old profile image if exists
    if (user.profileImage) {
      // Remove /static prefix to get actual file path
      const cleanPath = user.profileImage.replace('/static/', '');
      const oldImagePath = path.join(__dirname, '..', '..', cleanPath);
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        console.log('Could not delete old profile image:', err.message);
      }
    }
    
    // Save relative path to database
    const relativePath = `/static/profile-images/${userId}/${req.file.filename}`;
    user.profileImage = relativePath;
    await user.save();
    
    console.log('Profile image upload successful:', { 
      userId, 
      relativePath, 
      filename: req.file.filename 
    });
    
    res.json({ 
      success: true, 
      profileImage: relativePath,
      message: 'Profile image uploaded successfully'
    });
    
  } catch (error) {
    console.error('Profile image upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      file: req.file ? req.file.filename : 'no file'
    });
    
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