#!/usr/bin/env node

/**
 * Build Optimization Script - Complete CSS optimization pipeline
 * Usage: node optimize-build.js [--restore]
 */

const fs = require('fs');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const shouldRestore = args.includes('--restore');

const cssFile = './frontend/src/styles/globals.css';
const backupFile = './frontend/src/styles/globals.css.backup';
const criticalFile = './frontend/src/styles/critical.css';

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function restoreBackup() {
  console.log('🔄 Restoring CSS backup...\n');
  
  if (!fs.existsSync(backupFile)) {
    console.log('❌ No backup file found!');
    return;
  }
  
  fs.copyFileSync(backupFile, cssFile);
  console.log('✅ CSS restored from backup');
}

function optimizeBuild() {
  console.log('🚀 Starting complete build optimization...\n');
  
  const originalSize = getFileSize(cssFile);
  console.log(`📊 Starting CSS size: ${formatSize(originalSize)}\n`);
  
  // Step 1: Smart CSS Purging
  console.log('📋 PHASE 4A: Smart CSS Purging');
  console.log('==============================');
  if (!runCommand('node smart-purge.js', 'Removing unused CSS classes')) {
    return false;
  }
  
  const purgedSize = getFileSize(cssFile);
  const purgedSavings = originalSize - purgedSize;
  console.log(`✅ CSS purged: ${formatSize(purgedSize)} (saved ${formatSize(purgedSavings)})\n`);
  
  // Step 2: CSS Minification
  console.log('📋 PHASE 4B: CSS Minification');
  console.log('=============================');
  if (!runCommand('node minify-css.js', 'Minifying CSS')) {
    return false;
  }
  
  const minifiedSize = getFileSize('./frontend/src/styles/globals.min.css');
  const minifiedSavings = purgedSize - minifiedSize;
  console.log(`✅ CSS minified: ${formatSize(minifiedSize)} (saved ${formatSize(minifiedSavings)})\n`);
  
  // Step 3: Build Frontend
  console.log('📋 PHASE 4C: Frontend Build');
  console.log('===========================');
  if (!runCommand('cd frontend && GENERATE_SOURCEMAP=false npm run build', 'Building optimized frontend')) {
    return false;
  }
  
  // Step 4: Deploy Build
  console.log('📋 PHASE 4D: Deploy Optimized Build');
  console.log('===================================');
  if (!runCommand('cp -r frontend/build/* .', 'Copying optimized build files')) {
    return false;
  }
  
  // Step 5: Update Critical CSS
  console.log('📋 PHASE 4E: Critical CSS Integration');
  console.log('====================================');
  
  // Create an optimized index.html with inlined critical CSS
  const indexPath = './index.html';
  if (fs.existsSync(indexPath) && fs.existsSync(criticalFile)) {
    let indexHTML = fs.readFileSync(indexPath, 'utf8');
    const criticalCSS = fs.readFileSync(criticalFile, 'utf8');
    
    // Minify critical CSS
    const minifiedCritical = criticalCSS
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      .trim();
    
    // Insert critical CSS into head
    if (indexHTML.includes('<head>')) {
      const criticalTag = `<style id="critical-css">${minifiedCritical}</style>`;
      indexHTML = indexHTML.replace('<head>', `<head>\n${criticalTag}`);
      fs.writeFileSync(indexPath, indexHTML);
      console.log('✅ Critical CSS inlined in index.html');
    }
  }
  
  // Step 6: Restart Services
  console.log('📋 PHASE 4F: Service Restart');
  console.log('============================');
  if (!runCommand('npx pm2 restart meditations-backend', 'Restarting backend service')) {
    console.log('⚠️  Backend restart failed, but continuing...');
  }
  
  // Final Report
  console.log('\n🎉 BUILD OPTIMIZATION COMPLETE!');
  console.log('================================');
  
  const finalSize = minifiedSize;
  const totalSavings = originalSize - finalSize;
  const totalSavingsPercent = ((totalSavings / originalSize) * 100).toFixed(1);
  
  console.log(`📊 CSS Optimization Results:`);
  console.log(`   Original size: ${formatSize(originalSize)}`);
  console.log(`   After purging: ${formatSize(purgedSize)} (-${formatSize(purgedSavings)})`);
  console.log(`   After minifying: ${formatSize(finalSize)} (-${formatSize(minifiedSavings)})`);
  console.log(`   Total saved: ${formatSize(totalSavings)} (${totalSavingsPercent}%)`);
  
  console.log(`\n🚀 Performance Improvements:`);
  console.log(`   ✅ Removed ${Math.round((purgedSavings / originalSize) * 100)}% unused CSS`);
  console.log(`   ✅ Compressed CSS by ${Math.round((minifiedSavings / purgedSize) * 100)}%`);
  console.log(`   ✅ Inlined critical CSS for faster loading`);
  console.log(`   ✅ Built optimized production bundle`);
  
  console.log(`\n💡 Next Steps:`);
  console.log(`   • Test the application thoroughly`);
  console.log(`   • Monitor bundle size in browser dev tools`);
  console.log(`   • Use 'node optimize-build.js --restore' to rollback if needed`);
  
  return true;
}

// Main execution
if (shouldRestore) {
  restoreBackup();
} else {
  if (!optimizeBuild()) {
    console.log('\n❌ Build optimization failed!');
    console.log('💡 Run "node optimize-build.js --restore" to restore backup');
    process.exit(1);
  }
}