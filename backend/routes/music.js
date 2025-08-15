const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get available background music
router.get('/catalog', async (req, res) => {
  try {
    const catalogPath = path.join(__dirname, '../../assets/music/music-catalog.json');
    
    if (!fs.existsSync(catalogPath)) {
      return res.json({
        success: true,
        catalog: {
          backgroundMusic: {
            nature: []
          },
          categories: {}
        }
      });
    }
    
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    
    res.json({
      success: true,
      catalog
    });
  } catch (error) {
    console.error('Error loading music catalog:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load music catalog'
    });
  }
});

// Stream music file
router.get('/stream/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    
    // Security check - only allow specific categories and file extensions
    const allowedCategories = ['nature', 'ambient', 'instrumental', 'world'];
    const allowedExtensions = ['.mp3', '.wav', '.m4a'];
    
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid file format' });
    }
    
    let filePath;
    
    // For nature sounds, check both the new organized location and legacy location
    if (category === 'nature') {
      const newPath = path.join(__dirname, '../../assets/music/nature', filename);
      const legacyPath = path.join(__dirname, '../../assets', filename);
      
      if (fs.existsSync(newPath)) {
        filePath = newPath;
      } else if (fs.existsSync(legacyPath)) {
        filePath = legacyPath;
      } else {
        return res.status(404).json({ error: 'Audio file not found' });
      }
    } else {
      filePath = path.join(__dirname, `../../assets/music/${category}`, filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Support for audio streaming with range requests
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming music file:', error);
    res.status(500).json({ error: 'Failed to stream audio file' });
  }
});

module.exports = router;