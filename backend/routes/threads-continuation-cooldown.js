const express = require('express');
const router = express.Router();
const StoryNode = require('../models/StoryNode');
const User = require('../models/User');

function requireSession(req, res, next) {
    const userId = req.header('X-Internal-Id');
    if (!userId) return res.status(401).json({ error: 'Missing session' });
    req.internalId = userId;
    next();
}

// GET /threads/can-continue - Check if user can write continuation
// CRITICAL FIX P0: Separate 30-minute cooldown for continuations
router.get('/can-continue', requireSession, async (req, res) => {
    try {
        const user = await User.findOne({ internalId: req.internalId });

        if (!user) {
            return res.json({ canContinue: true });
        }

        // Check timeout
        if (user.timeoutUntil && user.timeoutUntil > new Date()) {
            return res.json({
                canContinue: false,
                reason: 'timeout',
                timeoutUntil: user.timeoutUntil
            });
        }

        // Check last continuation time (30 minutes for ALL users)
        if (!user.lastContinuationAt) {
            return res.json({ canContinue: true });
        }

        const timeSinceLastContinuation = Date.now() - user.lastContinuationAt.getTime();
        const CONTINUATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes

        const canContinue = timeSinceLastContinuation >= CONTINUATION_COOLDOWN;
        const timeUntilNext = canContinue ? 0 : CONTINUATION_COOLDOWN - timeSinceLastContinuation;

        res.json({
            canContinue,
            timeUntilNext,
            lastContinuationAt: user.lastContinuationAt,
            cooldownMinutes: 30
        });
    } catch (error) {
        console.error('Can continue error:', error);
        res.status(500).json({ error: 'Failed to check continuation status' });
    }
});

// POST /threads/:storyId/continue - Create continuation with cooldown check
router.post('/:storyId/continue', requireSession, async (req, res) => {
    try {
        const { text } = req.body;
        const { storyId } = req.params;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Continuation content is required' });
        }

        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount > 800) {
            return res.status(400).json({ error: 'Try to keep continuations under 800 words.' });
        }

        const user = await User.findOne({ internalId: req.internalId });

        // CRITICAL FIX P0: Check continuation cooldown (30 minutes, separate from story cooldown)
        if (user.lastContinuationAt) {
            const timeSince = Date.now() - user.lastContinuationAt.getTime();
            const CONTINUATION_COOLDOWN = 30 * 60 * 1000;

            if (timeSince < CONTINUATION_COOLDOWN) {
                const minutesRemaining = Math.ceil((CONTINUATION_COOLDOWN - timeSince) / 60000);
                return res.status(403).json({
                    error: `You can continue again in ${minutesRemaining} minutes.`,
                    timeUntilNext: CONTINUATION_COOLDOWN - timeSince
                });
            }
        }

        // Create continuation
        const Story = require('../models/Story');
        const rootStory = await Story.findById(storyId);

        if (!rootStory) {
            return res.status(404).json({ error: 'Story not found' });
        }

        if (rootStory.threadLocked) {
            return res.status(403).json({ error: 'This thread is locked' });
        }

        const continuation = new StoryNode({
            parentStoryId: storyId,
            rootStoryId: storyId,
            authorInternalId: req.internalId,
            content: text,
            type: 'CONTINUATION',
            wordCount
        });

        await continuation.save();

        // Update user's lastContinuationAt (DOES NOT affect story cooldown)
        user.lastContinuationAt = new Date();
        await user.save();

        res.json({
            success: true,
            continuationId: continuation._id,
            message: 'Continuation added! You can write your own story anytime.'
        });
    } catch (error) {
        console.error('Continue story error:', error);
        res.status(500).json({ error: 'Failed to create continuation' });
    }
});

// POST /threads/:storyId/respond - Create response with same cooldown check
router.post('/:storyId/respond', requireSession, async (req, res) => {
    try {
        const { text } = req.body;
        const { storyId } = req.params;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Response content is required' });
        }

        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount > 800) {
            return res.status(400).json({ error: 'Try to keep responses under 800 words.' });
        }

        const user = await User.findOne({ internalId: req.internalId });

        // Same 30-minute cooldown as continuations
        if (user.lastContinuationAt) {
            const timeSince = Date.now() - user.lastContinuationAt.getTime();
            const CONTINUATION_COOLDOWN = 30 * 60 * 1000;

            if (timeSince < CONTINUATION_COOLDOWN) {
                const minutesRemaining = Math.ceil((CONTINUATION_COOLDOWN - timeSince) / 60000);
                return res.status(403).json({
                    error: `You can respond again in ${minutesRemaining} minutes.`
                });
            }
        }

        const Story = require('../models/Story');
        const rootStory = await Story.findById(storyId);

        if (!rootStory) {
            return res.status(404).json({ error: 'Story not found' });
        }

        if (rootStory.threadLocked) {
            return res.status(403).json({ error: 'This thread is locked' });
        }

        const response = new StoryNode({
            parentStoryId: storyId,
            rootStoryId: storyId,
            authorInternalId: req.internalId,
            content: text,
            type: 'RESPONSE',
            wordCount
        });

        await response.save();

        // Update cooldown
        user.lastContinuationAt = new Date();
        await user.save();

        res.json({
            success: true,
            responseId: response._id
        });
    } catch (error) {
        console.error('Respond error:', error);
        res.status(500).json({ error: 'Failed to create response' });
    }
});

module.exports = router;
