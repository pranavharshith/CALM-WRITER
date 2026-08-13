const {
  express, Story, StoryNode, Report, ModAction, User, ModeratorChat, TimeoutAppeal,
  requireAuth, requireModerator, requireAdmin, sanitizeMessageMiddleware,
  moderationLimiter,
} = require('./_shared');

const router = express.Router();

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
    const { logSecurityEvent } = require('../../utils/logger');
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

module.exports = router;
