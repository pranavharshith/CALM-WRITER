const express = require('express');
const router = express.Router();
const ModerationStats = require('../models/ModerationStats');

// GET /transparency/today
router.get('/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await ModerationStats.findOne({ date: today });

        res.json({ stats: stats || {} });
    } catch (error) {
        console.error('Get today stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// GET /transparency/week
router.get('/week', async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const stats = await ModerationStats.find({
            date: { $gte: weekAgo }
        }).sort({ date: -1 });

        res.json({ stats });
    } catch (error) {
        console.error('Get week stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// GET /transparency/month
router.get('/month', async (req, res) => {
    try {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        monthAgo.setHours(0, 0, 0, 0);

        const stats = await ModerationStats.find({
            date: { $gte: monthAgo }
        }).sort({ date: -1 });

        res.json({ stats });
    } catch (error) {
        console.error('Get month stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
