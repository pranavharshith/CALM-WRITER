const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');

const SOFT_WORD_LIMIT = 800;

// Middleware: Check session by internalId
function requireSession(req, res, next) {
    const userId = req.header('X-Internal-Id');
    if (!userId) return res.status(401).json({ error: 'Missing session' });
    req.internalId = userId;
    next();
}

// CRITICAL FIX P0: Updated story submission with separate cooldown tracking
router.post('/submit', requireSession, async (req, res) => {
    const { text, title } = req.body;

    // Validate title (required, at least 3 words)
    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Title is required' });
    }

    const titleWords = title.trim().split(/\s+/).filter(word => word.length > 0);
    if (titleWords.length < 3) {
        return res.status(400).json({ error: 'Title must contain at least 3 words' });
    }

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Story content is required' });
    }

    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > SOFT_WORD_LIMIT) {
        return res.status(400).json({ error: 'Try to keep stories under 800 words.' });
    }

    // ROLE-BASED STORY COOLDOWNS (separate from continuation cooldown)
    const user = await User.findOne({ internalId: req.internalId });

    if (user && user.role === 'admin') {
        // Admins: No cooldown
    } else if (user && user.role === 'trusted_user') {
        // Trusted users: 4-hour cooldown
        if (user.lastStoryPublishedAt) {
            const timeSince = Date.now() - user.lastStoryPublishedAt.getTime();
            if (timeSince < 4 * 60 * 60 * 1000) {
                return res.status(403).json({ error: 'You can write once every 4 hours.' });
            }
        }
    } else {
        // Regular users: 12-hour cooldown
        if (user.lastStoryPublishedAt) {
            const timeSince = Date.now() - user.lastStoryPublishedAt.getTime();
            if (timeSince < 12 * 60 * 60 * 1000) {
                return res.status(403).json({ error: 'You can only write once every 12 hours.' });
            }
        }
    }

    const story = new Story({
        internalAuthorId: req.internalId,
        title: title.trim(),
        text,
        wordCount,
        locked: true,
        publishedAt: new Date(),
    });
    await story.save();

    // Update user's lastStoryPublishedAt (separate from continuation cooldown)
    user.lastStoryPublishedAt = new Date();
    await user.save();

    res.json({ success: true, storyId: story._id });
});

// Archive feature - "From the Archives" (replaces random)
router.get('/archive', requireSession, async (req, res) => {
    try {
        // Get stories from 1 year ago ± 1 day
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const dayBefore = new Date(oneYearAgo);
        dayBefore.setDate(dayBefore.getDate() - 1);

        const dayAfter = new Date(oneYearAgo);
        dayAfter.setDate(dayAfter.getDate() + 1);

        // Filter: high quality (low spam, good engagement)
        const archiveStories = await Story.find({
            publishedAt: { $gte: dayBefore, $lte: dayAfter },
            spamScore: { $lt: 1 },
            likes: { $gte: 20 },
            hidden: false
        }).sort({ likes: -1 }).limit(10);

        if (archiveStories.length === 0) {
            return res.json({
                message: 'No archive stories from this date one year ago',
                stories: []
            });
        }

        // Return random story from the filtered set
        const randomStory = archiveStories[Math.floor(Math.random() * archiveStories.length)];

        // Enrich with author
        const author = await User.findOne({ internalId: randomStory.internalAuthorId });

        res.json({
            story: {
                ...randomStory.toObject(),
                authorUsername: author?.username || 'Anonymous',
                isLikedByUser: (randomStory.likedBy || []).includes(req.internalId),
                fromArchive: true,
                publishedYearsAgo: 1
            }
        });
    } catch (error) {
        console.error('Archive error:', error);
        res.status(500).json({ error: 'Failed to fetch archive story' });
    }
});

module.exports = router;
