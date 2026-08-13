const {
  express, Story, StoryNode, Report, ModAction, User, ModeratorChat, TimeoutAppeal,
  requireAuth, requireModerator, requireAdmin, sanitizeMessageMiddleware,
  moderationLimiter,
} = require('./_shared');

const router = express.Router();

// POST /moderation/submit-appeal - User submits timeout appeal
router.post('/submit-appeal', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body;
    const userInternalId = req.internalId;

    // Check if user is actually timed out
    const user = await User.findOne({ internalId: userInternalId });
    if (!user || !user.timeoutUntil || user.timeoutUntil < new Date()) {
      return res.status(400).json({ error: 'No active timeout found' });
    }

    // Pre-determined questions
    const questions = [
      {
        questionId: 1,
        question: 'Do you understand why your content was flagged?',
        expectedKeywords: ['yes', 'understand', 'aware', 'know']
      },
      {
        questionId: 2,
        question: 'What will you do differently in the future?',
        expectedKeywords: ['respectful', 'guidelines', 'careful', 'appropriate', 'mindful']
      },
      {
        questionId: 3,
        question: 'Have you read the community guidelines?',
        expectedKeywords: ['yes', 'read', 'reviewed', 'understand']
      }
    ];

    // Map answers to questions
    const questionsWithAnswers = questions.map((q, idx) => ({
      ...q,
      answer: answers[idx] || ''
    }));

    // Create appeal
    const appeal = new TimeoutAppeal({
      userInternalId,
      username: user.username,
      timeoutReason: user.timeoutReason,
      timeoutIssuedBy: user.timeoutIssuedBy,
      timeoutUntil: user.timeoutUntil,
      questions: questionsWithAnswers,
      status: 'pending',
      conflictedWith: user.timeoutIssuedBy ? [user.timeoutIssuedBy] : [] // Prevent issuer from reviewing
    });

    await appeal.save();

    res.json({ success: true, appealId: appeal._id });
  } catch (error) {
    console.error('Submit appeal error:', error);
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// GET /moderation/appeals - Get pending appeals (moderators only)
router.get('/appeals', requireModerator, async (req, res) => {
  try {
    const status = req.query.status || 'pending';

    const appeals = await TimeoutAppeal.find({ status })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ appeals });
  } catch (error) {
    console.error('Fetch appeals error:', error);
    res.status(500).json({ error: 'Failed to fetch appeals' });
  }
});

// POST /moderation/review-appeal - Moderator reviews appeal (requires admin approval for major decisions)
router.post('/review-appeal', requireModerator, async (req, res) => {
  try {
    const { appealId, decision, notes, newDuration } = req.body;

    if (!appealId || !decision) {
      return res.status(400).json({ error: 'Appeal ID and decision required' });
    }

    const appeal = await TimeoutAppeal.findById(appealId);
    if (!appeal) {
      return res.status(404).json({ error: 'Appeal not found' });
    }

    // CRITICAL FIX #1: Prevent same moderator from reviewing their own timeout
    if (appeal.timeoutIssuedBy === req.internalId) {
      return res.status(403).json({
        error: 'Conflict of interest: You cannot review an appeal for a timeout you issued.',
        conflictDetected: true,
        shouldReassign: true
      });
    }

    // Check if moderator is in conflicted list
    if (appeal.conflictedWith && appeal.conflictedWith.includes(req.internalId)) {
      return res.status(403).json({
        error: 'You are not assigned to review this appeal.',
        conflictDetected: true
      });
    }

    // CRITICAL FIX #2: Require admin approval for timeout cancellation
    const reviewer = await User.findOne({ internalId: req.internalId });
    if (decision === 'timeout_cancelled' && reviewer.role !== 'admin') {
      return res.status(403).json({
        error: 'Only admins can cancel timeouts. This decision requires admin approval.',
        requiresAdminApproval: true
      });
    }

    // Update appeal
    appeal.status = 'under_review';
    appeal.reviewedBy = req.internalId;
    appeal.reviewedAt = new Date();
    appeal.reviewNotes = notes;
    appeal.finalDecision = decision;

    if (decision === 'timeout_reduced' && newDuration) {
      appeal.newTimeoutDuration = newDuration;
    }

    await appeal.save();

    // Update user timeout based on decision
    const user = await User.findOne({ internalId: appeal.userInternalId });

    if (decision === 'timeout_cancelled') {
      user.timeoutUntil = null;
      user.timeoutReason = null;
      user.timeoutIssuedBy = null;
    } else if (decision === 'timeout_reduced' && newDuration) {
      const durationMap = {
        '1h': 1 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      };
      const newTimeoutMs = durationMap[newDuration];
      if (newTimeoutMs) {
        user.timeoutUntil = new Date(Date.now() + newTimeoutMs);
      }
    }

    await user.save();

    res.json({ success: true, message: 'Appeal reviewed' });
  } catch (error) {
    console.error('Review appeal error:', error);
    res.status(500).json({ error: 'Failed to review appeal' });
  }
});

// POST /moderation/revoke-timeout - Admin revokes timeout
router.post('/revoke-timeout', requireAdmin, moderationLimiter, async (req, res) => {
  try {
    const { userInternalId, reason } = req.body;

    if (!userInternalId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    await User.findOneAndUpdate(
      { internalId: userInternalId },
      {
        timeoutUntil: null,
        timeoutReason: null,
        timeoutIssuedBy: null
      }
    );

    // Update any pending appeals
    await TimeoutAppeal.updateMany(
      { userInternalId, status: { $in: ['pending', 'under_review'] } },
      {
        'adminOverride.overriddenBy': req.internalId,
        'adminOverride.overriddenAt': new Date(),
        'adminOverride.overrideReason': reason || 'Admin override',
        status: 'approved'
      }
    );

    res.json({ success: true, message: 'Timeout revoked' });
  } catch (error) {
    console.error('Revoke timeout error:', error);
    res.status(500).json({ error: 'Failed to revoke timeout' });
  }
});

module.exports = router;
