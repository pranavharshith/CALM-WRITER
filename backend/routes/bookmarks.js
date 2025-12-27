const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const Story = require('../models/Story');
const User = require('../models/User');

// Middleware: Check session by internalId
function requireSession(req, res, next) {
  const userId = req.header('X-Internal-Id');
  if (!userId) return res.status(401).json({ error: 'Missing session' });
  req.internalId = userId;
  next();
}

// POST /bookmarks: Create a bookmark
router.post('/', requireSession, async (req, res) => {
  try {
    const { storyId } = req.body;
    
    if (!storyId) {
      return res.status(400).json({ error: 'Story ID required' });
    }

    // Check if story exists and is not hidden
    const story = await Story.findById(storyId);
    if (!story || story.hidden) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check if user is trying to bookmark their own story
    if (story.internalAuthorId === req.internalId) {
      return res.status(400).json({ error: 'Cannot bookmark your own story' });
    }

    // Check if already bookmarked
    const existing = await Bookmark.findOne({ 
      userInternalId: req.internalId, 
      storyId 
    });

    if (existing) {
      return res.json({ 
        success: true, 
        bookmarked: true,
        message: 'Already bookmarked' 
      });
    }

    // Create bookmark
    const bookmark = new Bookmark({
      userInternalId: req.internalId,
      storyId
    });
    await bookmark.save();

    res.json({ 
      success: true, 
      bookmarked: true 
    });
  } catch (error) {
    console.error('Bookmark error:', error);
    res.status(500).json({ error: 'Failed to bookmark story' });
  }
});

// DELETE /bookmarks/:storyId: Remove a bookmark
router.delete('/:storyId', requireSession, async (req, res) => {
  try {
    const { storyId } = req.params;

    const bookmark = await Bookmark.findOneAndDelete({
      userInternalId: req.internalId,
      storyId
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ 
      success: true, 
      bookmarked: false 
    });
  } catch (error) {
    console.error('Unbookmark error:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// GET /bookmarks: Get user's bookmarks with pagination
router.get('/', requireSession, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.q || '';

    // Build query
    let findQuery = { userInternalId: req.internalId };

    // If search query provided, find matching stories first
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      
      // Find matching users (for author search)
      const matchingUsers = await User.find({
        username: { $regex: searchTerm, $options: 'i' }
      }).select('internalId');
      const matchingUserIds = matchingUsers.map(u => u.internalId);

      // Find matching stories
      const matchingStories = await Story.find({
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          ...(matchingUserIds.length > 0 ? [{ internalAuthorId: { $in: matchingUserIds } }] : [])
        ],
        hidden: false
      }).select('_id');
      const matchingStoryIds = matchingStories.map(s => s._id);

      if (matchingStoryIds.length > 0) {
        findQuery.storyId = { $in: matchingStoryIds };
      } else {
        // No matches, return empty
        return res.json({
          bookmarks: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
          }
        });
      }
    }

    // Get bookmarks sorted by most recently bookmarked
    const bookmarks = await Bookmark.find(findQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('storyId')
      .lean();

    // Filter out hidden stories and enrich with author info
    const enrichedBookmarks = [];
    for (const bookmark of bookmarks) {
      if (!bookmark.storyId || bookmark.storyId.hidden) continue;

      const author = await User.findOne({ 
        internalId: bookmark.storyId.internalAuthorId 
      });

      const likedBy = bookmark.storyId.likedBy || [];
      const isLikedByUser = likedBy.includes(req.internalId);

      enrichedBookmarks.push({
        _id: bookmark._id,
        story: {
          ...bookmark.storyId,
          authorUsername: author?.username || 'Anonymous',
          preview: bookmark.storyId.text.substring(0, 200) + 
                   (bookmark.storyId.text.length > 200 ? '...' : ''),
          isLikedByUser,
          likes: bookmark.storyId.likes || 0,
          likedBy
        },
        bookmarkedAt: bookmark.createdAt
      });
    }

    const totalBookmarks = await Bookmark.countDocuments(findQuery);

    res.json({
      bookmarks: enrichedBookmarks,
      pagination: {
        page,
        limit,
        total: totalBookmarks,
        pages: Math.ceil(totalBookmarks / limit),
        hasNext: skip + limit < totalBookmarks,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// GET /bookmarks/check/:storyId: Check if story is bookmarked
router.get('/check/:storyId', requireSession, async (req, res) => {
  try {
    const { storyId } = req.params;

    const bookmark = await Bookmark.findOne({
      userInternalId: req.internalId,
      storyId
    });

    res.json({ 
      bookmarked: !!bookmark 
    });
  } catch (error) {
    console.error('Check bookmark error:', error);
    res.status(500).json({ error: 'Failed to check bookmark' });
  }
});

// GET /bookmarks/count: Get total bookmark count for user
router.get('/count', requireSession, async (req, res) => {
  try {
    const count = await Bookmark.countDocuments({ 
      userInternalId: req.internalId 
    });

    res.json({ count });
  } catch (error) {
    console.error('Bookmark count error:', error);
    res.status(500).json({ error: 'Failed to get bookmark count' });
  }
});

// POST /bookmarks/like: Like or unlike a story from bookmarks
router.post('/like', requireSession, async (req, res) => {
  try {
    const { storyId } = req.body;
    if (!storyId) {
      return res.status(400).json({ error: 'Story ID required' });
    }

    // Check if story exists and is not hidden
    const story = await Story.findById(storyId);
    if (!story || story.hidden) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Optional guard: ensure the user actually bookmarked this story
    const bookmark = await Bookmark.findOne({
      userInternalId: req.internalId,
      storyId
    });
    if (!bookmark) {
      return res.status(400).json({ error: 'You can only like stories from your bookmarks' });
    }

    const likedBy = story.likedBy || [];
    const alreadyLiked = likedBy.includes(req.internalId);

    if (alreadyLiked) {
      story.likedBy = likedBy.filter(id => id !== req.internalId);
      story.likes = Math.max(0, (story.likes || 0) - 1);
    } else {
      story.likedBy = [...likedBy, req.internalId];
      story.likes = (story.likes || 0) + 1;
    }

    await story.save();

    res.json({
      success: true,
      liked: !alreadyLiked,
      likes: story.likes || 0
    });
  } catch (error) {
    console.error('Bookmark like error:', error);
    res.status(500).json({ error: 'Failed to like story from bookmarks' });
  }
});

module.exports = router;
