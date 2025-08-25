// Quick check to see if frontend is making API calls
const express = require('express');
const app = express();

// Middleware to log all requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    
    if (req.headers['x-user-id']) {
        console.log(`   👤 User ID: ${req.headers['x-user-id']}`);
    }
    
    if (req.url.includes('activities')) {
        console.log(`   🎯 ACTIVITY REQUEST: ${req.method} ${req.url}`);
    }
    
    next();
});

// Proxy to real backend
app.use('/', (req, res) => {
    res.json({ 
        message: "Frontend traffic monitor active",
        method: req.method,
        url: req.url,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
});

const port = 5005;
app.listen(port, () => {
    console.log(`🔍 Frontend Traffic Monitor running on port ${port}`);
    console.log(`If frontend is working, you should see API requests here when you use the app`);
});