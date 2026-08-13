const {
  express, mongoose, Story, User, Like, Follow, ReadSession,
  requireAuth, optionalAuth, checkAndUpdateStoryPublishCooldown,
  sanitizeStoryMiddleware, getPaginationParams, getPaginationMeta,
  logAuthEvent, publicLimiter,
} = require('./_shared');
const { getActiveStoriesFilter } = require('../../utils/storyQueryHelper');

const router = express.Router();

const PREVIEW_EXPR = { $substrCP: [{ $ifNull: ['$text', ''] }, 0, 200] };

function snippetOf(text, n = 200) {
  const src = typeof text === 'string' ? text : '';
  return src.length > n ? `${src.slice(0, n)}...` : src;
}

function storyCardFields(s, internalId) {
  const snippet = snippetOf(s.text, 200);
  return {
    _id: s._id,
    title: s.title,
    text: snippet,
    preview: snippet,
    wordCount: s.wordCount,
    likes: s.likes,
    authorUsername: s.authorUsername || 'Anonymous',
    authorDisplayName: s.authorDisplayName || 'Anonymous',
    authorProfilePicture: s.authorProfilePicture,
    coverImage: s.coverImage || null,
    showCoverImage: s.showCoverImage !== false,
    createdAt: s.createdAt,
    isLikedByUser: internalId ? !!(s.likedBy && s.likedBy.includes(internalId)) : false,
  };
}

const FEED_PROJECT = {
  _id: 1,
  title: 1,
  text: PREVIEW_EXPR,
  wordCount: 1,
  likes: 1,
  likedBy: 1,
  createdAt: 1,
  coverImage: 1,
  showCoverImage: 1,
  authorUsername: { $arrayElemAt: ['$author.username', 0] },
  authorDisplayName: { $arrayElemAt: ['$author.displayName', 0] },
  authorProfilePicture: { $arrayElemAt: ['$author.profilePicture.url', 0] },
};

// GET /stories/random - Fetch random story
router.get('/random', publicLimiter, optionalAuth, async (req, res) => {
  try {
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
        preview: snippetOf(storyData.text),
        wordCount: storyData.wordCount,
        likes: storyData.likes,
        authorUsername: author?.username || 'Anonymous',
        authorDisplayName: author?.displayName || 'Anonymous',
        authorProfilePicture: author?.profilePicture?.url,
        coverImage: storyData.coverImage || null,
        showCoverImage: storyData.showCoverImage !== false,
        createdAt: storyData.createdAt,
        isLikedByUser: req.internalId ? storyData.likedBy?.includes(req.internalId) : false
      }
    });
  } catch (error) {
    console.error('Random story error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch story' });
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
    const followingMatch = {
      ...getActiveStoriesFilter(),
      internalAuthorId: { $in: followingIds },
    };

    const total = await Story.countDocuments(followingMatch);

    // Use aggregation to avoid N+1 query
    const stories = await Story.aggregate([
      { $match: followingMatch },
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
      { $project: FEED_PROJECT }
    ]);

    const enriched = stories.map(s => storyCardFields(s, req.internalId));

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

// GET /stories/for-you - Personalized feed (follows > read-history interest > fresh)
router.get('/for-you', requireAuth, async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;

    // 1. Authors the user follows
    const follows = await Follow.find({ followerInternalId: req.internalId });
    const followingIds = follows.map(f => f.followingInternalId);

    // 2. Story ids the user has read (for interest-based ranking)
    const readSessions = await ReadSession.find({ userInternalId: req.internalId })
      .sort({ percentRead: -1 })
      .select('storyId')
      .lean();
    const readStoryIds = readSessions.map(r => r.storyId.toString());
    const readStoryIdSet = new Set(readStoryIds);

    const now = new Date();
    const recency = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const baseFilter = getActiveStoriesFilter();
    let storyQuery = baseFilter;

    // If the user follows nobody and has read nothing, prefer recent + popular
    let sortOption;
    if (followingIds.length === 0 && readStoryIdSet.size === 0) {
      sortOption = { likes: -1, createdAt: -1 };
    } else {
      storyQuery = {
        $and: [
          baseFilter,
          {
            $or: [
              { internalAuthorId: { $in: followingIds } },
              { createdAt: { $gte: recency } }
            ]
          }
        ]
      };
      sortOption = { createdAt: -1 };
    }

    const stories = await Story.aggregate([
      { $match: storyQuery },
      { $sort: sortOption },
      { $skip: parseInt(skip) || 0 },
      { $limit: parseInt(limit) || 10 },
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
          ...FEED_PROJECT,
          internalAuthorId: 1,
        }
      }
    ]);

    // Sort by engagement signal: followed-author first, then read-interest, then recency
    const scored = stories.map(s => {
      const isFollowed = followingIds.includes(s.internalAuthorId);
      const isRead = readStoryIdSet.has(s._id.toString());
      return { ...s, score: (isFollowed ? 2 : 0) + (isRead ? 1 : 0) };
    });
    scored.sort((a, b) => b.score - a.score);

    const enriched = scored.map(s => storyCardFields(s, req.internalId));

    // 3. Writer suggestions for the empty-following state (onboarding)
    let suggestions = [];
    if (followingIds.length < 3) {
      const suggestionCandidates = await User.aggregate([
        { $match: { internalId: { $nin: [...followingIds, req.internalId] }, username: { $exists: true } } },
        { $sample: { size: 5 } },
        { $project: { username: 1, displayName: 1, profilePicture: 1 } }
      ]);
      suggestions = suggestionCandidates.map(u => ({
        username: u.username,
        displayName: u.displayName,
        profilePicture: u.profilePicture?.url || null
      }));
    }

    const limitNum = parseInt(limit) || 10;
    const skipNum = parseInt(skip) || 0;
    const pageNum = Math.floor(skipNum / limitNum) + 1;
    const total = await Story.countDocuments(storyQuery);

    res.json({
      success: true,
      stories: enriched,
      suggestions,
      pagination: getPaginationMeta(total, pageNum, limitNum),
    });
  } catch (error) {
    console.error('For-you feed error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personalized feed' });
  }
});

// GET /stories/feed - Fetch community feed
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const sort = req.query.sort || 'latest'; // latest, popular, most-liked, trending, following

    let sortOption = { createdAt: -1 };
    if (sort === 'trending') {
      sortOption = { likes: -1, createdAt: -1 };
    } else if (sort === 'popular' || sort === 'most-liked') {
      sortOption = { likes: -1, createdAt: -1 };
    }

    const feedMatch = getActiveStoriesFilter();
    const total = await Story.countDocuments(feedMatch);

    // Use aggregation to avoid N+1 query
    const stories = await Story.aggregate([
      { $match: feedMatch },
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
      { $project: FEED_PROJECT }
    ]);

    const enriched = stories.map(s => storyCardFields(s, req.internalId));

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
    const story = await Story.findOne({ ...getActiveStoriesFilter(), isFeatured: true });
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
        preview: snippetOf(story.text),
        wordCount: story.wordCount,
        likes: story.likes,
        authorUsername: author?.username || 'Anonymous',
        authorDisplayName: author?.displayName || 'Anonymous',
        authorProfilePicture: author?.profilePicture?.url,
        coverImage: story.coverImage || null,
        showCoverImage: story.showCoverImage !== false,
        createdAt: story.createdAt,
        isLikedByUser: req.internalId ? story.likedBy?.includes(req.internalId) : false
      }
    });
  } catch (error) {
    console.error('Featured story error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch featured story' });
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
    const { q, minLikes, maxLikes, minWords, maxWords, dateFrom, dateTo } = req.query;
    const hasQuery = typeof q === 'string' && q.trim().length > 0;
    const hasFilters = [minLikes, maxLikes, minWords, maxWords, dateFrom, dateTo]
      .some((v) => v !== undefined && v !== '');
    if (!hasQuery && !hasFilters) {
      return res.status(400).json({ success: false, error: 'Search query or filters required' });
    }

    const { skip, limit, page } = getPaginationParams(req.query);
    const filter = { ...getActiveStoriesFilter() };

    if (minLikes) filter.likes = { ...(filter.likes || {}), $gte: parseInt(minLikes, 10) || 0 };
    if (maxLikes) filter.likes = { ...(filter.likes || {}), $lte: parseInt(maxLikes, 10) || 0 };
    if (minWords) filter.wordCount = { ...(filter.wordCount || {}), $gte: parseInt(minWords, 10) || 0 };
    if (maxWords) filter.wordCount = { ...(filter.wordCount || {}), $lte: parseInt(maxWords, 10) || 0 };
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) filter.createdAt = { ...(filter.createdAt || {}), $gte: from };
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        filter.createdAt = { ...(filter.createdAt || {}), $lte: to };
      }
    }
    if (hasQuery) filter.$text = { $search: q.trim() };

    let query = Story.find(filter);
    query = hasQuery
      ? query.sort({ score: { $meta: 'textScore' } })
      : query.sort({ createdAt: -1 });

    const [total, stories] = await Promise.all([
      Story.countDocuments(filter),
      query.skip(skip).limit(limit).lean(),
    ]);

    const enriched = await Promise.all(stories.map(async (s) => {
      const author = await User.findOne({ internalId: s.internalAuthorId });
      return storyCardFields({
        ...s,
        authorUsername: author?.username,
        authorDisplayName: author?.displayName,
        authorProfilePicture: author?.profilePicture?.url,
      }, req.internalId);
    }));

    res.json({
      success: true,
      stories: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search stories' });
  }
});


module.exports = router;
