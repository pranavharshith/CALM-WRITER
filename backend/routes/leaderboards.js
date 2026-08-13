const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const Reaction = require('../models/Reaction');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth-consolidated');

// GET /leaderboards/top-stories - Top stories leaderboard
router.get('/top-stories', optionalAuth, async (req, res) => {
  try {
    const period = req.query.period || '24h';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    let dateFilter = new Date();

    // Map period values to days
    if (period === '3d') dateFilter.setDate(dateFilter.getDate() - 3);
    else if (period === '1w' || period === '7d') dateFilter.setDate(dateFilter.getDate() - 7);
    else if (period === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
    else if (period === 'all-time') dateFilter = new Date(0); // Beginning of time
    else dateFilter.setHours(dateFilter.getHours() - 24); // Default to 24h

    // Use aggregation to avoid N+1 query
    const stories = await Story.aggregate([
      {
        $match: {
          hidden: false,
          createdAt: { $gte: dateFilter }
        }
      },
      { $sort: { likes: -1 } },
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
          storyId: '$_id',
          storyTitle: '$title',
          likes: { $max: [0, '$likes'] },
          wordCount: 1,
          createdAt: 1,
          username: { $arrayElemAt: ['$author.username', 0] }
        }
      }
    ]);

    res.json({ success: true, stories, period });
  } catch (error) {
    console.error('Top stories leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// GET /leaderboards/most-felt - Most felt stories
router.get('/most-felt', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    // Use aggregation to avoid N+1 query
    const stories = await Reaction.aggregate([
      { $match: { type: { $in: ['stayed_with_me', 'felt_seen', 'learned_something'] } } },
      { $group: { _id: '$storyId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'stories',
          localField: '_id',
          foreignField: '_id',
          as: 'story'
        }
      },
      { $unwind: '$story' },
      {
        $lookup: {
          from: 'users',
          localField: 'story.internalAuthorId',
          foreignField: 'internalId',
          as: 'author'
        }
      },
      {
        $project: {
          _id: '$story._id',
          title: '$story.title',
          preview: { $substrCP: [{ $ifNull: ['$story.text', ''] }, 0, 150] },
          authorUsername: { $arrayElemAt: ['$author.username', 0] },
          reactions: '$count',
          completionRate: 100,
          createdAt: '$story.createdAt'
        }
      }
    ]);

    res.json({ success: true, stories, description: 'Stories that moved people deeply' });
  } catch (error) {
    console.error('Most felt leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// GET /leaderboards/quietly-powerful - Quietly powerful stories
router.get('/quietly-powerful', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    // Use aggregation to avoid N+1 query
    const stories = await Story.aggregate([
      { $match: { hidden: false } },
      {
        $lookup: {
          from: 'reactions',
          localField: '_id',
          foreignField: 'storyId',
          as: 'reactions'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'internalAuthorId',
          foreignField: 'internalId',
          as: 'author'
        }
      },
      // Rank by depth of engagement first (reactions), then modest like counts
      {
        $addFields: {
          reactionsCount: { $size: { $ifNull: ['$reactions', []] } }
        }
      },
      { $sort: { reactionsCount: -1, likes: 1, createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          preview: { $substrCP: [{ $ifNull: ['$text', ''] }, 0, 150] },
          authorUsername: { $arrayElemAt: ['$author.username', 0] },
          likes: { $max: [0, '$likes'] },
          reactions: '$reactionsCount',
          reads: { $max: [0, '$likes'] },
          continuations: 0,
          responses: '$reactionsCount',
          createdAt: 1
        }
      }
    ]);

    res.json({ success: true, stories, description: 'Stories with quiet depth and meaning' });
  } catch (error) {
    console.error('Quietly powerful leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// GET /leaderboards/growing-stories - Growing stories
router.get('/growing-stories', optionalAuth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    const stories = await Story.find({
      hidden: false,
      createdAt: { $gte: dateFilter }
    })
      .sort({ likes: -1 })
      .limit(limit)
      .lean();

    const enriched = await Promise.all(stories.map(async (s) => {
      const author = await User.findOne({ internalId: s.internalAuthorId });
      const daysSinceCreation = Math.ceil((new Date() - s.createdAt) / (1000 * 60 * 60 * 24));
      const likesPerDay = daysSinceCreation > 0 ? (s.likes / daysSinceCreation).toFixed(2) : s.likes;

      return {
        _id: s._id,
        title: s.title,
        preview: (s.text || '').substring(0, 150),
        authorUsername: author?.username,
        likes: s.likes,
        likesPerDay,
        daysSinceCreation,
        daysActive: daysSinceCreation,
        continuations: 0,
        responses: 0,
        createdAt: s.createdAt
      };
    }));

    res.json({ success: true, stories: enriched, period: `${days}d`, description: 'Stories gaining momentum' });
  } catch (error) {
    console.error('Growing stories leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
