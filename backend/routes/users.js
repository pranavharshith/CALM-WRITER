const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Story = require('../models/Story');
const { requireAuth } = require('../middleware/auth-consolidated');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Rate limiter for profile lookups - 500 requests per 15 minutes (very generous)
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many profile requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.params.username || ipKeyGenerator(req.ip)
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
    const stories = await Story.find({ internalAuthorId: user.internalId, hidden: false })
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
      preview: (story.text || '').substring(0, 200) + ((story.text || '').length > 200 ? '...' : ''),
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
      profilePicture: user.profilePicture?.url,
      isEmailVerified: !!user.isEmailVerified,
      canCreateHubs: !!user.canCreateHubs,
      strikes: user.strikes || 0,
      preferences: user.preferences || {}
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// GET /users/onboarding - Guided first-steps progress for a new user
router.get('/onboarding', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const Follow = require('../models/Follow');
    const CollaborativeHub = require('../models/CollaborativeHub');
    const Draft = require('../models/Draft');

    const [storyCount, followingCount, followersCount, hubCount, draftCount] = await Promise.all([
      Story.countDocuments({ internalAuthorId: req.internalId }),
      Follow.countDocuments({ followerInternalId: req.internalId }),
      Follow.countDocuments({ followingInternalId: req.internalId }),
      CollaborativeHub.countDocuments({ 'members.userInternalId': req.internalId }),
      Draft.countDocuments({ internalAuthorId: req.internalId })
    ]);

    res.json({
      success: true,
      steps: {
        verifyEmail: { done: !!user.isEmailVerified },
        writeFirstStory: { done: storyCount >= 1 },
        followWriters: { done: followingCount >= 1 },
        joinHub: { done: hubCount >= 1 }
      },
      counts: { storyCount, followingCount, followersCount, hubCount, draftCount }
    });
  } catch (error) {
    console.error('Onboarding fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding status' });
  }
});

// GET /users/stats - Writing streaks, totals and reading summary for the current user
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stories = await Story.find({
      internalAuthorId: req.internalId,
      hidden: false
    }).select('createdAt likes wordCount title').lean();

    const storyDates = stories.map(s => {
      const d = new Date(s.createdAt || s.publishedAt || Date.now());
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    // Current streak: consecutive days ending today or yesterday
    const uniqueDays = [...new Set(storyDates)].sort((a, b) => b - a);
    let currentStreak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const oneDay = 24 * 60 * 60 * 1000;
    let cursor = today.getTime();
    if (uniqueDays[0] !== cursor) cursor -= oneDay; // streak counts if they wrote today OR yesterday
    for (const day of uniqueDays) {
      if (day === cursor) { currentStreak++; cursor -= oneDay; }
      else break;
    }

    // Best streak over last 365 days
    let bestStreak = 0;
    const daySet = new Set(uniqueDays);
    let run = 0, prev = null;
    for (const day of uniqueDays.sort((a, b) => a - b)) {
      if (prev !== null && day === prev + oneDay) run++;
      else run = 1;
      if (run > bestStreak) bestStreak = run;
      prev = day;
    }

    // Today's word count
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const totalStories = stories.length;
    const totalLikes = stories.reduce((sum, s) => sum + (s.likes || 0), 0);
    const totalWords = stories.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    const todayStory = stories.find(s => {
      const d = new Date(s.createdAt || s.publishedAt);
      return d >= startOfToday;
    });

    // Reading summary
    const ReadSession = require('../models/ReadSession');
    const readSessions = await ReadSession.find({ userInternalId: req.internalId })
      .select('storyId percentRead startedAt')
      .lean();
    const storiesRead = readSessions.filter(r => (r.percentRead || 0) >= 90).length;
    const fullyReadStories = new Set(readSessions.filter(r => (r.percentRead || 0) >= 90).map(r => r.storyId.toString()));

    res.json({
      success: true,
      stats: {
        currentStreak,
        bestStreak,
        todayWordCount: todayStory ? (todayStory.wordCount || 0) : 0,
        wroteToday: !!todayStory,
        totalStories,
        totalLikes,
        totalWords,
        storiesRead: storiesRead,
        fullyReadStories: fullyReadStories.size
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

module.exports = router;
