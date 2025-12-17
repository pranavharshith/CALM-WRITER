const express = require('express');
const router = express.Router();
const Reaction = require('../models/Reaction');

// Middleware: Check session by internalId
function requireSession(req, res, next) {
  const userId = req.header('X-Internal-Id');
  if (!userId) return res.status(401).json({ error: 'Missing session' });
  req.internalId = userId;
  next();
}

// POST /reactions/submit
router.post('/submit', requireSession, async (req, res) => {
  const { storyId, reactionType } = req.body;
  if (!storyId || !['stayed_with_me','felt_seen','learned_something'].includes(reactionType)) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }
  // 1 reaction per user per story
  const exists = await Reaction.findOne({ userInternalId: req.internalId, storyId });
  if (exists) return res.json({ success: true });
  
  const reaction = new Reaction({ 
    userInternalId: req.internalId, 
    storyId, 
    type: reactionType 
  });
  await reaction.save();
  res.json({ success: true });
});

module.exports = router;

