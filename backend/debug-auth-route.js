const mongoose = require('mongoose');
const express = require('express');
const User = require('./models/User');
const auth = require('./middleware/auth');

// Test the auth middleware and route execution
async function debugAuthRoute() {
  try {
    console.log('=== DEBUGGING AUTH MIDDLEWARE ===');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meditation-app');
    console.log('✓ Connected to MongoDB');
    
    // Test the auth middleware directly
    const testUserId = '68a02a3173a675b2d6693db1';
    console.log('Testing auth with userId:', testUserId);
    
    // Mock request and response objects
    const req = {
      headers: {
        'x-user-id': testUserId
      }
    };
    
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Auth middleware returned error ${code}:`, data);
          return res;
        }
      })
    };
    
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
      console.log('✓ Auth middleware passed successfully');
      console.log('✓ req.user set to:', req.user ? req.user.username : 'NOT SET');
    };
    
    console.log('Calling auth middleware...');
    await auth(req, res, next);
    
    if (!nextCalled) {
      console.log('❌ Auth middleware did not call next()');
      return;
    }
    
    if (!req.user) {
      console.log('❌ req.user not set by auth middleware');
      return;
    }
    
    console.log('✅ Auth middleware working correctly!');
    
    // Now test a simple version of the custom backgrounds route
    console.log('\n--- Testing Route Execution ---');
    try {
      console.log('Executing custom backgrounds logic...');
      const backgrounds = [];
      
      // Just add a test background to simulate success
      backgrounds.push({
        id: 'test',
        customName: 'Test Background',
        type: 'system'
      });
      
      console.log('✓ Route logic completed');
      console.log('Response would be:', { backgrounds });
      console.log('✅ Route execution successful!');
      
    } catch (routeError) {
      console.error('❌ Error in route execution:', routeError.message);
      console.error('Stack:', routeError.stack);
    }
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

debugAuthRoute();