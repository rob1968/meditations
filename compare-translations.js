#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const localesDir = './frontend/src/locales';
const languages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'ja', 'ko', 'pt', 'ru', 'zh', 'ar', 'hi'];

function loadTranslation(lang) {
  try {
    const filePath = path.join(localesDir, lang, 'translation.json');
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${lang}:`, error.message);
    return {};
  }
}

function getAllKeys() {
  const allKeys = new Set();
  
  languages.forEach(lang => {
    const translation = loadTranslation(lang);
    Object.keys(translation).forEach(key => allKeys.add(key));
  });
  
  return Array.from(allKeys).sort();
}

function findMissingKeys() {
  const allKeys = getAllKeys();
  const missingKeys = {};
  
  languages.forEach(lang => {
    const translation = loadTranslation(lang);
    const missing = allKeys.filter(key => !(key in translation));
    if (missing.length > 0) {
      missingKeys[lang] = missing;
    }
  });
  
  return missingKeys;
}

function getKeyStats() {
  const allKeys = getAllKeys();
  const stats = {};
  
  languages.forEach(lang => {
    const translation = loadTranslation(lang);
    stats[lang] = {
      total: Object.keys(translation).length,
      missing: allKeys.length - Object.keys(translation).length
    };
  });
  
  return stats;
}

// Main execution
console.log('🔍 Analyzing translation completeness...\n');

const allKeys = getAllKeys();
console.log(`📊 Total unique keys found: ${allKeys.length}\n`);

const stats = getKeyStats();
console.log('📈 Statistics by language:');
languages.forEach(lang => {
  const stat = stats[lang];
  const completeness = ((stat.total / allKeys.length) * 100).toFixed(1);
  console.log(`${lang}: ${stat.total}/${allKeys.length} keys (${completeness}%) - Missing: ${stat.missing}`);
});

const missingKeys = findMissingKeys();
console.log('\n🔍 Missing keys by language:');

if (Object.keys(missingKeys).length === 0) {
  console.log('✅ All languages have complete translations!');
} else {
  Object.entries(missingKeys).forEach(([lang, keys]) => {
    console.log(`\n${lang.toUpperCase()} (${keys.length} missing):`);
    keys.forEach(key => console.log(`  - ${key}`));
  });
  
  // Save missing keys to file for processing
  fs.writeFileSync('missing-keys-report.json', JSON.stringify(missingKeys, null, 2));
  console.log('\n📝 Detailed report saved to: missing-keys-report.json');
}

// Show keys that exist in most languages (might be worth adding to all)
console.log('\n🎯 Keys present in most languages:');
const keyPresence = {};
allKeys.forEach(key => {
  keyPresence[key] = languages.filter(lang => {
    const translation = loadTranslation(lang);
    return key in translation;
  }).length;
});

const commonKeys = Object.entries(keyPresence)
  .filter(([key, count]) => count >= languages.length * 0.8) // Present in 80%+ of languages
  .sort((a, b) => b[1] - a[1]);

console.log(`Found ${commonKeys.length} keys present in 80%+ of languages`);
commonKeys.slice(0, 10).forEach(([key, count]) => {
  console.log(`  ${key}: ${count}/${languages.length} languages`);
});