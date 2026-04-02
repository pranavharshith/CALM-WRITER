const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');
const Like = require('../models/Like');

const Follow = require('../models/Follow');
const ReadSession = require('../models/ReadSession');
const { requireAuth, optionalAuth } = require('../middleware/auth-consolidated');
const { checkAndUpdateStoryPublishCooldown } = require('../utils/cooldownManager');
const { sanitizeStoryMiddleware } = require('../middleware/inputSanitization');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { logAuthEvent } = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const { ipKey } = require('express-rate-limit');

// Rate limiter for public endpoints - 100 requests per 15 minutes
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKey(req)
});

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

// GET /stories/random - Fetch random story
router.get('/random', publicLimiter, optionalAuth, async (req, res) => {
  try {
    const { getActiveStoriesFilter } = require('../utils/storyQueryHelper');
    const story = await Story.aggregate([
      { $match: { ...getActiveStoriesFilter(), threadLocked: false } },
      { $sample: { size: 1 } }
    ]);

    if (!story || story.length === 0) {
      return res.json({ success: false, error: 'No stories available' });
    }

    const storyData = story[0];
    const author = await User.findOne({ internalId: storyData.internalAuthorId });

    res.json({
      success: true,
      story: {
        _id: storyData._id,
        title: storyData.title,
        text: storyData.text,
        preview: storyData.text.substring(0, 200) + '...',
        wordCount: storyData.wordCount,
        likes: storyData.likes,
        authorUsername: author?.username || 'Anonymous',
        authorDisplayName: author?.displayName || 'Anonymous',
        authorProfilePicture: author?.profilePicture?.url,
        createdAt: storyData.createdAt,
        isLikedByUser: req.internalId ? storyData.likedBy?.includes(req.internalId) : false
      }
    });
  } catch (error) {
    console.error('Random story error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch story' });
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
        wordCount: s.wordCount,
        likes: s.likes,
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
          reads: { $sum: { $cond: [{ $gte: ['$percentRead', 0.9] }, 1, 0] } }
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
          reads: { $sum: { $cond: [{ $gte: ['$percentRead', 0.9] }, 1, 0] } }
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

// GET /stories/following - Fetch stories from followed authors
router.get('/following', requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // 1. Get list of authors user follows
    const follows = await Follow.find({ followerInternalId: req.internalId });
    const followingIds = follows.map(f => f.followingInternalId);

    if (followingIds.length === 0) {
      return res.json({
        success: true,
        stories: [],
        pagination: getPaginationMeta(0, page, limit),
        message: 'You are not following anyone yet.'
      });
    }

    // 2. Query stories
    const total = await Story.countDocuments({
      internalAuthorId: { $in: followingIds },
      hidden: false
    });

    // Use aggregation to avoid N+1 query
    const stories = await Story.aggregate([
      {
        $match: {
          internalAuthorId: { $in: followingIds },
          hidden: false
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'internalAuthorId',
          foreignField: 'internalId',
          as: 'author'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          text: { $substr: ['$text', 0, 200] },
          wordCount: 1,
          likes: 1,
          likedBy: 1,
          createdAt: 1,
          authorUsername: { $arrayElemAt: ['$author.username', 0] },
          authorDisplayName: { $arrayElemAt: ['$author.displayName', 0] },
          authorProfilePicture: { $arrayElemAt: ['$author.profilePicture.url', 0] }
        }
      }
    ]);

    const enriched = stories.map(s => ({
      _id: s._id,
      title: s.title,
      text: s.text + '...',
      preview: s.text + '...',
      wordCount: s.wordCount,
      likes: s.likes,
      authorUsername: s.authorUsername || 'Anonymous',
      authorDisplayName: s.authorDisplayName || 'Anonymous',
      authorProfilePicture: s.authorProfilePicture,
      createdAt: s.createdAt,
      isLikedByUser: req.internalId ? s.likedBy?.includes(req.internalId) : false
    }));

    res.json({
      success: true,
      stories: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Following feed error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch following feed' });
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

// GET /stories/feed - Fetch community feed
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const sort = req.query.sort || 'latest'; // latest, trending, most-liked

    let sortOption = { createdAt: -1 };
    if (sort === 'trending') {
      sortOption = { likes: -1, createdAt: -1 };
    } else if (sort === 'most-liked') {
      sortOption = { likes: -1 };
    }

    const total = await Story.countDocuments({ hidden: false });

    // Use aggregation to avoid N+1 query
    const stories = await Story.aggregate([
      { $match: { hidden: false } },
      { $sort: sortOption },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'internalAuthorId',
          foreignField: 'internalId',
          as: 'author'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          text: { $substr: ['$text', 0, 200] },
          wordCount: 1,
          likes: 1,
          likedBy: 1,
          createdAt: 1,
          authorUsername: { $arrayElemAt: ['$author.username', 0] },
          authorDisplayName: { $arrayElemAt: ['$author.displayName', 0] },
          authorProfilePicture: { $arrayElemAt: ['$author.profilePicture.url', 0] }
        }
      }
    ]);

    const enriched = stories.map(s => ({
      _id: s._id,
      title: s.title,
      text: s.text + '...',
      preview: s.text + '...',
      wordCount: s.wordCount,
      likes: s.likes,
      authorUsername: s.authorUsername || 'Anonymous',
      authorDisplayName: s.authorDisplayName || 'Anonymous',
      authorProfilePicture: s.authorProfilePicture,
      createdAt: s.createdAt,
      isLikedByUser: req.internalId ? s.likedBy?.includes(req.internalId) : false
    }));

    res.json({
      success: true,
      stories: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Feed fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feed' });
  }
});

// GET /stories/featured - Fetch featured story
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findOne({ isFeatured: true, hidden: false });
    if (!story) {
      return res.json({ success: false, error: 'No featured story' });
    }

    const author = await User.findOne({ internalId: story.internalAuthorId });

    res.json({
      success: true,
      story: {
        _id: story._id,
        title: story.title,
        text: story.text,
        preview: story.text.substring(0, 200) + '...',
        wordCount: story.wordCount,
        likes: story.likes,
        authorUsername: author?.username || 'Anonymous',
        authorDisplayName: author?.displayName || 'Anonymous',
        authorProfilePicture: author?.profilePicture?.url,
        createdAt: story.createdAt,
        isLikedByUser: req.internalId ? story.likedBy?.includes(req.internalId) : false
      }
    });
  } catch (error) {
    console.error('Featured story error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch featured story' });
  }
});

// GET /stories/:storyId - Fetch specific story
router.get('/:storyId', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story || story.hidden) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const author = story.internalAuthorId ? await User.findOne({ internalId: story.internalAuthorId }) : null;

    res.json({
      success: true,
      story: {
        _id: story._id,
        title: story.title || '',
        text: story.text || '',
        preview: (story.text || '').substring(0, 200) + '...',
        wordCount: story.wordCount || 0,
        likes: Math.max(0, story.likes || 0),
        authorUsername: author?.username || 'Anonymous',
        authorDisplayName: author?.displayName || 'Anonymous',
        authorProfilePicture: author?.profilePicture?.url || null,
        internalAuthorId: story.internalAuthorId,
        createdAt: story.createdAt,
        isLikedByUser: req.internalId && story.likedBy ? story.likedBy.includes(req.internalId) : false,
        threadLocked: story.threadLocked || false
      }
    });
  } catch (error) {
    console.error('Story fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch story' });
  }
});

// POST /stories/like - Like/Unlike a story
router.post('/like', requireAuth, async (req, res) => {
  try {
    const { storyId } = req.body;
    if (!storyId) {
      return res.status(400).json({ success: false, error: 'Story ID required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    // Check if already liked using BOTH sources for data consistency
    const existingLike = await Like.findOne({
      userInternalId: req.internalId,
      storyId
    });

    const isLikedInArray = story.likedBy?.includes(req.internalId);

    // Data consistency check: if mismatch, fix it
    if (existingLike && !isLikedInArray) {
      // Like record exists but not in array - add to array
      await Story.findByIdAndUpdate(storyId, {
        $addToSet: { likedBy: req.internalId }
      });
    } else if (!existingLike && isLikedInArray) {
      // Array has like but no Like record - create it
      try {
        await Like.create({
          userInternalId: req.internalId,
          storyId
        });
      } catch (err) {
        // Unique constraint violation - already exists, ignore
        if (err.code !== 11000) throw err;
      }
    }

    // Now handle the toggle
    if (existingLike || isLikedInArray) {
      // Unlike - remove from both places atomically
      await Like.deleteOne({
        userInternalId: req.internalId,
        storyId
      });

      const result = await Story.findByIdAndUpdate(
        storyId,
        {
          $pull: { likedBy: req.internalId },
          $inc: { likes: -1 }
        },
        { new: true }
      );

      return res.json({
        success: true,
        liked: false,
        likes: Math.max(0, result?.likes || 0)
      });
    }

    // Like - add to both places atomically
    try {
      await Like.create({
        userInternalId: req.internalId,
        storyId
      });
    } catch (err) {
      // Unique constraint violation - already liked
      if (err.code === 11000) {
        return res.json({
          success: true,
          liked: true,
          likes: story.likes
        });
      }
      throw err;
    }

    const result = await Story.findByIdAndUpdate(
      storyId,
      {
        $addToSet: { likedBy: req.internalId },
        $inc: { likes: 1 }
      },
      { new: true }
    );

    res.json({
      success: true,
      liked: true,
      likes: result?.likes || 0
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ success: false, error: 'Failed to like story' });
  }
});

// PUT /stories/:storyId - Edit a story (within grace period)
router.put('/:storyId', requireAuth, sanitizeStoryMiddleware, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { text, title } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Story text is required' });
    }

    if (text.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Story must be at least 10 characters long' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    // Check ownership
    if (story.internalAuthorId !== req.internalId) {
      return res.status(403).json({ success: false, error: 'You can only edit your own stories' });
    }

    // Check if story is locked by moderator
    if (story.threadLocked) {
      return res.status(403).json({ success: false, error: 'This story is locked by a moderator' });
    }

    // Check edit grace period (5 minutes after publish)
    const GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    const publishTime = story.publishedAt || story.createdAt;
    const timeSincePublish = now - publishTime;

    if (timeSincePublish > GRACE_PERIOD) {
      return res.status(403).json({
        success: false,
        error: 'Edit window closed. Stories can only be edited within 5 minutes of publishing.'
      });
    }

    // Check max edits (3 edits allowed)
    if (story.editCount >= 3) {
      return res.status(403).json({ success: false, error: 'Maximum edits (3) reached' });
    }

    // Calculate new word count
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 20000) {
      return res.status(400).json({ success: false, error: 'Story exceeds 20,000 word limit' });
    }

    // Update story
    story.text = text;
    story.title = title || text.substring(0, 100);
    story.wordCount = wordCount;
    story.lastEditedAt = now;
    story.editCount = (story.editCount || 0) + 1;

    await story.save();
    logAuthEvent('STORY_EDITED', req.internalId, true, { storyId: story._id, editCount: story.editCount });

    res.json({
      success: true,
      message: 'Story updated successfully',
      story: {
        _id: story._id,
        title: story.title,
        text: story.text,
        wordCount: story.wordCount,
        editCount: story.editCount,
        lastEditedAt: story.lastEditedAt
      }
    });
  } catch (error) {
    console.error('Story edit error:', error);
    res.status(500).json({ success: false, error: 'Failed to edit story' });
  }
});

// DELETE /stories/:storyId - Delete a story (only within grace period)
router.delete('/:storyId', requireAuth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    // Check ownership
    if (story.internalAuthorId !== req.internalId) {
      return res.status(403).json({ success: false, error: 'You can only delete your own stories' });
    }

    // Check if story is locked by moderator
    if (story.threadLocked) {
      return res.status(403).json({ success: false, error: 'This story is locked by a moderator' });
    }

    // Check delete grace period (30 minutes after publish)
    const DELETE_GRACE_PERIOD = 30 * 60 * 1000; // 30 minutes
    const now = new Date();
    const publishTime = story.publishedAt || story.createdAt;
    const timeSincePublish = now - publishTime;

    if (timeSincePublish > DELETE_GRACE_PERIOD) {
      return res.status(403).json({
        success: false,
        error: 'Delete window closed. Stories can only be deleted within 30 minutes of publishing.'
      });
    }

    // Delete the story
    await Story.findByIdAndDelete(storyId);

    // Delete associated likes
    await Like.deleteMany({ storyId });

    logAuthEvent('STORY_DELETED', req.internalId, true, { storyId });

    res.json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Story delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete story' });
  }
});

// GET /stories/leaderboard - Fetch leaderboard
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const period = req.query.period || '24h';
    let dateFilter = new Date();

    if (period === '7d') dateFilter.setDate(dateFilter.getDate() - 7);
    else if (period === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
    else dateFilter.setHours(dateFilter.getHours() - 24);

    const stories = await Story.find({
      hidden: false,
      createdAt: { $gte: dateFilter }
    })
      .sort({ likes: -1 })
      .limit(10)
      .lean();

    const enriched = await Promise.all(stories.map(async (s) => {
      const author = await User.findOne({ internalId: s.internalAuthorId });
      return {
        _id: s._id,
        title: s.title,
        likes: s.likes,
        author: author?.username,
        createdAt: s.createdAt
      };
    }));

    res.json({ success: true, stories: enriched });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// GET /stories/search - Search stories
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const { skip } = getPaginationParams({ page, limit });

    const total = await Story.countDocuments({
      hidden: false,
      $text: { $search: q }
    });

    const stories = await Story.find({
      hidden: false,
      $text: { $search: q }
    })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const enriched = await Promise.all(stories.map(async (s) => {
      const author = await User.findOne({ internalId: s.internalAuthorId });
      return {
        _id: s._id,
        title: s.title,
        text: s.text.substring(0, 150) + '...',
        preview: s.text.substring(0, 150) + '...',
        authorUsername: author?.username || 'Anonymous',
        authorDisplayName: author?.displayName || 'Anonymous',
        authorProfilePicture: author?.profilePicture?.url,
        likes: s.likes,
        createdAt: s.createdAt,
        isLikedByUser: req.internalId ? s.likedBy?.includes(req.internalId) : false
      };
    }));

    res.json({
      success: true,
      stories: enriched,
      pagination: getPaginationMeta(total, parseInt(page), parseInt(limit))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search stories' });
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
