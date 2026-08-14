const {
  express, mongoose, Story,
  requireAuth, optionalAuth,
  getPaginationParams, getPaginationMeta,
  publicLimiter,
} = require('./_shared');
const { getActiveStoriesFilter } = require('../../utils/storyQueryHelper');
const { enrichStories } = require('../../utils/storyCards');
const {
  normalizeTag,
  isValidTag,
  parseTags,
  escapeRegex,
  canEditStoryTags
} = require('../../utils/tags');

const router = express.Router();

const TRENDING_DAYS = 30;
const TRENDING_LIMIT = 16;

async function tagCounts({ since = null, prefix = '', limit = 20 } = {}) {
  const match = {
    ...getActiveStoriesFilter(),
    tags: { $exists: true, $ne: [] }
  };
  if (since) match.createdAt = { $gte: since };
  if (prefix) {
    match.tags = { $elemMatch: { $regex: `^${escapeRegex(prefix)}`, $options: 'i' } };
  }

  const pipeline = [
    { $match: match },
    { $unwind: '$tags' },
  ];
  if (prefix) {
    pipeline.push({ $match: { tags: { $regex: `^${escapeRegex(prefix)}`, $options: 'i' } } });
  }
  pipeline.push(
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
    { $project: { _id: 0, tag: '$_id', count: 1 } }
  );

  return Story.aggregate(pipeline);
}

// GET /stories/tags/trending
router.get('/tags/trending', publicLimiter, optionalAuth, async (req, res) => {
  try {
    const since = new Date(Date.now() - TRENDING_DAYS * 24 * 60 * 60 * 1000);
    const tags = await tagCounts({ since, limit: TRENDING_LIMIT });
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Trending tags error:', error);
    res.status(500).json({ success: false, error: 'Failed to load trending tags' });
  }
});

// GET /stories/tags?q=
router.get('/tags', publicLimiter, optionalAuth, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? normalizeTag(req.query.q) : '';
    const tags = await tagCounts({
      prefix: q,
      limit: q ? 20 : TRENDING_LIMIT
    });
    res.json({ success: true, query: q, tags });
  } catch (error) {
    console.error('Tag search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search tags' });
  }
});

// GET /stories/tags/:tag
router.get('/tags/:tag', publicLimiter, optionalAuth, async (req, res) => {
  try {
    const tag = normalizeTag(req.params.tag);
    if (!isValidTag(tag)) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }

    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { ...getActiveStoriesFilter(), tags: tag };
    const [total, found] = await Promise.all([
      Story.countDocuments(filter),
      Story.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    const stories = await enrichStories(found, req.internalId);
    res.json({
      success: true,
      tag,
      stories,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Tag stories error:', error);
    res.status(500).json({ success: false, error: 'Failed to load tagged stories' });
  }
});

// PATCH /stories/:storyId/tags
router.patch('/:storyId/tags', requireAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const story = await Story.findById(storyId);
    if (!story || story.hidden || story.deletedAt) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const actor = req.authenticatedUser;
    if (!canEditStoryTags(actor, story)) {
      return res.status(403).json({
        success: false,
        error: 'Tags can be set when you publish, or in the first five minutes.'
      });
    }

    const tags = parseTags(req.body?.tags);
    story.tags = tags;
    await story.save();

    res.json({ success: true, tags: story.tags });
  } catch (error) {
    console.error('Story tags update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update tags' });
  }
});

module.exports = router;
