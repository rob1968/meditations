#!/usr/bin/env node

/**
 * CSS Minification Tool - Compress CSS for production
 * Usage: node minify-css.js
 */

const fs = require('fs');

const cssFile = './frontend/src/styles/globals.css';

function minifyCSS(cssContent) {
  return cssContent
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around special characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons before closing braces
    .replace(/;}/g, '}')
    // Remove unnecessary quotes around font names and URLs
    .replace(/"([a-zA-Z-]+)"/g, '$1')
    // Remove whitespace at start and end
    .trim();
}

function optimizeCSS() {
  console.log('⚡ Starting CSS minification...\n');
  
  const originalCSS = fs.readFileSync(cssFile, 'utf8');
  const originalSize = Buffer.byteLength(originalCSS, 'utf8');
  
  const minifiedCSS = minifyCSS(originalCSS);
  const minifiedSize = Buffer.byteLength(minifiedCSS, 'utf8');
  
  // Create minified version
  const minifiedFile = cssFile.replace('.css', '.min.css');
  fs.writeFileSync(minifiedFile, minifiedCSS);
  
  const savedBytes = originalSize - minifiedSize;
  const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);
  
  console.log('🎉 CSS minification completed!');
  console.log(`   Original: ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`   Minified: ${(minifiedSize / 1024).toFixed(1)} KB`);
  console.log(`   Saved: ${(savedBytes / 1024).toFixed(1)} KB (${savedPercentage}%)`);
  console.log(`   Output: ${minifiedFile}`);
}

try {
  optimizeCSS();
} catch (error) {
  console.error('❌ Error during CSS minification:', error.message);
  process.exit(1);
}