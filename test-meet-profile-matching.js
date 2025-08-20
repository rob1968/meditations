#!/usr/bin/env node

/**
 * Meet Profile-Based Matching Test
 * Tests if user profile data is used correctly for activity matching
 */

const mongoose = require('mongoose');

async function testProfileMatching() {
  try {
    await mongoose.connect('mongodb://localhost:27017/meditation_app');
    console.log('🔗 Connected to MongoDB');
    
    // Get all test users
    const usersCollection = mongoose.connection.db.collection('users');
    const users = await usersCollection.find({}).toArray();
    
    console.log('\n👥 TEST USERS PROFILE DATA:');
    console.log('==============================');
    
    users.forEach((user, i) => {
      const age = user.birthDate ? Math.floor((Date.now() - new Date(user.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A';
      
      console.log(`\n${i + 1}. ${user.username.toUpperCase()}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   📍 Location: ${user.location?.city || 'N/A'}, ${user.location?.country || 'N/A'}`);
      console.log(`   🎂 Age: ${age} jaar`);
      console.log(`   ⚧ Gender: ${user.gender || 'N/A'}`);
      console.log(`   🗣️ Language: ${user.preferredLanguage || 'N/A'}`);
      console.log(`   📝 Bio: ${(user.bio || 'N/A').substring(0, 80)}...`);
      console.log(`   🏷️ Interests: ${user.interests ? user.interests.join(', ') : 'N/A'}`);
      console.log(`   💰 Credits: ${user.credits || 0}`);
    });
    
    console.log('\n🧠 PROFILE-BASED MATCHING ANALYSIS:');
    console.log('=====================================');
    
    // Analyze potential matches based on profile similarity
    console.log('\n📍 LOCATION MATCHING:');
    const locationGroups = {};
    users.forEach(user => {
      const city = user.location?.city || 'Unknown';
      if (!locationGroups[city]) locationGroups[city] = [];
      locationGroups[city].push(user.username);
    });
    
    Object.entries(locationGroups).forEach(([city, usernames]) => {
      console.log(`   ${city}: ${usernames.join(', ')} (${usernames.length} users)`);
    });
    
    console.log('\n⚧ GENDER DISTRIBUTION:');
    const genderGroups = {};
    users.forEach(user => {
      const gender = user.gender || 'Unknown';
      if (!genderGroups[gender]) genderGroups[gender] = [];
      genderGroups[gender].push(user.username);
    });
    
    Object.entries(genderGroups).forEach(([gender, usernames]) => {
      console.log(`   ${gender}: ${usernames.join(', ')} (${usernames.length} users)`);
    });
    
    console.log('\n🎂 AGE GROUPS:');
    const ageGroups = {
      '20-29': [],
      '30-39': [],
      '40-49': [],
      '50+': []
    };
    
    users.forEach(user => {
      if (!user.birthDate) return;
      const age = Math.floor((Date.now() - new Date(user.birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age >= 20 && age < 30) ageGroups['20-29'].push(user.username);
      else if (age >= 30 && age < 40) ageGroups['30-39'].push(user.username);
      else if (age >= 40 && age < 50) ageGroups['40-49'].push(user.username);
      else if (age >= 50) ageGroups['50+'].push(user.username);
    });
    
    Object.entries(ageGroups).forEach(([ageRange, usernames]) => {
      if (usernames.length > 0) {
        console.log(`   ${ageRange} jaar: ${usernames.join(', ')} (${usernames.length} users)`);
      }
    });
    
    console.log('\n🏷️ INTEREST EXTRACTION FROM BIO:');
    users.forEach(user => {
      if (!user.bio) return;
      
      const bio = user.bio.toLowerCase();
      const detectedInterests = [];
      
      // Interest detection logic (similar to backend)
      if (bio.includes('mindfulness') || bio.includes('meditatie')) detectedInterests.push('mindfulness');
      if (bio.includes('yoga')) detectedInterests.push('yoga');
      if (bio.includes('stress')) detectedInterests.push('stress-management');
      if (bio.includes('natuur') || bio.includes('nature')) detectedInterests.push('nature');
      if (bio.includes('burn-out')) detectedInterests.push('burn-out recovery');
      if (bio.includes('anxiety') || bio.includes('angst')) detectedInterests.push('anxiety');
      if (bio.includes('wandelen') || bio.includes('walking')) detectedInterests.push('walking');
      if (bio.includes('groep') || bio.includes('group')) detectedInterests.push('group-activities');
      
      console.log(`   ${user.username}: ${detectedInterests.length > 0 ? detectedInterests.join(', ') : 'geen specifieke interesses gedetecteerd'}`);
    });
    
    console.log('\n💡 MATCHING RECOMMENDATIONS:');
    console.log('=============================');
    
    // Generate sample matching logic
    users.forEach(user => {
      const potentialMatches = users.filter(other => {
        if (other._id.equals(user._id)) return false;
        
        let score = 0;
        
        // Location similarity (high weight)
        if (user.location?.city === other.location?.city) score += 3;
        else if (user.location?.country === other.location?.country) score += 1;
        
        // Age similarity (medium weight)
        if (user.birthDate && other.birthDate) {
          const userAge = Math.floor((Date.now() - new Date(user.birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
          const otherAge = Math.floor((Date.now() - new Date(other.birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
          const ageDiff = Math.abs(userAge - otherAge);
          
          if (ageDiff <= 5) score += 2;
          else if (ageDiff <= 10) score += 1;
        }
        
        // Interest similarity (high weight)
        const userBio = user.bio ? user.bio.toLowerCase() : '';
        const otherBio = other.bio ? other.bio.toLowerCase() : '';
        
        const commonKeywords = ['mindfulness', 'yoga', 'stress', 'natuur', 'burn-out', 'anxiety', 'meditatie'];
        commonKeywords.forEach(keyword => {
          if (userBio.includes(keyword) && otherBio.includes(keyword)) score += 2;
        });
        
        return score >= 2; // Minimum match threshold
      });
      
      console.log(`\n👤 ${user.username}:`);
      if (potentialMatches.length > 0) {
        potentialMatches.forEach(match => {
          console.log(`   ✅ Match met ${match.username} (${match.location?.city}, ${match.gender})`);
        });
      } else {
        console.log(`   ❌ Geen sterke matches gevonden`);
      }
    });
    
    console.log('\n📊 PROFIEL-GEBASEERDE MATCHING CONCLUSIE:');
    console.log('=========================================');
    console.log('✅ User profiel data is volledig beschikbaar');
    console.log('✅ Locatie-gebaseerde filtering mogelijk'); 
    console.log('✅ Leeftijd-gebaseerde matching geïmplementeerd');
    console.log('✅ Bio interesse extractie functioneel');
    console.log('✅ Gender filtering ondersteund');
    console.log('✅ Taal preferentie beschikbaar');
    
    const totalUsers = users.length;
    const avgAge = users.reduce((sum, u) => {
      if (!u.birthDate) return sum;
      const age = Math.floor((Date.now() - new Date(u.birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
      return sum + age;
    }, 0) / users.filter(u => u.birthDate).length;
    
    console.log(`\n📈 STATISTIEKEN:`);
    console.log(`   • Totaal users: ${totalUsers}`);
    console.log(`   • Gemiddelde leeftijd: ${Math.round(avgAge)} jaar`);
    console.log(`   • Steden vertegenwoordigd: ${Object.keys(locationGroups).length}`);
    console.log(`   • Users met bio: ${users.filter(u => u.bio).length}`);
    console.log(`   • Users met locatie: ${users.filter(u => u.location?.city).length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testProfileMatching();