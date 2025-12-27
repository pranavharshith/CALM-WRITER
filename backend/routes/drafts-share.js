const express = require('express');
const router = express.Router();
const Draft = require('../models/Draft');
const crypto = require('crypto');

function requireSession(req, res, next) {
    const userId = req.header('X-Internal-Id');
    if (!userId) return res.status(401).json({ error: 'Missing session' });
    req.internalId = userId;
    next();
}

// POST /drafts/:id/share - Generate share link for draft
router.post('/:id/share', requireSession, async (req, res) => {
    try {
        const draft = await Draft.findOne({
            _id: req.params.id,
            internalAuthorId: req.internalId
        });

        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        // Generate unique token
        const shareToken = crypto.randomBytes(16).toString('hex');

        // Set 7-day expiry
        const shareExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        draft.shareToken = shareToken;
        draft.shareExpiresAt = shareExpiresAt;
        draft.shareEnabled = true;

        await draft.save();

        res.json({
            success: true,
            shareToken,
            shareUrl: `/drafts/shared/${shareToken}`,
            expiresAt: shareExpiresAt
        });
    } catch (error) {
        console.error('Share draft error:', error);
        res.status(500).json({ error: 'Failed to share draft' });
    }
});

// GET /drafts/shared/:token - View shared draft (public, no auth required)
router.get('/shared/:token', async (req, res) => {
    try {
        const draft = await Draft.findOne({
            shareToken: req.params.token,
            shareEnabled: true
        });

        if (!draft) {
            return res.status(404).json({ error: 'Shared draft not found' });
        }

        // Check if expired
        if (draft.shareExpiresAt && draft.shareExpiresAt < new Date()) {
            return res.status(410).json({ error: 'Share link has expired' });
        }

        // Get author username
        const User = require('../models/User');
        const author = await User.findOne({ internalId: draft.internalAuthorId });

        res.json({
            draft: {
                title: draft.title,
                text: draft.text,
                wordCount: draft.wordCount,
                authorUsername: author?.username || 'Anonymous',
                lastSaved: draft.lastSaved,
                expiresAt: draft.shareExpiresAt
            },
            readOnly: true
        });
    } catch (error) {
        console.error('View shared draft error:', error);
        res.status(500).json({ error: 'Failed to load shared draft' });
    }
});

// DELETE /drafts/:id/unshare - Revoke share link
router.delete('/:id/unshare', requireSession, async (req, res) => {
    try {
        const draft = await Draft.findOne({
            _id: req.params.id,
            internalAuthorId: req.internalId
        });

        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        draft.shareEnabled = false;
        draft.shareToken = null;
        draft.shareExpiresAt = null;

        await draft.save();

        res.json({ success: true, message: 'Share link revoked' });
    } catch (error) {
        console.error('Unshare draft error:', error);
        res.status(500).json({ error: 'Failed to revoke share link' });
    }
});

module.exports = router;
