const {
  express, mongoose, Story, User, Like, Follow, ReadSession,
  requireAuth, optionalAuth, checkAndUpdateStoryPublishCooldown,
  sanitizeStoryMiddleware, getPaginationParams, getPaginationMeta,
  logAuthEvent, publicLimiter,
} = require('./_shared');

const router = express.Router();

// GET /stories/:storyId - Fetch specific story
router.get('/:storyId', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.storyId)) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const story = await Story.findById(req.params.storyId);
    if (!story || story.hidden || story.deletedAt) {
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
        coverImage: story.coverImage || null,
        showCoverImage: story.showCoverImage !== false,
        internalAuthorId: story.internalAuthorId,
        createdAt: story.createdAt,
        isLikedByUser: req.internalId && story.likedBy ? story.likedBy.includes(req.internalId) : false,
        threadLocked: story.threadLocked || false,
        tags: Array.isArray(story.tags) ? story.tags : [],
        publishedAt: story.publishedAt || story.createdAt
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
    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(404).json({ success: false, error: 'Story not found' });
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

    // Notify the author of a new like
    if (story.internalAuthorId && story.internalAuthorId !== req.internalId) {
      const { createNotification } = require('../../utils/notificationHelper');
      createNotification({
        userInternalId: story.internalAuthorId,
        type: 'like',
        fromUserId: req.internalId,
        fromUsername: req.user?.username,
        storyId,
        storyTitle: story.title,
        message: `@${req.user?.username || 'Someone'} liked your story${story.title ? ` "${story.title}"` : ''}.`
      });
    }

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

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

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

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

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

module.exports = router;


module.exports = router;
