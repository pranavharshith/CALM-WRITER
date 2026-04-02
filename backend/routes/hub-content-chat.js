const express = require('express');
const router = express.Router();
const CollaborativeHub = require('../models/CollaborativeHub');
const HubChat = require('../models/HubChat');
const Story = require('../models/Story');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');
const { sanitizeStoryMiddleware, sanitizeMessageMiddleware } = require('../middleware/inputSanitization');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// GET /hubs/:hubId/stories - Get hub stories
router.get('/:hubId/stories', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const total = await Story.countDocuments({ hubId: hub._id });
    const stories = await Story.find({ hubId: hub._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const enriched = await Promise.all(stories.map(async (s) => {
      const author = await User.findOne({ internalId: s.internalAuthorId });
      return {
        _id: s._id,
        title: s.title,
        text: s.text.substring(0, 150) + '...',
        wordCount: s.wordCount,
        likes: s.likes,
        author: author?.username,
        createdAt: s.createdAt
      };
    }));

    res.json({
      success: true,
      stories: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Hub stories fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hub stories' });
  }
});

// POST /hubs/:hubId/stories - Create hub story
router.post('/:hubId/stories', requireAuth, sanitizeStoryMiddleware, async (req, res) => {
  try {
    const { title, text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Story text required' });
    }

    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'Not a hub member' });
    }

    // Check word limit
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > hub.wordLimitPerContribution) {
      return res.status(400).json({
        success: false,
        error: `Story exceeds hub word limit of ${hub.wordLimitPerContribution}`
      });
    }

    const story = new Story({
      internalAuthorId: req.internalId,
      title: title || text.substring(0, 100),
      text,
      wordCount,
      hubId: hub._id,
      isHubCollaborative: true,
      hubContributors: [req.internalId],
      hubApprovalStatus: hub.requireApproval ? 'pending' : 'approved',
      publishedAt: new Date()
    });

    await story.save();

    hub.rootStories.push(story._id);
    hub.totalStories += 1;
    hub.lastActivityAt = new Date();
    await hub.save();

    res.json({
      success: true,
      message: 'Story created',
      story: {
        _id: story._id,
        title: story.title,
        status: story.hubApprovalStatus
      }
    });
  } catch (error) {
    console.error('Hub story creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create story' });
  }
});

// GET /hubs/:hubId/chat - Get hub chat messages
router.get('/:hubId/chat', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    if (!hub.chatEnabled) {
      return res.status(403).json({ success: false, error: 'Chat is disabled for this hub' });
    }

    const total = await HubChat.countDocuments({ hubId: hub._id });
    const messages = await HubChat.find({ hubId: hub._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enriched = await Promise.all(messages.map(async (m) => {
      const author = await User.findOne({ internalId: m.authorInternalId });
      return {
        _id: m._id,
        message: m.message,
        author: author?.username,
        createdAt: m.createdAt
      };
    }));

    res.json({
      success: true,
      messages: enriched.reverse(),
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Hub chat fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
});

// POST /hubs/:hubId/chat - Post hub chat message
router.post('/:hubId/chat', requireAuth, sanitizeMessageMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }

    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    if (!hub.chatEnabled) {
      return res.status(403).json({ success: false, error: 'Chat is disabled' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'Not a hub member' });
    }

    const chatMessage = new HubChat({
      hubId: hub._id,
      authorInternalId: req.internalId,
      message
    });

    await chatMessage.save();

    hub.lastChatMessageAt = new Date();
    await hub.save();

    res.json({
      success: true,
      message: 'Message sent',
      chatMessage: {
        _id: chatMessage._id,
        createdAt: chatMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// DELETE /hubs/:hubId/chat/:messageId - Delete hub chat message
router.delete('/:hubId/chat/:messageId', requireAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member || (member.role !== 'creator' && member.role !== 'moderator')) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const message = await HubChat.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await HubChat.deleteOne({ _id: req.params.messageId });

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Message deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

module.exports = router;
