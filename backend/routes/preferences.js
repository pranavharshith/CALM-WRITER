const express = require('express');
const router = express.Router();
const User = require('../models/User');

function requireSession(req, res, next) {
    const userId = req.header('X-Internal-Id');
    if (!userId) return res.status(401).json({ error: 'Missing session' });
    req.internalId = userId;
    next();
}

// GET /preferences - Get user preferences
router.get('/', requireSession, async (req, res) => {
    try {
        const user = await User.findOne({ internalId: req.internalId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ preferences: user.preferences || {} });
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Failed to get preferences' });
    }
});

// POST /preferences - Update user preferences
router.post('/', requireSession, async (req, res) => {
    try {
        const { calmMode, fontSize, autoScroll, autoScrollSpeed } = req.body;

        const user = await User.findOne({ internalId: req.internalId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.preferences) {
            user.preferences = {};
        }

        if (calmMode !== undefined) user.preferences.calmMode = calmMode;
        if (fontSize) user.preferences.fontSize = fontSize;
        if (autoScroll !== undefined) user.preferences.autoScroll = autoScroll;
        if (autoScrollSpeed) user.preferences.autoScrollSpeed = autoScrollSpeed;

        await user.save();

        res.json({ success: true, preferences: user.preferences });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

module.exports = router;
