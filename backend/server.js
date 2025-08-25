
const fs = require('fs');
const path = require('path');
const https = require('https');
const morgan = require('morgan'); // For HTTP request logging

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const meditationRoute = require('./routes/meditation');
const authRoute = require('./routes/auth');
const googleVoicesRoute = require('./routes/googleVoices');
const googleVoicePreviewRoute = require('./routes/googleVoicePreview');
const googleTTSInfoRoute = require('./routes/googleTTSInfo');
const userMeditationsRoute = require('./routes/userMeditations');
const usersRoute = require('./routes/users');
const communityRoute = require('./routes/community');
const notificationsRoute = require('./routes/notifications');
const journalRoute = require('./routes/journal');
const addictionsRoute = require('./routes/addictions');
const piPaymentsRoute = require('./routes/piPayments');
const aiCoachRoute = require('./routes/aiCoach');
const emergencyContactsRoute = require('./routes/emergencyContacts');
// Profile functionality moved to separate server (port 5005)
const musicRoute = require('./routes/music');
const meetRoute = require('./routes/meet');
const app = express();

// Create a write stream (in append mode) for logging
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// Setup the logger
app.use(morgan('combined', { stream: accessLogStream }));

// Configure CORS for meditations subdomain
const corsOptions = {
  origin: ['https://meditations.pihappy.me', 'http://localhost:3002', 'http://127.0.0.1:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id'],
  exposedHeaders: ['Content-Length', 'X-JSON-Parse-Time'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Standard body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Log all requests for debugging Pi Browser issues
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'no-origin'} - User-Agent: ${req.headers['user-agent'] || 'no-user-agent'}`);
  if (req.path.includes('pi-login')) {
    console.log('[Pi Auth Request] Headers:', JSON.stringify(req.headers, null, 2));
  }
  next();
});

// Serve static files from assets directory
app.use('/assets', express.static(path.join(__dirname, '../assets')));
// Serve static files from assets/meditations
app.use('/assets/meditations', express.static(path.join(__dirname, '../assets/meditations')));
// Serve static files from assets/images
app.use('/assets/images', express.static(path.join(__dirname, '../assets/images')));
// Serve static files for shared audio and images
app.use('/assets/audio/shared', express.static(path.join(__dirname, '../assets/audio/shared')));
app.use('/assets/images/shared', express.static(path.join(__dirname, '../assets/images/shared')));
// Serve static files for journal audio
app.use('/assets/audio/journals', express.static(path.join(__dirname, '../assets/audio/journals')));
app.use('/api/meditation', meditationRoute);
app.use('/api', meditationRoute); // Also mount on /api for direct access to custom-backgrounds routes
app.use('/api/auth', authRoute);
app.use('/api/user-meditations', userMeditationsRoute);
app.use('/api/users', usersRoute);
app.use('/api/community', communityRoute);
app.use('/api/notifications', notificationsRoute);
app.use('/api/journal', journalRoute);
app.use('/api/addictions', addictionsRoute);
app.use('/api/pi-payments', piPaymentsRoute);
app.use('/api/ai-coach', aiCoachRoute);
app.use('/api/emergency-contacts', emergencyContactsRoute);
// // app.use('/api/profile', profileRoute); // Profile functionality moved to separate server
app.use('/api/music', musicRoute);
app.use('/api/meet', meetRoute);
app.use('/api/activities', require('./routes/activities')); // Meet5-style activities

// Serve profile images
app.use('/profile-images', express.static(path.join(__dirname, 'profile-images')));

// Add a route for fetching voices
app.use('/api/voices', meditationRoute);
app.use('/api/google-voices', googleVoicesRoute);
app.use('/api/google-voice-preview', googleVoicePreviewRoute);
app.use('/api/google-tts-info', googleTTSInfoRoute);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ MongoDB connected");
}).catch(err => console.log("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 5004;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

// Create HTTP server for Socket.io
const { createServer } = require('http');
const { Server } = require('socket.io');
const server = createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'], // Fallback for mobile
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      return next(new Error('Authentication error'));
    }
    
    const User = require('./models/User');
    const user = await User.findById(userId);
    if (!user) {
      return next(new Error('User not found'));
    }
    
    socket.userId = userId;
    socket.username = user.username;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.io connection handling
require('./socket/socketHandlers')(io);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Network access: http://192.168.68.111:${PORT}`);
  console.log(`⚡ Socket.io enabled for real-time messaging`);
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err.stack);
  res.status(500).json({ error: 'An unexpected server error occurred. Please check server logs.' });
});
