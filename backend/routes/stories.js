const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');

const SOFT_WORD_LIMIT = 800;

// Middleware: Check session by internalId (dev demo, not JWT for now)
function requireSession(req, res, next) {
  const userId = req.header('X-Internal-Id');
  if (!userId) return res.status(401).json({ error: 'Missing session' });
  req.internalId = userId;
  next();
}

// POST /stories/submit: Submit new story (lockout/enforce 1 per 12h for users, unlimited for admins)
router.post('/submit', requireSession, async (req, res) => {
  const { text, title } = req.body;

  // Validate title (required, at least 3 words)
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const titleWords = title.trim().split(/\s+/).filter(word => word.length > 0);
  if (titleWords.length < 3) {
    return res.status(400).json({ error: 'Title must contain at least 3 words' });
  }

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Story content is required' });
  }

  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > SOFT_WORD_LIMIT) {
    // Calm nudge: Not hard error, but feedback
    return res.status(400).json({ error: 'Try to keep stories under 800 words.' });
  }

  // Check last story time (12h lockout for users, no limit for admins)
  const user = await User.findOne({ internalId: req.internalId });

  // Admins can post unlimited stories
  if (user && user.role !== 'admin') {
    const latest = await Story.findOne({ internalAuthorId: req.internalId }).sort({ createdAt: -1 });
    if (latest && Date.now() - latest.createdAt.getTime() < 12 * 60 * 60 * 1000) {
      return res.status(403).json({ error: 'You can only write once every 12 hours.' });
    }
  }

  const story = new Story({
    internalAuthorId: req.internalId,
    title: title.trim(),
    text,
    wordCount,
    locked: true,
    publishedAt: new Date(), // Track when published for grace period
  });
  await story.save();
  res.json({ success: true, storyId: story._id });
});

// POST /stories/:id/edit: Edit story within 15-minute grace period (CRITICAL FIX #3)
router.post('/:id/edit', requireSession, async (req, res) => {
  try {
    const { title, text } = req.body;
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check ownership
    if (story.internalAuthorId !== req.internalId) {
      return res.status(403).json({ error: 'You can only edit your own stories' });
    }

    // Check grace period (15 minutes = 900,000 ms)
    const gracePeriod = 15 * 60 * 1000;
    const timeSincePublish = Date.now() - story.publishedAt.getTime();

    if (timeSincePublish > gracePeriod) {
      const minutesAgo = Math.floor(timeSincePublish / 60000);
      return res.status(403).json({
        error: `Grace period expired. Story was published ${minutesAgo} minutes ago.`,
        gracePeriodExpired: true
      });
    }

    // Check edit limit (max 3 edits to prevent abuse)
    if (story.editCount >= 3) {
      return res.status(403).json({
        error: 'Maximum edit limit reached (3 edits per story)',
        editLimitReached: true
      });
    }

    // Validate title (required, at least 3 words)
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const titleWords = title.trim().split(/\s+/).filter(word => word.length > 0);
    if (titleWords.length < 3) {
      return res.status(400).json({ error: 'Title must contain at least 3 words' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Story content is required' });
    }

    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 800) {
      return res.status(400).json({ error: 'Try to keep stories under 800 words.' });
    }

    // Update story
    story.title = title.trim();
    story.text = text;
    story.wordCount = wordCount;
    story.lastEditedAt = new Date();
    story.editCount = (story.editCount || 0) + 1;
    await story.save();

    const timeRemaining = gracePeriod - timeSincePublish;
    const minutesRemaining = Math.floor(timeRemaining / 60000);

    res.json({
      success: true,
      story,
      editsRemaining: 3 - story.editCount,
      gracePeriodRemaining: minutesRemaining
    });
  } catch (error) {
    console.error('Edit story error:', error);
    res.status(500).json({ error: 'Failed to edit story' });
  }
});

// GET /stories/mine: List my past stories (private archive)
router.get('/mine', requireSession, async (req, res) => {
  const stories = await Story.find({ internalAuthorId: req.internalId }).sort({ createdAt: -1 });
  res.json(stories);
});

// GET /stories/random: Get random story for reader (excluding own)
router.get('/random', requireSession, async (req, res) => {
  try {
    const stories = await Story.find({ internalAuthorId: { $ne: req.internalId }, hidden: false });
    if (!stories.length) {
      return res.json({ error: 'No stories available' });
    }
    const randomStory = stories[Math.floor(Math.random() * stories.length)];
    res.json(randomStory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// GET /stories/next: Get next story for reader (excluding own, sort by resonance)
router.get('/next', requireSession, async (req, res) => {
  // Find all non-own stories, sort by: completion rate DESC, avg time spent DESC, reactions DESC
  const allStories = await Story.find({ internalAuthorId: { $ne: req.internalId }, hidden: false });
  if (!allStories.length) return res.json({ none: true });

  // Load resonance metrics
  const ReadSession = require('../models/ReadSession');
  const Reaction = require('../models/Reaction');
  const metrics = await Promise.all(allStories.map(async (s) => {
    const reads = await ReadSession.find({ storyId: s._id });
    const completion = reads.length ? reads.filter(r => r.percentRead >= 90).length / reads.length : 0;
    const avgTime = reads.length ? reads.reduce((a, r) => a + (r.timeSpent || 0), 0) / reads.length : 0;
    const reacts = await Reaction.countDocuments({ storyId: s._id });
    return {
      story: s,
      resonance: completion * 2 + (avgTime / 4000) + reacts * 0.2,
    };
  }));
  metrics.sort((a, b) => b.resonance - a.resonance);
  res.json({ story: metrics[0].story });
});

// GET /stories/can-write: Check if user can write (12h lockout for users, unlimited for admins)
router.get('/can-write', requireSession, async (req, res) => {
  // Check if user is admin
  const user = await User.findOne({ internalId: req.internalId });

  // Admins can always write
  if (user && user.role === 'admin') {
    return res.json({
      canWrite: true,
      timeUntilNext: 0,
      isAdmin: true
    });
  }

  const latest = await Story.findOne({ internalAuthorId: req.internalId }).sort({ createdAt: -1 });
  if (!latest) {
    return res.json({ canWrite: true });
  }
  const timeSinceLastStory = Date.now() - latest.createdAt.getTime();
  const canWrite = timeSinceLastStory >= 12 * 60 * 60 * 1000;
  const timeUntilNext = canWrite ? 0 : (12 * 60 * 60 * 1000) - timeSinceLastStory;

  res.json({
    canWrite,
    timeUntilNext,
    lastStoryTime: latest.createdAt
  });
});

// GET /stories/feed: Get community feed with pagination
router.get('/feed', requireSession, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'latest'; // latest, popular, trending
    const skip = (page - 1) * limit;

    let findQuery = { hidden: false }; // Exclude hidden stories
    let sortQuery = {};

    switch (sort) {
      case 'popular':
        sortQuery = { likes: -1, createdAt: -1 };
        break;
      case 'trending':
        // Stories with likes in last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        findQuery = { createdAt: { $gte: weekAgo }, hidden: false };
        sortQuery = { likes: -1, createdAt: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const stories = await Story.find(findQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get author usernames
    const User = require('../models/User');
    const enrichedStories = await Promise.all(stories.map(async (story) => {
      const author = await User.findOne({ internalId: story.internalAuthorId });
      return {
        ...story,
        authorUsername: author?.username || 'Anonymous',
        preview: story.text.substring(0, 200) + (story.text.length > 200 ? '...' : ''),
        isLikedByUser: (story.likedBy || []).includes(req.internalId),
        likes: story.likes || 0,
        likedBy: story.likedBy || []
      };
    }));

    const totalStories = await Story.countDocuments({ hidden: false });

    res.json({
      stories: enrichedStories,
      pagination: {
        page,
        limit,
        total: totalStories,
        pages: Math.ceil(totalStories / limit),
        hasNext: page * limit < totalStories,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/* MOVED TO END OF FILE - DO NOT UNCOMMENT
// GET /stories/:id: Get single story by ID
router.get('/:id', requireSession, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.hidden) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Get author username
    const User = require('./models/User');
    const author = await User.findOne({ internalId: story.internalAuthorId });

    res.json({
      ...story.toObject(),
      authorUsername: author?.username || 'Anonymous',
      isLikedByUser: (story.likedBy || []).includes(req.internalId),
      likes: story.likes || 0
    });
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});
*/

// GET /stories/featured: Get current featured story
router.get('/featured', async (req, res) => {
  try {
    const featuredStory = await Story.findOne({ isFeatured: true });
    if (!featuredStory) {
      return res.json({ featured: null });
    }

    const User = require('../models/User');
    const author = await User.findOne({ internalId: featuredStory.internalAuthorId });

    res.json({
      featured: {
        ...featuredStory.toObject(),
        authorUsername: author?.username || 'Anonymous'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured story' });
  }
});

// POST /stories/like: Like or unlike a story
router.post('/like', requireSession, async (req, res) => {
  try {
    const { storyId } = req.body;
    if (!storyId) {
      return res.status(400).json({ error: 'Story ID required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check if user already liked this story
    const alreadyLiked = story.likedBy.includes(req.internalId);

    if (alreadyLiked) {
      // Unlike
      story.likedBy = story.likedBy.filter(id => id !== req.internalId);
      story.likes = Math.max(0, story.likes - 1);
    } else {
      // Like
      story.likedBy.push(req.internalId);
      story.likes += 1;
    }

    await story.save();

    res.json({
      success: true,
      liked: !alreadyLiked,
      likes: story.likes
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like story' });
  }
});

// GET /stories/search: Search stories with filters
router.get('/search', requireSession, async (req, res) => {
  try {
    const {
      q, // search query (title, content, author)
      minLikes,
      maxLikes,
      minWords,
      maxWords,
      dateFrom, // ISO date string
      dateTo, // ISO date string
      page = 1,
      limit = 10
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let findQuery = { hidden: false };

    // Text search: search in title, text, or author username
    if (q && q.trim()) {
      const searchTerm = q.trim();

      // First, find users matching the search term
      const matchingUsers = await User.find({
        username: { $regex: searchTerm, $options: 'i' }
      }).select('internalId');
      const matchingUserIds = matchingUsers.map(u => u.internalId);

      // Build text search query
      const textSearchQuery = {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { text: { $regex: searchTerm, $options: 'i' } },
          ...(matchingUserIds.length > 0 ? [{ internalAuthorId: { $in: matchingUserIds } }] : [])
        ]
      };

      // If we have other filters, combine with $and, otherwise use text search directly
      if (minLikes || maxLikes || minWords || maxWords || dateFrom || dateTo) {
        if (!findQuery.$and) findQuery.$and = [];
        findQuery.$and.push(textSearchQuery);
      } else {
        Object.assign(findQuery, textSearchQuery);
      }
    }

    // Filter by likes
    if (minLikes || maxLikes) {
      findQuery.likes = {};
      if (minLikes) findQuery.likes.$gte = parseInt(minLikes);
      if (maxLikes) findQuery.likes.$lte = parseInt(maxLikes);
    }

    // Filter by word count
    if (minWords || maxWords) {
      findQuery.wordCount = {};
      if (minWords) findQuery.wordCount.$gte = parseInt(minWords);
      if (maxWords) findQuery.wordCount.$lte = parseInt(maxWords);
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      findQuery.createdAt = {};
      if (dateFrom) findQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) findQuery.createdAt.$lte = new Date(dateTo);
    }

    const stories = await Story.find(findQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enrich with author usernames
    const enrichedStories = await Promise.all(stories.map(async (story) => {
      const author = await User.findOne({ internalId: story.internalAuthorId });
      return {
        ...story,
        authorUsername: author?.username || 'Anonymous',
        preview: story.text.substring(0, 200) + (story.text.length > 200 ? '...' : ''),
        isLikedByUser: (story.likedBy || []).includes(req.internalId),
        likes: story.likes || 0,
        likedBy: story.likedBy || []
      };
    }));

    const totalStories = await Story.countDocuments(findQuery);

    res.json({
      stories: enrichedStories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalStories,
        pages: Math.ceil(totalStories / parseInt(limit)),
        hasNext: skip + parseInt(limit) < totalStories,
        hasPrev: parseInt(page) > 1
      },
      query: q || ''
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search stories' });
  }
});

// GET /stories/leaderboard: Get top users by likes in different time periods
router.get('/leaderboard', async (req, res) => {
  try {
    const period = req.query.period || '24h'; // 24h, 3d, 1w

    let timeFilter = {};
    const now = new Date();

    switch (period) {
      case '24h':
        timeFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
        break;
      case '3d':
        timeFilter = { createdAt: { $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } };
        break;
      case '1w':
        timeFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        timeFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
    }

    // Aggregate likes by author in the time period
    const leaderboard = await Story.aggregate([
      { $match: timeFilter },
      {
        $group: {
          _id: '$internalAuthorId',
          totalLikes: { $sum: '$likes' },
          storyCount: { $sum: 1 }
        }
      },
      { $sort: { totalLikes: -1 } },
      { $limit: 10 }
    ]);

    // Get usernames for the top users (only include users with usernames)
    const User = require('../models/User');
    const enrichedLeaderboard = [];

    for (const entry of leaderboard) {
      const user = await User.findOne({ internalId: entry._id });
      if (user && user.username) {
        enrichedLeaderboard.push({
          username: user.username,
          internalId: entry._id,
          totalLikes: entry.totalLikes,
          storyCount: entry.storyCount
        });
      }
    }

    res.json({
      period,
      leaderboard: enrichedLeaderboard
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /stories/:id: Get single story by ID (MUST be last to avoid catching other routes)
router.get('/:id', requireSession, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.hidden) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Get author username
    const User = require('../models/User');
    const author = await User.findOne({ internalId: story.internalAuthorId });

    res.json({
      ...story.toObject(),
      authorUsername: author?.username || 'Anonymous',
      isLikedByUser: (story.likedBy || []).includes(req.internalId),
      likes: story.likes || 0
    });
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

module.exports = router;

