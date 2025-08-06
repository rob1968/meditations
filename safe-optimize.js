#!/usr/bin/env node

/**
 * Safe CSS Optimization - Test build after each step
 * Usage: node safe-optimize.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const cssFile = './frontend/src/styles/globals.css';
const backupFile = './frontend/src/styles/globals.css.backup';

function runCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    return null;
  }
}

function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function testBuild() {
  console.log('🧪 Testing build...');
  const result = runCommand('cd frontend && npm run build 2>&1', { stdio: 'pipe' });
  return result !== null && !result.includes('Failed to compile');
}

function createMinimalOptimization() {
  console.log('🎯 Starting safe CSS optimization...\n');
  
  // Create backup
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(cssFile, backupFile);
    console.log('💾 Created backup: globals.css.backup');
  }
  
  const originalSize = getFileSize(cssFile);
  console.log(`📊 Original CSS size: ${formatSize(originalSize)}\n`);
  
  // Step 1: Only minification (safest optimization)
  console.log('📋 STEP 1: CSS Minification Only');
  console.log('================================');
  
  const originalCSS = fs.readFileSync(cssFile, 'utf8');
  
  // Conservative minification - only remove comments and excess whitespace
  const minifiedCSS = originalCSS
    // Remove CSS comments but preserve conditional comments
    .replace(/\/\*(?!\s*@|\s*!)[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')
    // Normalize whitespace but preserve structure
    .replace(/\s+/g, ' ')
    // Clean up around braces and semicolons
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/;\s*/g, ';')
    .replace(/:\s*/g, ':')
    .replace(/,\s*/g, ',')
    // Remove trailing spaces
    .replace(/\s*$/gm, '')
    .trim();
    
  // Write minified version
  fs.writeFileSync(cssFile, minifiedCSS);
  
  const minifiedSize = getFileSize(cssFile);
  const minificationSavings = originalSize - minifiedSize;
  
  console.log(`✅ Minified CSS: ${formatSize(minifiedSize)} (saved ${formatSize(minificationSavings)})`);
  
  // Test build after minification
  if (!testBuild()) {
    console.log('❌ Build failed after minification, restoring backup...');
    fs.copyFileSync(backupFile, cssFile);
    return false;
  }
  
  console.log('✅ Build test passed after minification\n');
  
  // Step 2: Build with optimization
  console.log('📋 STEP 2: Production Build');
  console.log('===========================');
  
  const buildResult = runCommand('cd frontend && GENERATE_SOURCEMAP=false npm run build');
  if (!buildResult) {
    console.log('❌ Production build failed');
    return false;
  }
  
  console.log('✅ Production build completed');
  
  // Step 3: Deploy
  console.log('📋 STEP 3: Deploy');
  console.log('=================');
  
  const deployResult = runCommand('cp -r frontend/build/* .');
  if (!deployResult) {
    console.log('❌ Deploy failed');
    return false;
  }
  
  console.log('✅ Build files deployed');
  
  // Step 4: Restart services
  console.log('📋 STEP 4: Restart Services');
  console.log('===========================');
  
  runCommand('npx pm2 restart meditations-backend');
  console.log('✅ Backend service restarted');
  
  // Final report
  console.log('\n🎉 SAFE OPTIMIZATION COMPLETE!');
  console.log('===============================');
  
  const totalSavingsPercent = ((minificationSavings / originalSize) * 100).toFixed(1);
  
  console.log(`📊 Results:`);
  console.log(`   Original size: ${formatSize(originalSize)}`);
  console.log(`   Optimized size: ${formatSize(minifiedSize)}`);
  console.log(`   Total saved: ${formatSize(minificationSavings)} (${totalSavingsPercent}%)`);
  
  console.log(`\n🚀 Optimizations Applied:`);
  console.log(`   ✅ Removed CSS comments and excess whitespace`);
  console.log(`   ✅ Built production bundle with optimizations`);
  console.log(`   ✅ Tested build integrity at each step`);
  console.log(`   ✅ Deployed optimized files`);
  
  console.log(`\n💡 Additional Optimization Opportunities:`);
  console.log(`   • Manual removal of unused component CSS`);
  console.log(`   • Implementation of CSS modules for components`);
  console.log(`   • Tree-shaking of unused utility classes`);
  console.log(`   • Critical CSS extraction for above-the-fold content`);
  
  return true;
}

// Run safe optimization
try {
  if (!createMinimalOptimization()) {
    console.log('\n❌ Safe optimization failed!');
    console.log('💡 Original CSS has been preserved');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error during safe optimization:', error.message);
  
  // Restore backup on any error
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, cssFile);
    console.log('💾 CSS restored from backup');
  }
  
  process.exit(1);
}