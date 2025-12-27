const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Story = require('../models/Story');

// Middleware: Check session by internalId
function requireSession(req, res, next) {
  const userId = req.header('X-Internal-Id');
  if (!userId) return res.status(401).json({ error: 'Missing session' });
  req.internalId = userId;
  next();
}

// GET /users/profile/:username - Get user profile
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-otp -otpExpiresAt -email');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's stories
    const stories = await Story.find({ internalAuthorId: user.internalId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Add preview to stories
    const storiesWithPreview = stories.map(story => ({
      ...story,
      preview: story.text.substring(0, 200) + (story.text.length > 200 ? '...' : '')
    }));
    
    res.json({
      user: {
        username: user.username,
        displayName: user.displayName,
        joinedAt: user.joinedAt
      },
      stories: storiesWithPreview,
      stats: {
        totalStories: await Story.countDocuments({ internalAuthorId: user.internalId }),
        totalLikes: await Story.aggregate([
          { $match: { internalAuthorId: user.internalId } },
          { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
        ]).then(result => result[0]?.totalLikes || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /users/me - Get current user info
router.get('/me', requireSession, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId }).select('-otp -otpExpiresAt');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      internalId: user.internalId,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      joinedAt: user.joinedAt,
      needsUsername: !user.username,
      role: user.role || 'user'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

module.exports = router;