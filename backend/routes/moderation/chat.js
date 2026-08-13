const {
  express, Story, StoryNode, Report, ModAction, User, ModeratorChat, TimeoutAppeal,
  requireAuth, requireModerator, requireAdmin, sanitizeMessageMiddleware,
  moderationLimiter,
} = require('./_shared');

const router = express.Router();

// GET /moderation/chat - Get moderator chat messages
router.get('/chat', requireModerator, async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 50;
    // Validate limit is between 1-100
    if (isNaN(limit) || limit < 1 || limit > 100) {
      limit = 50;
    }

    let before = new Date();
    if (req.query.before) {
      const beforeDate = new Date(req.query.before);
      // Validate date format
      if (isNaN(beforeDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date format for before parameter' });
      }
      before = beforeDate;
    }

    const messages = await ModeratorChat.find({
      deletedAt: null,
      createdAt: { $lt: before }
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Fetch chat error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /moderation/chat - Post message to moderator chat
router.post('/chat', requireModerator, sanitizeMessageMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    // Check if user is a moderator and enforce 12-hour restriction
    const user = await User.findOne({ internalId: req.internalId });

    if (user.role === 'moderator' && user.moderatorJoinedAt) {
      const hoursSinceJoined = (Date.now() - user.moderatorJoinedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceJoined < 12) {
        const hoursRemaining = (12 - hoursSinceJoined).toFixed(1);
        return res.status(403).json({
          error: `New moderators must wait 12 hours before posting. ${hoursRemaining} hours remaining.`
        });
      }
    }

    // Create message
    const chatMessage = new ModeratorChat({
      senderInternalId: req.internalId,
      senderUsername: user.username,
      message: message.trim()
    });

    await chatMessage.save();

    res.json({ success: true, message: chatMessage });
  } catch (error) {
    console.error('Post chat error:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

module.exports = router;
