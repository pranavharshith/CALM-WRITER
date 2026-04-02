const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const Story = require('../models/Story');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

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

// DELETE /bookmarks/:storyId - Delete bookmark
router.delete('/:storyId', requireAuth, async (req, res) => {
  try {
    const result = await Bookmark.deleteOne({
      userInternalId: req.internalId,
      storyId: req.params.storyId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
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
      isBookmarked: !!bookmark
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
      const storyIds = await Story.find({
        $text: { $search: searchQuery }
      }).select('_id');

      query.storyId = { $in: storyIds };
    }

    const total = await Bookmark.countDocuments(query);
    const bookmarks = await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enriched = await Promise.all(bookmarks.map(async (bm) => {
      const story = await Story.findById(bm.storyId).lean();
      if (!story) return null;

      const author = await User.findOne({ internalId: story.internalAuthorId });

      return {
        _id: bm._id,
        story: {
          _id: story._id,
          title: story.title,
          text: story.text,
          preview: story.text.substring(0, 200) + (story.text.length > 200 ? '...' : ''),
          wordCount: story.wordCount,
          likes: story.likes,
          likedBy: story.likedBy,
          authorUsername: author?.username || 'Anonymous',
          authorProfilePicture: author?.profilePicture?.url || null,
          isLikedByUser: (story.likedBy || []).includes(req.internalId),
          createdAt: story.createdAt,
          coverImage: story.coverImage,
          showCoverImage: story.showCoverImage
        },
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

// GET /bookmarks/count - Get bookmark count
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

module.exports = router;
