#!/usr/bin/env node

/**
 * CSS Audit Tool - Find unused CSS classes
 * Usage: node css-audit.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = './frontend/src';
const cssFile = './frontend/src/styles/globals.css';

// Extract all CSS classes from globals.css
function extractCSSClasses(cssContent) {
  const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const classes = new Set();
  let match;
  
  while ((match = classRegex.exec(cssContent))) {
    // Skip pseudo-classes and media queries
    if (!match[1].includes(':') && !match[1].includes('\\')) {
      classes.add(match[1]);
    }
  }
  
  return classes;
}

// Find all className usage in JSX files
function findClassNameUsage(dir) {
  const usedClasses = new Set();
  
  function scanFile(filePath) {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract className values
      const classNameRegex = /className\s*=\s*["']([^"']+)["']/g;
      let match;
      
      while ((match = classNameRegex.exec(content))) {
        const classes = match[1].split(/\s+/);
        classes.forEach(cls => {
          if (cls.trim()) {
            usedClasses.add(cls.trim());
          }
        });
      }
    }
  }
  
  function scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        scanFile(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return usedClasses;
}

// Main audit function
function auditCSS() {
  console.log('🔍 Starting CSS audit...\n');
  
  // Read CSS file
  const cssContent = fs.readFileSync(cssFile, 'utf8');
  const definedClasses = extractCSSClasses(cssContent);
  
  console.log(`📊 Found ${definedClasses.size} CSS classes defined`);
  
  // Find used classes
  const usedClasses = findClassNameUsage(srcDir);
  
  console.log(`🎯 Found ${usedClasses.size} CSS classes used in JSX\n`);
  
  // Find unused classes
  const unusedClasses = [...definedClasses].filter(cls => !usedClasses.has(cls));
  const utilityClasses = [...definedClasses].filter(cls => 
    cls.startsWith('m-') || cls.startsWith('p-') || cls.startsWith('text-') || 
    cls.startsWith('bg-') || cls.startsWith('flex') || cls.startsWith('w-') ||
    cls.startsWith('h-') || cls.startsWith('rounded') || cls.startsWith('shadow')
  );
  
  console.log('📋 AUDIT RESULTS:');
  console.log('================');
  console.log(`✅ Used classes: ${definedClasses.size - unusedClasses.length}`);
  console.log(`❌ Unused classes: ${unusedClasses.length}`);
  console.log(`🛠️  Utility classes: ${utilityClasses.length}`);
  
  if (unusedClasses.length > 0) {
    console.log('\n🗑️  Unused classes (first 20):');
    unusedClasses.slice(0, 20).forEach(cls => {
      console.log(`   - .${cls}`);
    });
  }
  
  // Calculate potential savings
  const unusedRatio = (unusedClasses.length / definedClasses.size * 100).toFixed(1);
  console.log(`\n💾 Potential CSS size reduction: ~${unusedRatio}%`);
  
  // Find most used classes
  console.log('\n🔥 Most commonly used utility patterns:');
  const patterns = {
    spacing: [...usedClasses].filter(c => c.match(/^[mp][tblrxy]?-[0-9]/)).length,
    typography: [...usedClasses].filter(c => c.startsWith('text-')).length,
    layout: [...usedClasses].filter(c => c.startsWith('flex') || c.startsWith('grid')).length,
    backgrounds: [...usedClasses].filter(c => c.startsWith('bg-')).length,
  };
  
  Object.entries(patterns).forEach(([pattern, count]) => {
    console.log(`   ${pattern}: ${count} uses`);
  });
}

// Run audit
try {
  auditCSS();
} catch (error) {
  console.error('❌ Error during CSS audit:', error.message);
}