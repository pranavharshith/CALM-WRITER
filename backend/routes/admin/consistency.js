const {
  express, Report, Story, StoryNode, User, Bookmark, Like, ModeratorApplication,
  requireAdmin, requireAuth, reportLimiter, logAdminAction, adminLimiter,
} = require('./_shared');

const router = express.Router();
router.use(requireAuth);

// GET /admin/check-like-consistency - Check and report data consistency issues
router.get('/check-like-consistency', requireAdmin, async (req, res) => {
  try {
    console.log('Starting like data consistency check...');

    // Find stories where likedBy array length doesn't match likes count
    const inconsistencies = await Story.find({
      $expr: { $ne: [{ $size: '$likedBy' }, '$likes'] }
    }).select('_id title likes likedBy').limit(100);

    // Find Like records that don't have corresponding Story.likedBy entries
    const Like = require('../../models/Like');
    const allLikes = await Like.find({}).lean();
    const orphanedLikes = [];

    for (const like of allLikes) {
      const story = await Story.findById(like.storyId).select('likedBy');
      if (!story || !story.likedBy?.includes(like.userInternalId)) {
        orphanedLikes.push({
          likeId: like._id,
          storyId: like.storyId,
          userInternalId: like.userInternalId
        });
      }
    }

    res.json({
      success: true,
      summary: {
        totalStories: await Story.countDocuments(),
        totalLikes: allLikes.length,
        inconsistentStories: inconsistencies.length,
        orphanedLikes: orphanedLikes.length
      },
      inconsistencies: inconsistencies.map(s => ({
        storyId: s._id,
        title: s.title,
        likedByCount: s.likedBy?.length || 0,
        likesCount: s.likes
      })),
      orphanedLikes: orphanedLikes.slice(0, 20) // Show first 20
    });
  } catch (error) {
    console.error('Consistency check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check consistency' });
  }
});

// POST /admin/fix-like-consistency - Attempt to fix data consistency issues
router.post('/fix-like-consistency', requireAdmin, async (req, res) => {
  try {
    console.log('Starting like data consistency fix...');

    const Like = require('../../models/Like');
    let fixed = 0;

    // Fix stories with inconsistent like counts
    const inconsistencies = await Story.find({
      $expr: { $ne: [{ $size: '$likedBy' }, '$likes'] }
    });

    for (const story of inconsistencies) {
      const correctCount = story.likedBy?.length || 0;
      if (story.likes !== correctCount) {
        await Story.findByIdAndUpdate(story._id, {
          likes: correctCount
        });
        fixed++;
      }
    }

    // Fix orphaned likes (Like records without Story.likedBy entry)
    const allLikes = await Like.find({}).lean();
    let orphanedFixed = 0;

    for (const like of allLikes) {
      const story = await Story.findById(like.storyId);
      if (!story) {
        // Story deleted, remove the like
        await Like.deleteOne({ _id: like._id });
        orphanedFixed++;
      } else if (!story.likedBy?.includes(like.userInternalId)) {
        // Add to likedBy array
        await Story.findByIdAndUpdate(like.storyId, {
          $addToSet: { likedBy: like.userInternalId },
          $inc: { likes: 1 }
        });
        orphanedFixed++;
      }
    }

    res.json({
      success: true,
      fixed: {
        inconsistentStories: fixed,
        orphanedLikes: orphanedFixed
      }
    });
  } catch (error) {
    console.error('Consistency fix error:', error);
    res.status(500).json({ success: false, error: 'Failed to fix consistency' });
  }
});

module.exports = router;
