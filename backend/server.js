const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to handle common browser/DevTools requests
app.use((req, res, next) => {
  // Handle .well-known requests (Chrome DevTools, etc.)
  if (req.path.startsWith('/.well-known')) {
    return res.status(204).end();
  }
  
  // Handle favicon requests
  if (req.path === '/favicon.ico') {
    return res.status(204).end();
  }
  
  // Handle robots.txt
  if (req.path === '/robots.txt') {
    res.type('text/plain');
    return res.send('User-agent: *\nDisallow: /');
  }
  
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Calm Stories API', 
    version: '2.0.0',
    endpoints: ['/stories', '/reactions', '/reads', '/auth', '/admin', '/threads', '/leaderboards', '/moderation', '/bookmarks']
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/auth', require('./routes/auth'));
app.use('/stories', require('./routes/stories'));
app.use('/users', require('./routes/users'));
app.use('/admin', require('./routes/admin'));
app.use('/reads', require('./routes/sessions'));
app.use('/reactions', require('./routes/reactions'));
app.use('/threads', require('./routes/threads'));
app.use('/leaderboards', require('./routes/leaderboards'));
app.use('/moderation', require('./routes/moderation'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/follows', require('./routes/follows'));

// Handle any other 404s silently (for browser/DevTools requests)
app.use((req, res) => {
  // Only log actual API requests, not browser/DevTools noise
  if (!req.originalUrl.includes('.well-known') && 
      !req.originalUrl.includes('favicon') && 
      !req.originalUrl.includes('chrome-extension')) {
    console.log(`404: ${req.method} ${req.originalUrl}`);
  }
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/calmstories';

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log('API server running on port', PORT);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));

