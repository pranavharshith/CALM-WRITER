const {
  express, Story, StoryNode, Report, ModAction, User, ModeratorChat, TimeoutAppeal,
  requireAuth, requireModerator, requireAdmin, sanitizeMessageMiddleware,
  moderationLimiter,
} = require('./_shared');

const router = express.Router();

// GET /moderation/pinned-comments/:storyId - Get active pinned comments for a story
router.get('/pinned-comments/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;

    // Get pinned comments that haven't expired
    const pinnedActions = await ModAction.find({
      targetStoryId: storyId,
      actionType: 'pin_comment',
      pinnedUntil: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    // Get the actual nodes
    const pinnedComments = await Promise.all(pinnedActions.map(async (action) => {
      const node = await StoryNode.findById(action.targetNodeId);
      if (!node) return null;

      const moderator = await User.findOne({ internalId: action.moderatorInternalId });

      return {
        nodeId: node._id,
        content: node.content,
        moderatorUsername: moderator?.username || 'Moderator',
        createdAt: action.createdAt,
        expiresAt: action.pinnedUntil,
      };
    }));

    res.json({
      pinnedComments: pinnedComments.filter(c => c !== null)
    });
  } catch (error) {
    console.error('Pinned comments error:', error);
    res.status(500).json({ error: 'Failed to fetch pinned comments' });
  }
});

module.exports = router;
