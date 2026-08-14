const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Bookmark = require('../../models/Bookmark');
const BookmarkShelf = require('../../models/BookmarkShelf');
const Story = require('../../models/Story');
const User = require('../../models/User');
const { requireAuth } = require('../../middleware/auth');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { getActiveStoriesFilter } = require('../../utils/storyQueryHelper');
const { enrichStories } = require('../../utils/storyCards');
const {
  MAX_SHELVES,
  MAX_STORIES,
  uniqueSlug,
  parseName,
  parseDescription,
  parseVisibility,
  serializeShelf,
  activeStoriesInOrder
} = require('../../utils/shelves');

async function loadOwnerUsername(internalId) {
  const user = await User.findOne({ internalId }).select('username').lean();
  return user?.username || null;
}

async function coverMapFor(shelves) {
  const ids = shelves
    .map((s) => s.coverStoryId || (s.storyIds && s.storyIds[0]))
    .filter(Boolean);
  if (ids.length === 0) return new Map();
  const covers = await Story.find({ _id: { $in: ids } })
    .select('coverImage showCoverImage title')
    .lean();
  return new Map(covers.map((c) => [String(c._id), c]));
}

async function findOwnShelf(req, res) {
  const { shelfId } = req.params;
  if (!mongoose.isValidObjectId(shelfId)) {
    res.status(404).json({ success: false, error: 'Shelf not found' });
    return null;
  }
  const shelf = await BookmarkShelf.findOne({
    _id: shelfId,
    ownerInternalId: req.internalId
  });
  if (!shelf) {
    res.status(404).json({ success: false, error: 'Shelf not found' });
    return null;
  }
  return shelf;
}

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

// GET /bookmarks/shelves
router.get('/', requireAuth, async (req, res) => {
  try {
    const shelves = await BookmarkShelf.find({ ownerInternalId: req.internalId })
      .sort({ updatedAt: -1 })
      .lean();
    const [covers, username] = await Promise.all([
      coverMapFor(shelves),
      loadOwnerUsername(req.internalId)
    ]);
    res.json({
      success: true,
      username,
      shelves: shelves.map((s) => {
        const cid = s.coverStoryId || (s.storyIds && s.storyIds[0]);
        return serializeShelf(s, cid ? covers.get(String(cid)) : null, username);
      })
    });
  } catch (error) {
    console.error('Shelves list error:', error);
    res.status(500).json({ success: false, error: 'Failed to load shelves' });
  }
});

// POST /bookmarks/shelves
router.post('/', requireAuth, async (req, res) => {
  try {
    const named = parseName(req.body?.name);
    if (named.error) return res.status(400).json({ success: false, error: named.error });
    const desc = parseDescription(req.body?.description);
    if (desc.error) return res.status(400).json({ success: false, error: desc.error });
    const vis = parseVisibility(req.body?.visibility);
    if (vis.error) return res.status(400).json({ success: false, error: vis.error });

    const count = await BookmarkShelf.countDocuments({ ownerInternalId: req.internalId });
    if (count >= MAX_SHELVES) {
      return res.status(400).json({ success: false, error: `You can keep up to ${MAX_SHELVES} shelves.` });
    }

    const slug = await uniqueSlug(req.internalId, named.name);
    const shelf = await BookmarkShelf.create({
      ownerInternalId: req.internalId,
      name: named.name,
      slug,
      description: desc.description,
      visibility: vis.visibility,
      storyIds: [],
      coverStoryId: null
    });

    const username = await loadOwnerUsername(req.internalId);
    res.json({ success: true, shelf: serializeShelf(shelf, null, username) });
  } catch (error) {
    console.error('Shelf create error:', error);
    res.status(500).json({ success: false, error: 'Failed to make this shelf' });
  }
});

// GET /bookmarks/shelves/:shelfId
router.get('/:shelfId', requireAuth, async (req, res) => {
  try {
    const shelf = await findOwnShelf(req, res);
    if (!shelf) return;

    const { page, limit, skip } = getPaginationParams(req.query);
    const active = await activeStoriesInOrder(shelf.storyIds);
    const total = active.length;
    const pageDocs = active.slice(skip, skip + limit);
    const stories = pageDocs.length ? await enrichStories(pageDocs, req.internalId) : [];

    const username = await loadOwnerUsername(req.internalId);
    const covers = await coverMapFor([shelf]);
    const cid = shelf.coverStoryId || (shelf.storyIds && shelf.storyIds[0]);

    res.json({
      success: true,
      shelf: serializeShelf(shelf, cid ? covers.get(String(cid)) : null, username),
      stories,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Shelf fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load this shelf' });
  }
});

// PATCH /bookmarks/shelves/:shelfId
router.patch('/:shelfId', requireAuth, async (req, res) => {
  try {
    const shelf = await findOwnShelf(req, res);
    if (!shelf) return;

    if (req.body?.name != null) {
      const named = parseName(req.body.name);
      if (named.error) return res.status(400).json({ success: false, error: named.error });
      shelf.name = named.name;
    }
    if (req.body?.description != null) {
      const desc = parseDescription(req.body.description);
      if (desc.error) return res.status(400).json({ success: false, error: desc.error });
      shelf.description = desc.description;
    }
    if (req.body?.visibility != null) {
      const vis = parseVisibility(req.body.visibility);
      if (vis.error) return res.status(400).json({ success: false, error: vis.error });
      shelf.visibility = vis.visibility;
    }

    await shelf.save();
    const username = await loadOwnerUsername(req.internalId);
    const covers = await coverMapFor([shelf]);
    const cid = shelf.coverStoryId || (shelf.storyIds && shelf.storyIds[0]);
    res.json({
      success: true,
      shelf: serializeShelf(shelf, cid ? covers.get(String(cid)) : null, username)
    });
  } catch (error) {
    console.error('Shelf update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update this shelf' });
  }
});

// DELETE /bookmarks/shelves/:shelfId
router.delete('/:shelfId', requireAuth, async (req, res) => {
  try {
    const shelf = await findOwnShelf(req, res);
    if (!shelf) return;
    await BookmarkShelf.deleteOne({ _id: shelf._id, ownerInternalId: req.internalId });
    res.json({ success: true, message: 'Shelf removed' });
  } catch (error) {
    console.error('Shelf delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove this shelf' });
  }
});

// POST /bookmarks/shelves/:shelfId/stories
router.post('/:shelfId/stories', requireAuth, async (req, res) => {
  try {
    const shelf = await findOwnShelf(req, res);
    if (!shelf) return;

    const storyId = req.body?.storyId;
    if (!storyId || !mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, error: 'Story ID required' });
    }

    const oid = toObjectId(storyId);
    const story = await Story.findOne({ _id: oid, ...getActiveStoriesFilter() }).select('_id').lean();
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const already = (shelf.storyIds || []).some((id) => String(id) === String(oid));
    if (!already) {
      if ((shelf.storyIds || []).length >= MAX_STORIES) {
        return res.status(400).json({
          success: false,
          error: `A shelf can hold ${MAX_STORIES} stories.`
        });
      }
      shelf.storyIds.push(oid);
      if (!shelf.coverStoryId) shelf.coverStoryId = oid;
      await shelf.save();
    }

    await Bookmark.updateOne(
      { userInternalId: req.internalId, storyId: oid },
      { $setOnInsert: { userInternalId: req.internalId, storyId: oid, createdAt: new Date() } },
      { upsert: true }
    );

    res.json({
      success: true,
      storyId,
      storyCount: shelf.storyIds.length
    });
  } catch (error) {
    console.error('Shelf add error:', error);
    res.status(500).json({ success: false, error: 'Failed to add this story' });
  }
});

// DELETE /bookmarks/shelves/:shelfId/stories/:storyId
router.delete('/:shelfId/stories/:storyId', requireAuth, async (req, res) => {
  try {
    const shelf = await findOwnShelf(req, res);
    if (!shelf) return;

    const { storyId } = req.params;
    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, error: 'Story ID required' });
    }

    const before = shelf.storyIds.length;
    shelf.storyIds = shelf.storyIds.filter((id) => String(id) !== String(storyId));
    if (shelf.coverStoryId && String(shelf.coverStoryId) === String(storyId)) {
      shelf.coverStoryId = shelf.storyIds[0] || null;
    }
    if (shelf.storyIds.length !== before) await shelf.save();

    res.json({
      success: true,
      storyId,
      storyCount: shelf.storyIds.length
    });
  } catch (error) {
    console.error('Shelf remove error:', error);
    res.status(500).json({ success: false, error: 'Failed to take this story off the shelf' });
  }
});

module.exports = router;
