const express = require('express');
const router = express.Router();
const Reaction = require('../models/Reaction');
const Story = require('../models/Story');
const { requireAuth } = require('../middleware/auth-consolidated');

// POST /reactions/submit - Submit reaction to story
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { storyId, reactionType } = req.body;

    if (!storyId || !reactionType) {
      return res.status(400).json({ success: false, error: 'Story ID and reaction type required' });
    }

    // Check if user is timed out
    const user = await require('../models/User').findOne({ internalId: req.internalId });
    if (user && user.timeoutUntil && user.timeoutUntil > new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Account temporarily suspended',
        timeoutUntil: user.timeoutUntil,
        timeoutReason: user.timeoutReason
      });
    }

    const validReactions = ['stayed_with_me', 'felt_seen', 'learned_something'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ success: false, error: 'Invalid reaction type' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    // Check if already reacted
    const existing = await Reaction.findOne({
      userInternalId: req.internalId,
      storyId,
      type: reactionType
    });

    if (existing) {
      // Remove reaction
      await Reaction.deleteOne({ _id: existing._id });
      return res.json({ success: true, reacted: false, message: 'Reaction removed' });
    }

    // Remove any other reaction from this user on this story
    await Reaction.deleteMany({
      userInternalId: req.internalId,
      storyId
    });

    // Add new reaction
    const reaction = new Reaction({
      userInternalId: req.internalId,
      storyId,
      type: reactionType
    });

    await reaction.save();

    res.json({
      success: true,
      reacted: true,
      message: 'Reaction added',
      reaction: {
        _id: reaction._id,
        type: reaction.type,
        createdAt: reaction.createdAt
      }
    });
  } catch (error) {
    console.error('Reaction submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit reaction' });
  }
});

module.exports = router;
