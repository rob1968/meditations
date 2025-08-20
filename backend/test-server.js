const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();

// Configure CORS
const corsOptions = {
  origin: ['https://meditations.pihappy.me', 'http://localhost:3002', 'http://127.0.0.1:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id'],
  exposedHeaders: ['Content-Length'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// Standard body parsing - let multer handle multipart
app.use((req, res, next) => {
  const contentType = req.get('content-type') || '';
  if (contentType.toLowerCase().includes('multipart/form-data')) {
    return next(); // Skip body parsing for multipart
  }
  express.json({ limit: '10mb' })(req, res, next);
});

// Static files for profile images
app.use('/static', express.static(require('path').join(__dirname, '..', 'static')));

console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB connected for profile server");
}).catch(err => console.log("MongoDB connection error:", err));

console.log('Loading profile routes...');
try {
  const profileRoute = require('./routes/profile');
  console.log('Profile routes loaded successfully');
  
  app.use('/api/profile', profileRoute);
  console.log('Profile routes mounted successfully');
  
  const PORT = 5005;
  const HOST = '127.0.0.1'; // Listen only on localhost
  app.listen(PORT, HOST, () => {
    console.log(`Profile server running on port ${PORT}`);
    console.log(`Profile endpoints available at:`);
    console.log(`- POST http://localhost:${PORT}/api/profile/upload-image`);
    console.log(`- DELETE http://localhost:${PORT}/api/profile/delete-image`);
    console.log(`- GET http://localhost:${PORT}/api/profile/user/:userId`);
  });
  
} catch (error) {
  console.error('Error loading profile routes:', error);
}