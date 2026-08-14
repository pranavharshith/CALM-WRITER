const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Story = require('../../models/Story');
const { requireAuth } = require('../../middleware/auth');
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
      canTagContent: !!user.canTagContent,
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

    const Follow = require('../../models/Follow');
    const CollaborativeHub = require('../../models/CollaborativeHub');
    const Draft = require('../../models/Draft');

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

// GET /users/stats - Writing streaks, calendar, goal, freezes
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const {
      ensureBackfilled, utcDateKey, clampGoal, DEFAULT_GOAL,
      computeStreak, computeBestStreak, buildHeatmap, applyFreezeAndMilestones
    } = require('../../utils/writingDay');
    const WritingDay = require('../../models/WritingDay');

    await ensureBackfilled(req.internalId);

    const [stories, days, readSessions] = await Promise.all([
      Story.find({
        internalAuthorId: req.internalId,
        hidden: { $ne: true }
      }).select('likes wordCount').lean(),
      WritingDay.find({ userInternalId: req.internalId }).select('date wordCount storyCount').lean(),
      require('../../models/ReadSession').find({ userInternalId: req.internalId })
        .select('storyId percentRead')
        .lean()
    ]);

    const goal = clampGoal(user.preferences?.dailyWordGoal ?? DEFAULT_GOAL);
    const dayMap = new Map(days.map((d) => [d.date, d]));
    const writtenKeys = days.filter((d) => (d.wordCount || 0) > 0).map((d) => d.date);
    const firstPass = computeStreak(writtenKeys, user.freezeUsedDates || []);
    const freeze = applyFreezeAndMilestones(user, writtenKeys, firstPass);
    if (freeze.freezeJustUsed || freeze.freezeJustEarned) {
      await user.save();
    }

    const todayKey = utcDateKey();
    const todayRec = dayMap.get(todayKey);
    const todayWordCount = todayRec?.wordCount || 0;
    const totalStories = stories.length;
    const totalLikes = stories.reduce((sum, s) => sum + (s.likes || 0), 0);
    const totalWords = stories.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    const finished = new Set(
      readSessions.filter((r) => (r.percentRead || 0) >= 90).map((r) => String(r.storyId))
    );

    let newBadges = [];
    try {
      const { evaluateAchievements } = require('../../utils/achievements');
      newBadges = await evaluateAchievements(req.internalId, {
        currentStreak: freeze.currentStreak,
        bestStreak: computeBestStreak(writtenKeys)
      });
    } catch (err) {
      console.error('Achievement evaluate error:', err.message);
    }

    const badgeCount = await require('../../models/UserAchievement')
      .countDocuments({ userInternalId: req.internalId });

    res.json({
      success: true,
      stats: {
        currentStreak: freeze.currentStreak,
        bestStreak: computeBestStreak(writtenKeys),
        todayWordCount,
        wroteToday: todayWordCount > 0,
        dailyWordGoal: goal,
        goalProgress: goal > 0 ? Math.min(1, todayWordCount / goal) : 0,
        freezeTokens: user.freezeTokens || 0,
        freezeJustEarned: freeze.freezeJustEarned,
        freezeJustUsed: freeze.freezeJustUsed,
        totalStories,
        totalLikes,
        totalWords,
        storiesRead: finished.size,
        fullyReadStories: finished.size,
        heatmap: buildHeatmap(dayMap, goal, 17),
        badgeCount,
        newBadges
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

router.use('/achievements', require('./achievements'));

module.exports = router;
