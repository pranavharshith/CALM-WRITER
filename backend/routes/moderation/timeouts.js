const {
  express, Story, StoryNode, Report, ModAction, User, ModeratorChat, TimeoutAppeal,
  requireAuth, requireModerator, requireAdmin, sanitizeMessageMiddleware,
  moderationLimiter,
} = require('./_shared');

const router = express.Router();

// POST /moderation/timeout-user - Issue timeout to a user
router.post('/timeout-user', requireModerator, moderationLimiter, async (req, res) => {
  try {
    const { userInternalId, duration, reason } = req.body;

    if (!userInternalId || !duration || !reason) {
      return res.status(400).json({ error: 'User ID, duration, and reason required' });
    }

    // Calculate timeout end time
    const durationMap = {
      '1h': 1 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const timeoutMs = durationMap[duration];
    if (!timeoutMs) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    const timeoutUntil = new Date(Date.now() + timeoutMs);

    const target = await User.findOne({ internalId: userInternalId });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.internalId === req.internalId) {
      return res.status(400).json({ error: 'You cannot timeout yourself' });
    }
    const actorRole = req.authenticatedUser?.role;
    if (target.role === 'admin' || (target.role === 'moderator' && actorRole !== 'admin')) {
      return res.status(403).json({ error: 'Cannot timeout this user' });
    }

    // Log moderation action with security event
    const { logSecurityEvent } = require('../../utils/logger');
    logSecurityEvent('USER_TIMEOUT_ISSUED', {
      moderatorId: req.internalId,
      userId: userInternalId,
      duration,
      reason,
      timeoutUntil,
      timestamp: new Date()
    });

    // Update user
    await User.findOneAndUpdate(
      { internalId: userInternalId },
      {
        timeoutUntil,
        timeoutReason: reason,
        timeoutIssuedBy: req.internalId
      }
    );

    res.json({ success: true, message: 'User timeout issued', timeoutUntil });
  } catch (error) {
    console.error('Timeout user error:', error);
    res.status(500).json({ error: 'Failed to timeout user' });
  }
});

// POST /moderation/issue-warning - Issue warning to a user
router.post('/issue-warning', requireModerator, async (req, res) => {
  try {
    const { userInternalId, reason } = req.body;

    if (!userInternalId || !reason) {
      return res.status(400).json({ error: 'User ID and reason required' });
    }

    // Increment strikes
    const user = await User.findOneAndUpdate(
      { internalId: userInternalId },
      { $inc: { strikes: 1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Warning issued',
      strikes: user.strikes
    });
  } catch (error) {
    console.error('Issue warning error:', error);
    res.status(500).json({ error: 'Failed to issue warning' });
  }
});

module.exports = router;
