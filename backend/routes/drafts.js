const express = require('express');
const router = express.Router();
const Draft = require('../models/Draft');
const Story = require('../models/Story');
const { requireAuth } = require('../middleware/auth-consolidated');
const { checkAndUpdateStoryPublishCooldown } = require('../utils/cooldownManager');

// Use centralized JWT auth middleware instead of legacy header-based auth

// POST /drafts/save: Save or update draft
router.post('/save', requireAuth, async (req, res) => {
    try {
        const { title, text, draftId } = req.body;

        const wordCount = text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;

        if (draftId) {
            // Update existing draft
            const draft = await Draft.findOneAndUpdate(
                { _id: draftId, internalAuthorId: req.internalId },
                {
                    title: title || '',
                    text: text || '',
                    wordCount,
                    lastSaved: new Date()
                },
                { new: true }
            );

            if (!draft) {
                return res.status(404).json({ error: 'Draft not found' });
            }

            return res.json({ success: true, draft });
        } else {
            // Create new draft
            const draft = new Draft({
                internalAuthorId: req.internalId,
                title: title || '',
                text: text || '',
                wordCount,
                lastSaved: new Date()
            });

            await draft.save();
            return res.json({ success: true, draft });
        }
    } catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// GET /drafts: Get all user's drafts
router.get('/', requireAuth, async (req, res) => {
    try {
        const drafts = await Draft.find({ internalAuthorId: req.internalId })
            .sort({ updatedAt: -1 })
            .lean();

        res.json({ drafts });
    } catch (error) {
        console.error('Fetch drafts error:', error);
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// GET /drafts/:id: Get specific draft
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const draft = await Draft.findOne({
            _id: req.params.id,
            internalAuthorId: req.internalId
        });

        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        res.json({ draft });
    } catch (error) {
        console.error('Fetch draft error:', error);
        res.status(500).json({ error: 'Failed to fetch draft' });
    }
});

// DELETE /drafts/:id: Delete draft
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const draft = await Draft.findOneAndDelete({
            _id: req.params.id,
            internalAuthorId: req.internalId
        });

        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete draft error:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

// POST /drafts/:id/publish: Publish draft as story
router.post('/:id/publish', requireAuth, async (req, res) => {
    try {
        const draft = await Draft.findOne({
            _id: req.params.id,
            internalAuthorId: req.internalId
        });

        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        // Validate title (required, at least 3 words)
        if (!draft.title || typeof draft.title !== 'string') {
            return res.status(400).json({ error: 'Title is required' });
        }

        const titleWords = draft.title.trim().split(/\s+/).filter(word => word.length > 0);
        if (titleWords.length < 3) {
            return res.status(400).json({ error: 'Title must contain at least 3 words' });
        }

        if (!draft.text || typeof draft.text !== 'string') {
            return res.status(400).json({ error: 'Story content is required' });
        }


        const wordCount = draft.text.trim().split(/\s+/).length;
        if (wordCount > 800) {
            return res.status(400).json({ error: 'Try to keep stories under 800 words.' });
        }

        // Check 12-hour cooldown for publishing (admins bypass this)
        const User = require('../models/User');
        const user = await User.findOne({ internalId: req.internalId });

        // Admins can publish unlimited stories
        if (user && user.role !== 'admin') {
            const cooldownCheck = await checkAndUpdateStoryPublishCooldown(req.internalId, 12);
            if (!cooldownCheck.allowed) {
                return res.status(403).json({
                    error: cooldownCheck.message,
                    timeRemaining: cooldownCheck.timeRemaining
                });
            }
        }


        // Create story from draft
        const story = new Story({
            internalAuthorId: req.internalId,
            title: draft.title.trim(),
            text: draft.text,
            wordCount,
            locked: true,
            publishedAt: new Date()
        });
        await story.save();

        // Delete the draft after publishing
        await Draft.findByIdAndDelete(draft._id);

        res.json({ success: true, storyId: story._id });
    } catch (error) {
        console.error('Publish draft error:', error);
        res.status(500).json({ error: 'Failed to publish draft' });
    }
});

module.exports = router;
