#!/usr/bin/env node

/**
 * Smart CSS Purge Tool - Remove only truly unused component classes
 * Usage: node smart-purge.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = './frontend/src';
const cssFile = './frontend/src/styles/globals.css';
const backupFile = './frontend/src/styles/globals.css.backup';

// Extract all CSS classes from globals.css with their rules
function extractCSSClassesWithRules(cssContent) {
  const classMap = new Map();
  
  // Match CSS rules with class names
  const ruleRegex = /(\.[a-zA-Z][a-zA-Z0-9_-]*(?:\s*[,>\s]\s*\.[a-zA-Z][a-zA-Z0-9_-]*)*)\s*\{([^}]*)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(cssContent))) {
    const selector = match[1].trim();
    const rules = match[2].trim();
    
    // Extract individual class names from selector
    const classNames = selector.match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) || [];
    
    classNames.forEach(className => {
      const cleanName = className.substring(1); // Remove the dot
      if (!classMap.has(cleanName)) {
        classMap.set(cleanName, []);
      }
      classMap.get(cleanName).push({
        selector: selector,
        rules: rules,
        fullMatch: match[0]
      });
    });
  }
  
  return classMap;
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

// Identify safe-to-remove classes
function identifyRemovableClasses(classMap, usedClasses) {
  const removableClasses = [];
  
  // Classes that are clearly component-specific and unused
  const componentPrefixes = [
    'googleapis', 'com', 'interactive', 'container', 'header',
    'profile-button', 'profile-username', 'main-title', 'subtitle',
    'profile-language', 'profile-custom', 'profile-select', 'section',
    'meditation-type-card', 'meditation-card', 'custom-slider',
    'language-selector', 'background-slider', 'wizard-step',
    'form-group', 'input-group', 'button-group', 'navigation-item'
  ];
  
  // Never remove utility classes or common patterns
  const preservePatterns = [
    // Core utilities
    'flex', 'grid', 'block', 'inline', 'hidden', 'visible', 'absolute', 'relative',
    'fixed', 'sticky', 'static', 'overflow', 'clip', 'clear', 'float',
    // Spacing
    'm-', 'p-', 'space-', 'gap-',
    // Typography
    'text-', 'font-', 'leading-', 'tracking-', 'antialiased',
    // Colors
    'bg-', 'border-', 'ring-', 'divide-', 'outline-',
    // Sizing
    'w-', 'h-', 'min-', 'max-', 'size-',
    // Borders & effects
    'rounded', 'border', 'shadow', 'blur', 'brightness', 'contrast',
    // Transform & animation
    'transform', 'translate', 'rotate', 'scale', 'skew', 'transition',
    'duration-', 'ease-', 'delay-', 'animate-',
    // Layout
    'container', 'mx-auto', 'justify-', 'items-', 'content-', 'self-',
    // Responsive prefixes
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    // State variants
    'hover:', 'focus:', 'active:', 'disabled:', 'group-hover:',
    // Glass morphism and app-specific
    'glass-', 'modal-', 'nav-', 'btn-', 'form-', 'loading-', 'spinner',
    // Critical app classes
    'app-', 'main-', 'content-', 'wrapper-'
  ];
  
  for (const [className, rules] of classMap.entries()) {
    // Skip if used
    if (usedClasses.has(className)) continue;
    
    // Skip if matches preserve patterns
    const shouldPreserve = preservePatterns.some(pattern => 
      className.startsWith(pattern) || className === pattern
    );
    if (shouldPreserve) continue;
    
    // Remove if matches component patterns OR is clearly unused component class
    const isComponentClass = componentPrefixes.some(prefix => 
      className.startsWith(prefix)
    ) || className.includes('-') && className.length > 3;
    
    if (isComponentClass) {
      removableClasses.push(className);
    }
  }
  
  return removableClasses;
}

// Remove CSS rules for specific classes
function removeClassRules(cssContent, classesToRemove) {
  let purgedCSS = cssContent;
  
  classesToRemove.forEach(className => {
    // Escape special regex characters
    const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // More precise patterns to avoid syntax errors
    const patterns = [
      // Single class rule: .className { rules }
      new RegExp(`\\.${escapedClassName}\\s*\\{[^{}]*\\}`, 'g'),
      // Class with pseudo-classes: .className:pseudo { rules }
      new RegExp(`\\.${escapedClassName}:[^{\\s]*\\s*\\{[^{}]*\\}`, 'g'),
      // Media queries containing the class
      new RegExp(`@media[^{]*\\{[^{}]*\\.${escapedClassName}[^{}]*\\{[^{}]*\\}[^{}]*\\}`, 'g')
    ];
    
    patterns.forEach(pattern => {
      purgedCSS = purgedCSS.replace(pattern, '');
    });
  });
  
  // Clean up malformed CSS and extra whitespace
  purgedCSS = purgedCSS
    // Remove empty media queries
    .replace(/@media[^{]*\{\s*\}/g, '')
    // Remove orphaned closing braces
    .replace(/^\s*\}\s*$/gm, '')
    // Remove multiple consecutive empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove empty lines
    .replace(/^\s*$/gm, '')
    // Final cleanup
    .trim();
  
  return purgedCSS;
}

// Main smart purge function
function smartPurgeCSS() {
  console.log('🎯 Starting smart CSS purge...\n');
  
  // Create backup if not exists
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(cssFile, backupFile);
    console.log('💾 Created backup: globals.css.backup');
  }
  
  // Read and analyze CSS
  const originalCSS = fs.readFileSync(cssFile, 'utf8');
  const originalSize = Buffer.byteLength(originalCSS, 'utf8');
  
  const classMap = extractCSSClassesWithRules(originalCSS);
  const usedClasses = findClassNameUsage(srcDir);
  
  const removableClasses = identifyRemovableClasses(classMap, usedClasses);
  
  console.log('📊 Smart Analysis:');
  console.log(`   Total CSS classes: ${classMap.size}`);
  console.log(`   Used in JSX: ${usedClasses.size}`);
  console.log(`   Safe to remove: ${removableClasses.length}`);
  console.log(`   Preserved (utilities/critical): ${classMap.size - removableClasses.length - usedClasses.size}`);
  
  if (removableClasses.length === 0) {
    console.log('\n✅ No safely removable classes found!');
    return;
  }
  
  // Show what will be removed
  console.log('\n🗑️  Classes to remove (first 15):');
  removableClasses.slice(0, 15).forEach(cls => {
    console.log(`   - .${cls}`);
  });
  
  if (removableClasses.length > 15) {
    console.log(`   ... and ${removableClasses.length - 15} more`);
  }
  
  // Remove the classes
  const purgedCSS = removeClassRules(originalCSS, removableClasses);
  const purgedSize = Buffer.byteLength(purgedCSS, 'utf8');
  const savedBytes = originalSize - purgedSize;
  const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);
  
  // Write purged CSS
  fs.writeFileSync(cssFile, purgedCSS);
  
  console.log('\n🎉 Smart purge completed!');
  console.log(`   Original size: ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`   Purged size: ${(purgedSize / 1024).toFixed(1)} KB`);
  console.log(`   Saved: ${(savedBytes / 1024).toFixed(1)} KB (${savedPercentage}%)`);
  
  console.log('\n💡 To restore: cp globals.css.backup globals.css');
}

// Run smart purge
try {
  smartPurgeCSS();
} catch (error) {
  console.error('❌ Error during smart CSS purge:', error.message);
  process.exit(1);
}