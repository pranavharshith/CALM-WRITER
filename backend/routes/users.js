const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Story = require('../models/Story');
const { requireAuth } = require('../middleware/auth-consolidated');
const rateLimit = require('express-rate-limit');
const { ipKey } = require('express-rate-limit');

// Rate limiter for profile lookups - 500 requests per 15 minutes (very generous)
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many profile requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.params.username || ipKey(req)
});

// GET /users/profile/:username - Get user profile
router.get('/profile/:username', profileLimiter, async (req, res) => {
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

    // Check if there's an authenticated user making this request (from headers)
    let requestingUserInternalId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requestingUserInternalId = decoded.internalId;
      } catch (err) {
        // Invalid token, continue as anonymous
      }
    }

    // Add preview, author info, and like status to stories
    const storiesWithPreview = stories.map(story => ({
      ...story,
      preview: story.text.substring(0, 200) + (story.text.length > 200 ? '...' : ''),
      authorUsername: user.username,
      authorProfilePicture: user.profilePicture?.url || null,
      isLikedByUser: requestingUserInternalId ? (story.likedBy || []).includes(requestingUserInternalId) : false
    }));

    res.json({
      user: {
        username: user.username,
        displayName: user.displayName,
        joinedAt: user.joinedAt,
        profilePicture: user.profilePicture?.url
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
router.get('/me', requireAuth, async (req, res) => {
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
      role: user.role || 'user',
      profilePicture: user.profilePicture?.url
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

module.exports = router;
