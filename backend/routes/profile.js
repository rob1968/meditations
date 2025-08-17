const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create profile images directory in static folder
const profileImagesDir = path.join(__dirname, '..', '..', 'static', 'profile-images');
fs.mkdir(profileImagesDir, { recursive: true }).catch(console.error);

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use temp directory first, we'll move the file later
    const tempDir = path.join(profileImagesDir, 'temp');
    
    // Use sync mkdir instead of async to avoid callback issues
    const fsSync = require('fs');
    try {
      fsSync.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      console.error('Error creating temp directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '.jpg'; // Default to .jpg if no extension
    cb(null, 'profile-' + uniqueSuffix + extension);
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
    
    // Check if it's a valid image MIME type
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    
    // Check if filename has image extension (if available)
    const hasImageExt = file.originalname && /\.(jpeg|jpg|png|gif|webp|avif|bmp|tiff)$/i.test(file.originalname);
    
    // For profile images, be very permissive - allow if:
    // 1. MIME type suggests it's an image, OR
    // 2. Filename suggests it's an image, OR  
    // 3. It's from the profileImage field (trusted source)
    const isProfileImageField = file.fieldname === 'profileImage';
    
    console.log('Validation results:', { isImage, hasImageExt, isProfileImageField, mimetype: file.mimetype });
    
    if (isImage || hasImageExt || isProfileImageField) {
      console.log('File accepted:', file.originalname || 'no-filename');
      return cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, file.mimetype);
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload profile image
router.post('/upload-image', auth, upload.single('profileImage'), async (req, res) => {
  console.log('=== PROFILE UPLOAD START ===');
  let userId = null;
  try {
    userId = req.user._id;
    console.log('Auth passed, userId:', userId);
    
    if (!req.file) {
      console.log('No file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    console.log('File received:', req.file.filename, req.file.size, 'bytes');
    
    // Find user and update profile image
    console.log('Looking up user in database...');
    const user = await User.findById(userId);
    console.log('User lookup complete');
    
    if (!user) {
      console.log('User not found');
      // Delete uploaded file if user not found
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create user-specific directory
    console.log('Creating user directory...');
    const userIdString = userId.toString(); // Convert ObjectId to string
    const userDir = path.join(profileImagesDir, userIdString);
    console.log('User directory path:', userDir);
    
    try {
      await fs.mkdir(userDir, { recursive: true });
      console.log('User directory created');
    } catch (mkdirError) {
      console.error('Failed to create user directory:', mkdirError);
      throw mkdirError;
    }
    
    // Move file from temp to user directory
    console.log('Moving file to final location...');
    const finalPath = path.join(userDir, req.file.filename);
    console.log('From:', req.file.path, 'To:', finalPath);
    
    try {
      await fs.rename(req.file.path, finalPath);
      console.log('File moved successfully');
    } catch (renameError) {
      console.error('Failed to move file:', renameError);
      console.error('Rename error details:', {
        code: renameError.code,
        errno: renameError.errno,
        syscall: renameError.syscall,
        path: renameError.path,
        dest: renameError.dest
      });
      throw renameError;
    }
    
    // Delete old profile image if exists
    console.log('Checking for old profile image...');
    if (user.profileImage) {
      console.log('Deleting old profile image:', user.profileImage);
      // Remove /static prefix to get actual file path
      const cleanPath = user.profileImage.replace('/static/', '');
      const oldImagePath = path.join(__dirname, '..', '..', cleanPath);
      try {
        await fs.unlink(oldImagePath);
        console.log('Old image deleted');
      } catch (err) {
        console.log('Could not delete old profile image:', err.message);
      }
    }
    
    // Save relative path to database
    console.log('Saving to database...');
    const relativePath = `/static/profile-images/${userIdString}/${req.file.filename}`;
    user.profileImage = relativePath;
    await user.save();
    console.log('Database save complete');
    
    console.log('Profile image upload successful:', { 
      userId: userIdString, 
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
router.delete('/delete-image', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
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