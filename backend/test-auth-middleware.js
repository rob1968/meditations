const mongoose = require('mongoose');
const User = require('./models/User');
const auth = require('./middleware/auth');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meditation-app';

async function testAuthMiddleware() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Mock request and response
    const req = {
      headers: {
        'x-user-id': '68a02a3173a675b2d6693db1'
      }
    };
    
    const res = {
      status: (code) => ({
        json: (data) => console.log('Response:', code, data)
      })
    };
    
    const next = () => console.log('Auth middleware passed - req.user:', req.user ? req.user.username : 'NOT SET');

    console.log('Testing auth middleware...');
    await auth(req, res, next);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAuthMiddleware();