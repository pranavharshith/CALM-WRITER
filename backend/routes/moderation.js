const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const Report = require('../models/Report');
const ModAction = require('../models/ModAction');
const User = require('../models/User');
const ModeratorChat = require('../models/ModeratorChat');
const TimeoutAppeal = require('../models/TimeoutAppeal');
const { requireAuth } = require('../middleware/auth-consolidated');
const { requireModerator, requireAdmin } = require('../middleware/adminAuth');
const { sanitizeMessageMiddleware } = require('../middleware/inputSanitization');
const rateLimit = require('express-rate-limit');
const { ipKey } = require('express-rate-limit');

// Rate limiter for moderation actions - 100 actions per hour per moderator
const moderationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { success: false, error: 'Too many moderation actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKey(req),
  skip: (req) => !req.internalId // Skip if not authenticated
});

// GET /moderation/reports - Get pending reports
router.get('/reports', requireModerator, async (req, res) => {
  try {
    const status = req.query.status || 'pending';

    const reports = await Report.find({ status })
      .sort({ createdAt: -1 })
      .limit(50);

    // Enrich with story/node info
    const enrichedReports = await Promise.all(reports.map(async (report) => {
      let content = null;
      let contentType = null;

      if (report.storyId) {
        const story = await Story.findById(report.storyId);
        if (story) {
          content = {
            id: story._id,
            title: story.title,
            preview: story.text.substring(0, 200),
            authorInternalId: story.internalAuthorId,
          };
          contentType = 'story';
        }
      } else if (report.storyNodeId) {
        const node = await StoryNode.findById(report.storyNodeId);
        if (node) {
          content = {
            id: node._id,
            preview: node.content.substring(0, 200),
            type: node.type,
            authorInternalId: node.authorInternalId,
          };
          contentType = 'node';
        }
      }

      const reporter = await User.findOne({ internalId: report.userInternalId });

      return {
        ...report.toObject(),
        content,
        contentType,
        reporterUsername: reporter?.username || 'Anonymous',
      };
    }));

    res.json({ reports: enrichedReports });
  } catch (error) {
    console.error('Reports fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /moderation/remove-story - Remove story (after report)
router.post('/remove-story', requireModerator, moderationLimiter, async (req, res) => {
  try {
    const { storyId, reason, reportId } = req.body;

    if (!storyId || !reason) {
      return res.status(400).json({ error: 'Story ID and reason required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Hide the story instead of deleting
    story.hidden = true;
    story.hiddenReason = reason;
    await story.save();

    // Log moderation action with security event
    const { logSecurityEvent } = require('../utils/logger');
    logSecurityEvent('STORY_REMOVED_BY_MODERATOR', {
      moderatorId: req.internalId,
      storyId,
      reason,
      reportId,
      authorId: story.internalAuthorId,
      timestamp: new Date()
    });

    const modAction = new ModAction({
      moderatorInternalId: req.internalId,
      actionType: 'remove_story',
      targetStoryId: storyId,
      reason,
      relatedReportId: reportId || null,
    });
    await modAction.save();

    // Update report if provided
    if (reportId) {
      await Report.findByIdAndUpdate(reportId, {
        status: 'actioned',
        reviewedBy: req.internalId,
        reviewedAt: new Date(),
      });
    }

    res.json({ success: true, message: 'Story hidden' });
  } catch (error) {
    console.error('Remove story error:', error);
    res.status(500).json({ error: 'Failed to remove story' });
  }
});

// POST /moderation/remove-node - Remove story node (continuation/response)
router.post('/remove-node', requireModerator, moderationLimiter, async (req, res) => {
  try {
    const { nodeId, reason, reportId } = req.body;

    if (!nodeId || !reason) {
      return res.status(400).json({ error: 'Node ID and reason required' });
    }

    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Hide the node
    node.hidden = true;
    node.hiddenReason = reason;
    await node.save();

    // Log moderation action
    const modAction = new ModAction({
      moderatorInternalId: req.internalId,
      actionType: 'remove_node',
      targetNodeId: nodeId,
      reason,
      relatedReportId: reportId || null,
    });
    await modAction.save();

    // Update report if provided
    if (reportId) {
      await Report.findByIdAndUpdate(reportId, {
        status: 'actioned',
        reviewedBy: req.internalId,
        reviewedAt: new Date(),
      });
    }

    res.json({ success: true, message: 'Node hidden' });
  } catch (error) {
    console.error('Remove node error:', error);
    res.status(500).json({ error: 'Failed to remove node' });
  }
});

// POST /moderation/lock-thread - Lock thread to prevent new continuations/responses
router.post('/lock-thread', requireModerator, async (req, res) => {
  try {
    const { storyId, reason } = req.body;

    if (!storyId || !reason) {
      return res.status(400).json({ error: 'Story ID and reason required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    story.threadLocked = true;
    await story.save();

    // Log moderation action
    const modAction = new ModAction({
      moderatorInternalId: req.internalId,
      actionType: 'lock_thread',
      targetStoryId: storyId,
      reason,
    });
    await modAction.save();

    res.json({ success: true, message: 'Thread locked' });
  } catch (error) {
    console.error('Lock thread error:', error);
    res.status(500).json({ error: 'Failed to lock thread' });
  }
});

// POST /moderation/pin-comment - Pin moderator comment (expires after 7-10 days)
router.post('/pin-comment', requireModerator, async (req, res) => {
  try {
    const { storyId, comment, daysToExpire } = req.body;

    if (!storyId || !comment) {
      return res.status(400).json({ error: 'Story ID and comment required' });
    }

    const days = daysToExpire || 7; // Default 7 days
    const pinnedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Create a special response node for the pinned comment
    const pinnedNode = new StoryNode({
      parentStoryId: storyId,
      rootStoryId: storyId,
      authorInternalId: req.internalId,
      content: comment,
      type: 'RESPONSE',
      wordCount: comment.split(/\s+/).length,
      locked: true,
    });
    await pinnedNode.save();

    // Log moderation action
    const modAction = new ModAction({
      moderatorInternalId: req.internalId,
      actionType: 'pin_comment',
      targetStoryId: storyId,
      targetNodeId: pinnedNode._id,
      reason: 'Moderator pinned comment',
      pinnedUntil,
    });
    await modAction.save();

    res.json({
      success: true,
      message: 'Comment pinned',
      nodeId: pinnedNode._id,
      expiresAt: pinnedUntil,
    });
  } catch (error) {
    console.error('Pin comment error:', error);
    res.status(500).json({ error: 'Failed to pin comment' });
  }
});

// POST /moderation/dismiss-report - Dismiss a report without action
router.post('/dismiss-report', requireModerator, async (req, res) => {
  try {
    const { reportId } = req.body;

    if (!reportId) {
      return res.status(400).json({ error: 'Report ID required' });
    }

    await Report.findByIdAndUpdate(reportId, {
      status: 'dismissed',
      reviewedBy: req.internalId,
      reviewedAt: new Date(),
    });

    res.json({ success: true, message: 'Report dismissed' });
  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({ error: 'Failed to dismiss report' });
  }
});

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

    // Log moderation action with security event
    const { logSecurityEvent } = require('../utils/logger');
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
