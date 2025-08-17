const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

const CUSTOM_BACKGROUNDS_DIR = path.join(__dirname, '..', 'custom-backgrounds');
console.log('CUSTOM_BACKGROUNDS_DIR:', CUSTOM_BACKGROUNDS_DIR);

async function testCustomBackgrounds() {
  try {
    const backgrounds = [];
    
    // First, load system backgrounds (always available)
    const systemDir = path.join(CUSTOM_BACKGROUNDS_DIR, 'system');
    console.log('System dir:', systemDir);
    console.log('System dir exists:', fs.existsSync(systemDir));
    
    if (fs.existsSync(systemDir)) {
      const systemFiles = await fsPromises.readdir(systemDir);
      console.log('System files:', systemFiles);
      
      for (const file of systemFiles) {
        console.log('Processing file:', file);
        if (file.endsWith('.json') && file.startsWith('metadata-')) {
          try {
            const metadataPath = path.join(systemDir, file);
            console.log('Reading metadata from:', metadataPath);
            const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
            console.log('Metadata:', metadata);
            
            // Check if system audio file exists in assets directory (system files stay in assets)
            const assetsDir = path.join(__dirname, '..', 'assets');
            const audioPath = path.join(assetsDir, metadata.filename);
            console.log('Assets dir:', assetsDir);
            console.log('Audio path:', audioPath);
            console.log('Audio file exists:', fs.existsSync(audioPath));
            
            if (fs.existsSync(audioPath)) {
              backgrounds.push({
                ...metadata,
                url: `/assets/${metadata.filename}`,
                type: 'system'
              });
              console.log('Added system background:', metadata.customName);
            }
          } catch (err) {
            console.error('Error processing system metadata file:', file, err);
          }
        }
      }
    }
    
    console.log('Final backgrounds:', backgrounds);
    console.log('Success! Found', backgrounds.length, 'backgrounds');
  } catch (error) {
    console.error('Error in testCustomBackgrounds:', error);
  }
}

testCustomBackgrounds();