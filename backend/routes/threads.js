const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/auth-consolidated');
const { checkAndUpdateContinuationCooldown } = require('../utils/cooldownManager');
const { sanitizeMessageMiddleware } = require('../middleware/inputSanitization');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Rate limiter for thread operations - 50 requests per hour
const threadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Too many thread requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKeyGenerator(req.ip),
  skip: (req) => req.method === 'GET' // Don't rate limit reads
});

// GET /threads/:storyId - Fetch thread for story
router.get('/:storyId', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story || story.hidden) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await StoryNode.countDocuments({ parentStoryId: story._id, hidden: false });
    const nodes = await StoryNode.find({ parentStoryId: story._id, hidden: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const enriched = await Promise.all(nodes.map(async (node) => {
      const author = await User.findOne({ internalId: node.authorInternalId });
      return {
        _id: node._id,
        content: node.content,
        type: node.type,
        authorUsername: author?.username || 'Anonymous',
        authorRole: author?.role || 'member',
        author: {
          username: author?.username,
          displayName: author?.displayName
        },
        createdAt: node.createdAt
      };
    }));

    const author = await User.findOne({ internalId: story.internalAuthorId });
    const continuations = enriched.filter(n => n.type === 'CONTINUATION');
    const responses = enriched.filter(n => n.type === 'RESPONSE');

    res.json({
      success: true,
      thread: {
        _id: story._id,
        title: story.title,
        text: story.text,
        threadLocked: story.threadLocked,
        authorUsername: author?.username || 'Anonymous',
        authorRole: author?.role || 'member',
        isOriginalAuthor: !!(req.internalId && story.internalAuthorId && String(story.internalAuthorId) === String(req.internalId)),
        continuations,
        responses
      },
      story: {
        _id: story._id,
        title: story.title,
        text: story.text,
        threadLocked: story.threadLocked,
        authorUsername: author?.username || 'Anonymous',
        authorRole: author?.role || 'member'
      },
      nodes: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Thread fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch thread' });
  }
});

// GET /threads/:storyId/has-thread - Check if story has thread
router.get('/:storyId/has-thread', async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const nodeCount = await StoryNode.countDocuments({ parentStoryId: story._id, hidden: false });

    res.json({
      success: true,
      hasThread: nodeCount > 0,
      nodeCount,
      threadLocked: story.threadLocked
    });
  } catch (error) {
    console.error('Has thread check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check thread' });
  }
});

// POST /threads/:storyId/continue - Continue story
router.post('/:storyId/continue', requireAuth, threadLimiter, sanitizeMessageMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const story = await Story.findById(req.params.storyId);
    if (!story || story.hidden) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    // Check if user is timed out
    const user = await User.findOne({ internalId: req.internalId });
    if (user && user.timeoutUntil && user.timeoutUntil > new Date()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Account temporarily suspended',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    if (story.threadLocked) {
      return res.status(403).json({ success: false, error: 'Thread is locked' });
    }

    // Check cooldown
    const cooldownCheck = await checkAndUpdateContinuationCooldown(req.internalId, 30);
    if (!cooldownCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: cooldownCheck.message,
        timeRemaining: cooldownCheck.timeRemaining
      });
    }

    const node = new StoryNode({
      parentStoryId: story._id,
      rootStoryId: story._id,
      authorInternalId: req.internalId,
      content,
      type: 'CONTINUATION',
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
      locked: true
    });

    await node.save();

    // Notify the story author of a new continuation
    const { createNotification } = require('../utils/notificationHelper');
    createNotification({
      userInternalId: story.internalAuthorId,
      type: 'story_continuation',
      fromUserId: req.internalId,
      fromUsername: req.user?.username,
      storyId: story._id,
      storyTitle: story.title,
      message: `@${req.user?.username || 'Someone'} continued your story "${story.title}".`
    });

    res.json({
      success: true,
      message: 'Continuation added',
      node: {
        _id: node._id,
        content: node.content,
        createdAt: node.createdAt
      }
    });
  } catch (error) {
    console.error('Continue story error:', error);
    res.status(500).json({ success: false, error: 'Failed to continue story' });
  }
});

// POST /threads/:storyId/respond - Respond to story
router.post('/:storyId/respond', requireAuth, threadLimiter, sanitizeMessageMiddleware, async (req, res) => {
  try {
    const { content, nodeId } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const story = await Story.findById(req.params.storyId);
    if (!story || story.hidden) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    if (story.threadLocked) {
      return res.status(403).json({ success: false, error: 'Thread is locked' });
    }

    const node = new StoryNode({
      parentStoryId: story._id,
      rootStoryId: story._id,
      authorInternalId: req.internalId,
      content,
      type: 'RESPONSE',
      parentNodeId: nodeId || null,
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
      locked: true
    });

    await node.save();

    // Notify the story author of a new response
    const { createNotification } = require('../utils/notificationHelper');
    createNotification({
      userInternalId: story.internalAuthorId,
      type: 'thread_response',
      fromUserId: req.internalId,
      fromUsername: req.user?.username,
      storyId: story._id,
      storyTitle: story.title,
      message: `@${req.user?.username || 'Someone'} responded to your story "${story.title}".`
    });

    res.json({
      success: true,
      message: 'Response added',
      node: {
        _id: node._id,
        content: node.content,
        createdAt: node.createdAt
      }
    });
  } catch (error) {
    console.error('Respond to story error:', error);
    res.status(500).json({ success: false, error: 'Failed to respond' });
  }
});

module.exports = router;
