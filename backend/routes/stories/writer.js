const {
  express, mongoose, Story, User, Like, Follow, ReadSession,
  requireAuth, optionalAuth, checkAndUpdateStoryPublishCooldown,
  sanitizeStoryMiddleware, getPaginationParams, getPaginationMeta,
  logAuthEvent, publicLimiter,
} = require('./_shared');

const router = express.Router();

// POST /stories/submit - Submit new story
router.post('/submit', requireAuth, sanitizeStoryMiddleware, async (req, res) => {
  try {
    const { text, title } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Story text is required' });
    }

    // Validate minimum content length (at least 10 characters)
    if (text.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Story must be at least 10 characters long' });
    }

    // Check cooldown
    const cooldownCheck = await checkAndUpdateStoryPublishCooldown(req.internalId, 12);
    if (!cooldownCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: cooldownCheck.message,
        timeRemaining: cooldownCheck.timeRemaining
      });
    }

    // Calculate word count
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 20000) {
      return res.status(400).json({ success: false, error: 'Story exceeds 20,000 word limit' });
    }

    const story = new Story({
      internalAuthorId: req.internalId,
      title: title || text.substring(0, 100),
      text,
      wordCount,
      publishedAt: new Date()
    });

    await story.save();
    logAuthEvent('STORY_PUBLISHED', req.internalId, true, { storyId: story._id });
    try {
      const { afterPublishedStory } = require('../../utils/writingDay');
      await afterPublishedStory(req.internalId, story.wordCount, story.publishedAt || story.createdAt);
    } catch (err) {
      console.error('WritingDay record error:', err.message);
    }

    res.json({
      success: true,
      message: 'Story published successfully',
      story: {
        _id: story._id,
        title: story.title,
        wordCount: story.wordCount,
        createdAt: story.createdAt
      }
    });
  } catch (error) {
    console.error('Story submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to publish story' });
  }
});

// GET /stories/mine - Fetch user's own stories
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await Story.countDocuments({ internalAuthorId: req.internalId });
    const stories = await Story.find({ internalAuthorId: req.internalId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      stories: stories.map(s => ({
        _id: s._id,
        title: s.title,
        text: s.text,
        preview: (s.text || '').substring(0, 200),
        wordCount: s.wordCount,
        likes: s.likes,
        isLikedByUser: (s.likedBy || []).includes(req.internalId),
        createdAt: s.createdAt,
        hidden: s.hidden
      })),
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Fetch user stories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stories' });
  }

});

// GET /stories/analytics - Get aggregated analytics for author
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const limitNum = parseInt(limit) || 3; // Default to 3 as requested

    // 1. Fetch ALL stories for global stats (views, reads, chart)
    const allStories = await Story.find({ internalAuthorId: req.internalId }).select('_id title createdAt likes wordCount');

    if (allStories.length === 0) {
      return res.json({
        success: true,
        stats: { totalViews: 0, totalReads: 0, totalLikes: 0, storyCount: 0 },
        dailyStats: [],
        stories: [],
        pagination: getPaginationMeta(0, page, limitNum)
      });
    }

    const allStoryIds = allStories.map(s => s._id);

    // 2. Aggregate global views/reads
    const stats = await ReadSession.aggregate([
      { $match: { storyId: { $in: allStoryIds } } },
      {
        $group: {
          _id: '$storyId',
          views: { $sum: 1 },
          reads: { $sum: { $cond: [{ $gte: ['$percentRead', 90] }, 1, 0] } }
        }
      }
    ]);

    // 3. Aggregate daily stats (last 30 days) - GLOBAL
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsByDate = await ReadSession.aggregate([
      {
        $match: {
          storyId: { $in: allStoryIds },
          startedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
          views: { $sum: 1 },
          reads: { $sum: { $cond: [{ $gte: ['$percentRead', 90] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map stats for easy lookup
    const statsMap = {};
    stats.forEach(s => {
      statsMap[s._id.toString()] = s;
    });

    // Calculate totals
    let totalViews = 0;
    let totalReads = 0;
    let totalLikes = 0;

    allStories.forEach(s => {
      const stat = statsMap[s._id.toString()] || { views: 0, reads: 0 };
      totalViews += stat.views;
      totalReads += stat.reads;
      totalLikes += s.likes;
    });

    // 4. Fetch PAGINATED stories for the list
    // We can't reuse `allStories` effectively because we need them sorted by date and sliced
    // It's cleaner to query DB or slice the array. Since we already have allStories, slicing is cheaper if count is low (<1000).
    // But for scalability, let's just slice the array since we likely won't have millions of stories per user yet.

    // Sort by createdAt desc
    allStories.sort((a, b) => b.createdAt - a.createdAt);

    // Slice for pagination
    // skip is calculated by getPaginationParams: (page - 1) * limit
    const paginatedStories = allStories.slice(skip, skip + limitNum);

    const enrichedStories = paginatedStories.map(s => {
      const stat = statsMap[s._id.toString()] || { views: 0, reads: 0 };
      return {
        _id: s._id,
        title: s.title,
        createdAt: s.createdAt,
        views: stat.views,
        reads: stat.reads,
        likes: s.likes,
        wordCount: s.wordCount
      };
    });

    res.json({
      success: true,
      stats: {
        totalViews,
        totalReads,
        totalLikes,
        storyCount: allStories.length
      },
      dailyStats: viewsByDate,
      stories: enrichedStories,
      pagination: getPaginationMeta(allStories.length, page, limitNum)
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// GET /stories/can-write - Check if user can write (cooldown check)
router.get('/can-write', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const now = new Date();
    const cooldownTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const canWrite = !user.lastStoryPublishedAt || user.lastStoryPublishedAt < cooldownTime;

    if (!canWrite) {
      const timeRemaining = user.lastStoryPublishedAt.getTime() + (12 * 60 * 60 * 1000) - now.getTime();
      return res.json({
        success: true,
        canWrite: false,
        timeRemaining: Math.ceil(timeRemaining / 1000),
        message: `Please wait ${Math.ceil(timeRemaining / (60 * 60 * 1000))} hours before writing again`
      });
    }

    res.json({ success: true, canWrite: true });
  } catch (error) {
    console.error('Can write check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check write status' });
  }
});

// GET /stories/archive - Fetch archived stories
router.get('/archive', requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await Story.countDocuments({
      internalAuthorId: req.internalId,
      hidden: true
    });

    const stories = await Story.find({
      internalAuthorId: req.internalId,
      hidden: true
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      stories: stories.map(s => ({
        _id: s._id,
        title: s.title,
        text: s.text,
        preview: (s.text || '').substring(0, 200),
        hiddenReason: s.hiddenReason,
        createdAt: s.createdAt
      })),
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Archive fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch archive' });
  }
});


module.exports = router;
