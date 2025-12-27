const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to handle common browser/DevTools requests
app.use((req, res, next) => {
    if (req.path.startsWith('/.well-known')) {
        return res.status(204).end();
    }
    if (req.path === '/favicon.ico') {
        return res.status(204).end();
    }
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
        version: '3.0.0',
        endpoints: [
            '/stories', '/reactions', '/reads', '/auth', '/admin',
            '/threads', '/leaderboards', '/moderation', '/bookmarks',
            '/prompts', '/preferences', '/transparency'
        ]
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
app.use('/drafts', require('./routes/drafts'));

// NEW ROUTES - Critical improvements
app.use('/prompts', require('./routes/prompts')); // Daily writing prompts
app.use('/preferences', require('./routes/preferences')); // Calm Mode settings
app.use('/transparency', require('./routes/transparency')); // Public moderation stats

// Handle any other 404s silently
app.use((req, res) => {
    if (!req.originalUrl.includes('.well-known') &&
        !req.originalUrl.includes('favicon') &&
        !req.originalUrl.includes('chrome-extension')) {
        console.log(`404: ${req.method} ${req.originalUrl}`);
    }
    res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/calmstories';

// Start background jobs
const { startDraftCleanupJob } = require('./jobs/cleanDrafts');

mongoose
    .connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB connected');

        // Start draft cleanup job (runs daily at 2 AM)
        startDraftCleanupJob();
        console.log('Draft cleanup job started');

        app.listen(PORT, () => {
            console.log('API server running on port', PORT);
            console.log('Version 3.0.0 with critical fixes:');
            console.log('  ✅ Response/continuation cooldown split');
            console.log('  ✅ Spam detection with trusted user modifier');
            console.log('  ✅ Archive feature (1 year ago)');
            console.log('  ✅ MCQ moderator tests');
            console.log('  ✅ Draft cleanup job');
            console.log('  ✅ Draft sharing');
        });
    })
    .catch((err) => console.error('MongoDB connection error:', err));
