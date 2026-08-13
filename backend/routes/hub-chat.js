const express = require('express');
const router = express.Router();
const CollaborativeHub = require('../models/CollaborativeHub');
const HubChat = require('../models/HubChat');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/auth-consolidated');

// Helper: Check if user is hub member
function isHubMember(hub, userInternalId) {
    return hub.members.some(m => m.userInternalId === userInternalId && m.isActive);
}

// Helper: Check if user is hub creator or moderator
function isHubModerator(hub, userInternalId) {
    const member = hub.members.find(m => m.userInternalId === userInternalId && m.isActive);
    return member && (member.role === 'creator' || member.role === 'moderator');
}

// GET /hubs/:hubId/chat - Get chat messages
router.get('/:hubId/chat', optionalAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { limit = 50, before } = req.query;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check access for private hubs
        const isMember = isHubMember(hub, req.internalId);
        if (hub.visibility === 'private' && (!req.internalId || !isMember)) {
            return res.status(403).json({ error: 'This hub is private' });
        }

        if (!hub.chatEnabled) {
            return res.status(400).json({ error: 'Chat is disabled for this hub' });
        }

        // Build query
        const query = { hubId, isDeleted: { $ne: true } };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await HubChat.find(query)
            .sort({ createdAt: -1, isPinned: -1 }) // Pinned messages first, then newest
            .limit(parseInt(limit))
            .lean();

        // Get author info
        const authorIds = [...new Set(messages.map(m => m.authorInternalId).filter(id => id !== 'system'))];
        const authors = await User.find({ internalId: { $in: authorIds } })
            .select('internalId username displayName')
            .lean();
        const authorMap = Object.fromEntries(authors.map(a => [a.internalId, a]));

        const messagesWithAuthors = messages.reverse().map(msg => ({
            ...msg,
            author: msg.authorInternalId === 'system' ? { username: 'System', displayName: 'System' } : authorMap[msg.authorInternalId],
            senderUsername: msg.authorInternalId === 'system' ? 'System' : (authorMap[msg.authorInternalId]?.username || 'Anonymous')
        }));

        res.json({ messages: messagesWithAuthors });
    } catch (error) {
        console.error('Get chat messages error:', error);
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
});

// POST /hubs/:hubId/chat - Post chat message
router.post('/:hubId/chat', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { message, replyTo } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        if (message.length > 1000) {
            return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
        }

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check if user is member
        if (!isHubMember(hub, req.internalId)) {
            return res.status(403).json({ error: 'You must be a member to chat' });
        }

        if (!hub.chatEnabled) {
            return res.status(400).json({ error: 'Chat is disabled for this hub' });
        }

        // Create message
        const chatMessage = new HubChat({
            hubId,
            authorInternalId: req.internalId,
            message: message.trim(),
            type: 'message',
            replyTo: replyTo || null
        });

        await chatMessage.save();

        // Update hub last chat time
        hub.lastChatMessageAt = new Date();
        hub.lastActivityAt = new Date();
        await hub.save();

        res.json({
            success: true,
            message: {
                _id: chatMessage._id,
                message: chatMessage.message,
                createdAt: chatMessage.createdAt
            }
        });
    } catch (error) {
        console.error('Post chat message error:', error);
        res.status(500).json({ error: 'Failed to post message' });
    }
});

// POST /hubs/:hubId/chat/:messageId/pin - Pin chat message
router.post('/:hubId/chat/:messageId/pin', requireAuth, async (req, res) => {
    try {
        const { hubId, messageId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can pin messages' });
        }

        const message = await HubChat.findById(messageId);
        if (!message || message.hubId !== hubId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        message.isPinned = true;
        message.type = 'announcement'; // Make it an announcement
        await message.save();

        res.json({ success: true, message: 'Message pinned' });
    } catch (error) {
        console.error('Pin message error:', error);
        res.status(500).json({ error: 'Failed to pin message' });
    }
});

// DELETE /hubs/:hubId/chat/:messageId/pin - Unpin chat message
router.delete('/:hubId/chat/:messageId/pin', requireAuth, async (req, res) => {
    try {
        const { hubId, messageId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can unpin messages' });
        }

        const message = await HubChat.findById(messageId);
        if (!message || message.hubId !== hubId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        message.isPinned = false;
        message.type = 'message'; // Revert to normal message
        await message.save();

        res.json({ success: true, message: 'Message unpinned' });
    } catch (error) {
        console.error('Unpin message error:', error);
        res.status(500).json({ error: 'Failed to unpin message' });
    }
});

// POST /hubs/:hubId/chat/:messageId/react - Add reaction to message
router.post('/:hubId/chat/:messageId/react', requireAuth, async (req, res) => {
    try {
        const { hubId, messageId } = req.params;
        const { emoji } = req.body;

        if (!emoji || emoji.length > 10) {
            return res.status(400).json({ error: 'Invalid emoji' });
        }

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check if user is member
        if (!isHubMember(hub, req.internalId)) {
            return res.status(403).json({ error: 'You must be a member to react' });
        }

        const message = await HubChat.findById(messageId);
        if (!message || message.hubId !== hubId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
            r => r.userInternalId === req.internalId && r.emoji === emoji
        );

        if (existingReaction) {
            // Remove reaction (toggle off)
            message.reactions = message.reactions.filter(
                r => !(r.userInternalId === req.internalId && r.emoji === emoji)
            );
        } else {
            // Add reaction
            message.reactions.push({
                userInternalId: req.internalId,
                emoji,
                reactedAt: new Date()
            });
        }

        await message.save();

        res.json({ success: true, message: 'Reaction updated' });
    } catch (error) {
        console.error('React to message error:', error);
        res.status(500).json({ error: 'Failed to react to message' });
    }
});

// DELETE /hubs/:hubId/chat/:messageId - Delete chat message
router.delete('/:hubId/chat/:messageId', requireAuth, async (req, res) => {
    try {
        const { hubId, messageId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        const message = await HubChat.findById(messageId);
        if (!message || message.hubId !== hubId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check permissions: only message author or hub moderator can delete
        const isAuthor = message.authorInternalId === req.internalId;
        const isModerator = isHubModerator(hub, req.internalId);

        if (!isAuthor && !isModerator) {
            return res.status(403).json({ error: 'You cannot delete this message' });
        }

        // Soft delete: mark as deleted instead of removing
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = req.internalId;
        await message.save();

        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
