const express = require('express');
const router = express.Router();
const BookmarkShelf = require('../../models/BookmarkShelf');
const Story = require('../../models/Story');
const User = require('../../models/User');
const { optionalAuth } = require('../../middleware/auth');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { enrichStories } = require('../../utils/storyCards');
const { serializeShelf, activeStoriesInOrder } = require('../../utils/shelves');

async function findOwner(username) {
  if (!username) return null;
  return User.findOne({ username: String(username).toLowerCase() })
    .select('internalId username displayName')
    .lean();
}

// GET /shelves/:username — public shelves for a reader
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const owner = await findOwner(req.params.username);
    if (!owner) {
      return res.status(404).json({ success: false, error: 'Reader not found' });
    }

    const shelves = await BookmarkShelf.find({
      ownerInternalId: owner.internalId,
      visibility: 'public'
    }).sort({ updatedAt: -1 }).lean();

    const coverIds = shelves
      .map((s) => s.coverStoryId || (s.storyIds && s.storyIds[0]))
      .filter(Boolean);
    const covers = coverIds.length
      ? await Story.find({ _id: { $in: coverIds } }).select('coverImage showCoverImage').lean()
      : [];
    const coverMap = new Map(covers.map((c) => [String(c._id), c]));

    res.json({
      success: true,
      owner: { username: owner.username, displayName: owner.displayName || owner.username },
      shelves: shelves.map((s) => {
        const cid = s.coverStoryId || (s.storyIds && s.storyIds[0]);
        return serializeShelf(s, cid ? coverMap.get(String(cid)) : null, owner.username);
      })
    });
  } catch (error) {
    console.error('Public shelves list error:', error);
    res.status(500).json({ success: false, error: 'Failed to load shelves' });
  }
});

// GET /shelves/:username/:slug — one public shelf
router.get('/:username/:slug', optionalAuth, async (req, res) => {
  try {
    const owner = await findOwner(req.params.username);
    if (!owner) {
      return res.status(404).json({ success: false, error: 'Shelf not found' });
    }

    const slug = String(req.params.slug || '').toLowerCase();
    const shelf = await BookmarkShelf.findOne({
      ownerInternalId: owner.internalId,
      slug
    }).lean();

    if (!shelf) {
      return res.status(404).json({ success: false, error: 'Shelf not found' });
    }

    const isOwner = req.internalId && req.internalId === owner.internalId;
    if (shelf.visibility !== 'public' && !isOwner) {
      return res.status(404).json({ success: false, error: 'Shelf not found' });
    }

    const { page, limit, skip } = getPaginationParams(req.query);
    const active = await activeStoriesInOrder(shelf.storyIds);
    const total = active.length;
    const pageDocs = active.slice(skip, skip + limit);
    const stories = pageDocs.length ? await enrichStories(pageDocs, req.internalId) : [];

    const coverId = shelf.coverStoryId || (shelf.storyIds && shelf.storyIds[0]);
    const cover = coverId
      ? await Story.findById(coverId).select('coverImage showCoverImage').lean()
      : null;

    res.json({
      success: true,
      owner: { username: owner.username, displayName: owner.displayName || owner.username },
      shelf: serializeShelf(shelf, cover, owner.username),
      stories,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Public shelf fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load this shelf' });
  }
});

module.exports = router;
