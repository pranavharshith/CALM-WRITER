const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Bookmark = require('../../models/Bookmark');
const BookmarkShelf = require('../../models/BookmarkShelf');
const Story = require('../../models/Story');
const User = require('../../models/User');
const { requireAuth } = require('../../middleware/auth');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { cardFromStory } = require('../../utils/storyCards');

// Named shelves — must mount before /:storyId
router.use('/shelves', require('./shelves'));

// POST /bookmarks - Create bookmark
router.post('/', requireAuth, async (req, res) => {
  try {
    const { storyId } = req.body;
    if (!storyId) {
      return res.status(400).json({ success: false, error: 'Story ID required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    // Check if already bookmarked
    const existing = await Bookmark.findOne({
      userInternalId: req.internalId,
      storyId
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Already bookmarked' });
    }

    const bookmark = new Bookmark({
      userInternalId: req.internalId,
      storyId
    });

    await bookmark.save();

    res.json({
      success: true,
      message: 'Story bookmarked',
      bookmark: {
        _id: bookmark._id,
        storyId: bookmark.storyId,
        createdAt: bookmark.createdAt
      }
    });
  } catch (error) {
    console.error('Bookmark creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to bookmark story' });
  }
});

// GET /bookmarks/count - Get bookmark count (before /:storyId)
router.get('/count', requireAuth, async (req, res) => {
  try {
    const count = await Bookmark.countDocuments({ userInternalId: req.internalId });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Bookmark count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get bookmark count' });
  }
});

// DELETE /bookmarks/:storyId - Delete bookmark (also lifts it off every shelf)
router.delete('/:storyId', requireAuth, async (req, res) => {
  try {
    const result = await Bookmark.deleteOne({
      userInternalId: req.internalId,
      storyId: req.params.storyId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }

    if (mongoose.isValidObjectId(req.params.storyId)) {
      const oid = new mongoose.Types.ObjectId(req.params.storyId);
      await BookmarkShelf.updateMany(
        { ownerInternalId: req.internalId },
        { $pull: { storyIds: oid } }
      );
      await BookmarkShelf.updateMany(
        { ownerInternalId: req.internalId, coverStoryId: oid },
        { $set: { coverStoryId: null } }
      );
    }

    res.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    console.error('Bookmark deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove bookmark' });
  }
});

// GET /bookmarks/check/:storyId - Check if bookmarked
router.get('/check/:storyId', requireAuth, async (req, res) => {
  try {
    const bookmark = await Bookmark.findOne({
      userInternalId: req.internalId,
      storyId: req.params.storyId
    });

    res.json({
      success: true,
      isBookmarked: !!bookmark,
      bookmarked: !!bookmark
    });
  } catch (error) {
    console.error('Bookmark check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check bookmark' });
  }
});

// GET /bookmarks - Fetch user's bookmarks
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const searchQuery = req.query.q || '';

    let query = { userInternalId: req.internalId };

    if (searchQuery) {
      const { escapeRegex } = require('../../utils/tags');
      const raw = String(searchQuery).trim();
      const ids = new Set();

      try {
        const textHits = await Story.find({ $text: { $search: raw } }).select('_id').lean();
        textHits.forEach((s) => ids.add(String(s._id)));
      } catch (err) {
        const titleHits = await Story.find({
          title: { $regex: escapeRegex(raw), $options: 'i' }
        }).select('_id').lean();
        titleHits.forEach((s) => ids.add(String(s._id)));
      }

      const authors = await User.find({
        $or: [
          { username: { $regex: escapeRegex(raw), $options: 'i' } },
          { displayName: { $regex: escapeRegex(raw), $options: 'i' } }
        ]
      }).select('internalId').lean();

      if (authors.length > 0) {
        const authorHits = await Story.find({
          internalAuthorId: { $in: authors.map((a) => a.internalId) }
        }).select('_id').lean();
        authorHits.forEach((s) => ids.add(String(s._id)));
      }

      query.storyId = { $in: [...ids] };
    }

    const total = await Bookmark.countDocuments(query);
    const bookmarks = await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enriched = await Promise.all(bookmarks.map(async (bm) => {
      const story = await Story.findById(bm.storyId).lean();
      if (!story || story.deletedAt || story.hidden) return null;

      const author = await User.findOne({ internalId: story.internalAuthorId });

      return {
        _id: bm._id,
        story: cardFromStory(story, author, req.internalId),
        bookmarkedAt: bm.createdAt
      };
    }));

    // Filter out nulls (deleted stories)
    const filtered = enriched.filter(e => e !== null);

    res.json({
      success: true,
      bookmarks: filtered,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Bookmarks fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bookmarks' });
  }
});

module.exports = router;
