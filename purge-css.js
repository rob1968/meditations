#!/usr/bin/env node

/**
 * CSS Purge Tool - Remove unused CSS classes automatically
 * Usage: node purge-css.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = './frontend/src';
const cssFile = './frontend/src/styles/globals.css';
const backupFile = './frontend/src/styles/globals.css.backup';

// Extract all CSS classes from globals.css
function extractCSSClasses(cssContent) {
  const classRegex = /\\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const classes = new Set();
  let match;
  
  while ((match = classRegex.exec(cssContent))) {
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

// Remove unused CSS rules
function purgeCSSRules(cssContent, unusedClasses) {
  let purgedCSS = cssContent;
  
  unusedClasses.forEach(className => {
    // Match CSS rules for this class (handles multi-line rules)
    const classRuleRegex = new RegExp(
      `\\.${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}\\s*`,
      'gm'
    );
    
    // Also match rules with pseudo-classes and media queries
    const pseudoClassRuleRegex = new RegExp(
      `\\.${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:[^{]*\\{[^}]*\\}\\s*`,
      'gm'
    );
    
    purgedCSS = purgedCSS.replace(classRuleRegex, '');
    purgedCSS = purgedCSS.replace(pseudoClassRuleRegex, '');
  });
  
  // Clean up extra whitespace and empty lines
  purgedCSS = purgedCSS
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple empty lines with single
    .replace(/^\s*\n/gm, '') // Remove empty lines at start of sections
    .trim();
  
  return purgedCSS;
}

// Main purge function
function purgeCSS() {
  console.log('🧹 Starting CSS purge process...\n');
  
  // Create backup
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(cssFile, backupFile);
    console.log('💾 Created backup: globals.css.backup');
  }
  
  // Read CSS file
  const originalCSS = fs.readFileSync(cssFile, 'utf8');
  const originalSize = Buffer.byteLength(originalCSS, 'utf8');
  
  const definedClasses = extractCSSClasses(originalCSS);
  const usedClasses = findClassNameUsage(srcDir);
  
  // Find unused classes but preserve utility classes and common patterns
  const preservePatterns = [
    // Layout utilities
    'flex', 'grid', 'block', 'inline', 'hidden', 'visible',
    // Spacing utilities
    'm-', 'p-', 'mt-', 'mb-', 'ml-', 'mr-', 'mx-', 'my-',
    'pt-', 'pb-', 'pl-', 'pr-', 'px-', 'py-',
    // Typography utilities
    'text-', 'font-', 'leading-', 'tracking-',
    // Color utilities
    'bg-', 'border-', 'text-white', 'text-black',
    // Size utilities
    'w-', 'h-', 'min-', 'max-',
    // Position utilities
    'absolute', 'relative', 'fixed', 'sticky', 'static',
    // Component classes
    'glass-', 'btn-', 'form-', 'modal-', 'nav-', 'card-', 'alert-',
    'loading-', 'spinner', 'fade-', 'slide-', 'bounce-', 'pulse',
    'error-', 'success-', 'warning-', 'info-', 'active', 'disabled',
    // Responsive utilities
    'sm:', 'md:', 'lg:', 'xl:',
    // Border utilities
    'rounded', 'border',
    // Shadow utilities
    'shadow'
  ];
  
  const unusedClasses = [...definedClasses].filter(cls => {
    if (usedClasses.has(cls)) return false;
    
    // Preserve utility classes and common patterns
    const shouldPreserve = preservePatterns.some(pattern => 
      cls.startsWith(pattern) || cls === pattern
    );
    
    return !shouldPreserve;
  });
  
  console.log(`📊 Analysis:`)
  console.log(`   Total classes: ${definedClasses.size}`);
  console.log(`   Used classes: ${usedClasses.size}`);
  console.log(`   Safe to remove: ${unusedClasses.length}`);
  console.log(`   Preserved (dynamic use): ${definedClasses.size - usedClasses.size - unusedClasses.length}`);
  
  if (unusedClasses.length === 0) {
    console.log('\n✅ No unused classes found to remove!');
    return;
  }
  
  // Purge unused classes
  const purgedCSS = purgeCSSRules(originalCSS, unusedClasses);
  const purgedSize = Buffer.byteLength(purgedCSS, 'utf8');
  const savedBytes = originalSize - purgedSize;
  const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);
  
  // Write purged CSS
  fs.writeFileSync(cssFile, purgedCSS);
  
  console.log('\n🎉 CSS purge completed!');
  console.log(`   Original size: ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`   Purged size: ${(purgedSize / 1024).toFixed(1)} KB`);
  console.log(`   Saved: ${(savedBytes / 1024).toFixed(1)} KB (${savedPercentage}%)`);
  
  console.log('\n🗑️  Removed classes (sample):');
  unusedClasses.slice(0, 10).forEach(cls => {
    console.log(`   - .${cls}`);
  });
  
  if (unusedClasses.length > 10) {
    console.log(`   ... and ${unusedClasses.length - 10} more`);
  }
  
  console.log('\n💡 To restore: cp globals.css.backup globals.css');
}

// Run purge
try {
  purgeCSS();
} catch (error) {
  console.error('❌ Error during CSS purge:', error.message);
  process.exit(1);
}