const express = require('express');
const router = express.Router();
const CollaborativeHub = require('../models/CollaborativeHub');
const HubInvite = require('../models/HubInvite');
const HubJoinRequest = require('../models/HubJoinRequest');
const HubChat = require('../models/HubChat');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');

// Helper: Check if user is hub member
function isHubMember(hub, userInternalId) {
    return hub.members.some(m => m.userInternalId === userInternalId && m.isActive);
}

// Helper: Check if user is hub creator or moderator
function isHubModerator(hub, userInternalId) {
    const member = hub.members.find(m => m.userInternalId === userInternalId && m.isActive);
    return member && (member.role === 'creator' || member.role === 'moderator');
}

// POST /hubs/:hubId/invite - Invite user to hub
router.post('/:hubId/invite', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { userInternalId, email, message } = req.body;

        if (!userInternalId && !email) {
            return res.status(400).json({ error: 'Provide either userInternalId or email' });
        }

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can send invites' });
        }

        // Check if hub is full
        const activeMembers = hub.members.filter(m => m.isActive).length;
        if (activeMembers >= hub.maxMembers) {
            return res.status(400).json({ error: 'Hub is at maximum capacity' });
        }

        // If inviting by userInternalId, check if already member
        if (userInternalId) {
            if (isHubMember(hub, userInternalId)) {
                return res.status(400).json({ error: 'User is already a member' });
            }

            // Check for existing pending invite
            const existing = await HubInvite.findOne({
                hubId,
                inviteeInternalId: userInternalId,
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });

            if (existing) {
                return res.status(400).json({ error: 'User already has a pending invite' });
            }
        }

        // Create invite
        const invite = new HubInvite({
            hubId,
            inviterInternalId: req.internalId,
            inviteeInternalId: userInternalId || null,
            inviteeEmail: email || null,
            message: message || '',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        await invite.save();

        res.json({
            success: true,
            invite: {
                inviteToken: invite.inviteToken,
                expiresAt: invite.expiresAt
            }
        });
    } catch (error) {
        console.error('Send invite error:', error);
        res.status(500).json({ error: 'Failed to send invite' });
    }
});

// POST /hubs/:hubId/join-request - Request to join hub
router.post('/:hubId/join-request', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { message } = req.body;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check if already a member
        if (isHubMember(hub, req.internalId)) {
            return res.status(400).json({ error: 'You are already a member' });
        }

        // Check visibility and join policy
        if (hub.joinPolicy === 'invite_only') {
            return res.status(400).json({ error: 'This hub is invite-only' });
        }

        // Check if hub is full
        const activeMembers = hub.members.filter(m => m.isActive).length;
        if (activeMembers >= hub.maxMembers) {
            return res.status(400).json({ error: 'Hub is at maximum capacity' });
        }

        // Check for existing pending request
        const existing = await HubJoinRequest.findOne({
            hubId,
            userInternalId: req.internalId,
            status: 'pending'
        });

        if (existing) {
            return res.status(400).json({ error: 'You already have a pending join request' });
        }

        // If join policy is 'open', auto-approve
        if (hub.joinPolicy === 'open') {
            // Add member directly
            hub.members.push({
                userInternalId: req.internalId,
                role: 'member',
                joinedAt: new Date(),
                contributionCount: 0,
                isActive: true
            });

            await hub.save();

            // Create system message
            const systemMessage = new HubChat({
                hubId,
                authorInternalId: 'system',
                message: `New member joined the hub`,
                type: 'system'
            });
            await systemMessage.save();

            return res.json({ success: true, message: 'Joined hub successfully', autoApproved: true });
        }

        // Create join request
        const joinRequest = new HubJoinRequest({
            hubId,
            userInternalId: req.internalId,
            message: message || ''
        });

        await joinRequest.save();

        res.json({ success: true, message: 'Join request submitted for approval' });
    } catch (error) {
        console.error('Join request error:', error);
        res.status(500).json({ error: 'Failed to submit join request' });
    }
});

// POST /hubs/:hubId/join-via-invite - Join hub using invite token
router.post('/:hubId/join-via-invite', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { inviteToken } = req.body;

        if (!inviteToken) {
            return res.status(400).json({ error: 'Invite token required' });
        }

        const invite = await HubInvite.findOne({ inviteToken });
        if (!invite) {
            return res.status(404).json({ error: 'Invalid invite token' });
        }

        if (invite.hubId !== hubId) {
            return res.status(400).json({ error: 'Invite token does not match this hub' });
        }

        if (invite.status !== 'pending') {
            return res.status(400).json({ error: 'Invite has already been used or expired' });
        }

        if (invite.expiresAt < new Date()) {
            invite.status = 'expired';
            await invite.save();
            return res.status(400).json({ error: 'Invite has expired' });
        }

        // Check if invite is for specific user
        if (invite.inviteeInternalId && invite.inviteeInternalId !== req.internalId) {
            return res.status(403).json({ error: 'This invite is for a different user' });
        }

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check if already a member
        if (isHubMember(hub, req.internalId)) {
            return res.status(400).json({ error: 'You are already a member' });
        }

        // Check if hub is full
        const activeMembers = hub.members.filter(m => m.isActive).length;
        if (activeMembers >= hub.maxMembers) {
            return res.status(400).json({ error: 'Hub is at maximum capacity' });
        }

        // Add member
        hub.members.push({
            userInternalId: req.internalId,
            role: 'member',
            joinedAt: new Date(),
            invitedBy: invite.inviterInternalId,
            contributionCount: 0,
            isActive: true
        });

        await hub.save();

        // Mark invite as accepted
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        await invite.save();

        // Create system message
        const systemMessage = new HubChat({
            hubId,
            authorInternalId: 'system',
            message: `New member joined via invite`,
            type: 'system'
        });
        await systemMessage.save();

        res.json({ success: true, message: 'Successfully joined the hub' });
    } catch (error) {
        console.error('Join via invite error:', error);
        res.status(500).json({ error: 'Failed to join hub' });
    }
});

// GET /hubs/:hubId/join-requests - Get join requests for hub
router.get('/:hubId/join-requests', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { status = 'pending' } = req.query;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can view join requests' });
        }

        const requests = await HubJoinRequest.find({ hubId, status })
            .sort({ createdAt: -1 })
            .lean();

        // Get user info
        const userIds = requests.map(r => r.userInternalId);
        const users = await User.find({ internalId: { $in: userIds } })
            .select('internalId username displayName joinedAt')
            .lean();

        const userMap = Object.fromEntries(users.map(u => [u.internalId, u]));

        res.json({
            requests: requests.map(r => ({
                requestId: r._id,
                user: userMap[r.userInternalId],
                message: r.message,
                status: r.status,
                createdAt: r.createdAt,
                reviewedBy: r.reviewedBy,
                reviewedAt: r.reviewedAt,
                rejectionReason: r.rejectionReason
            }))
        });
    } catch (error) {
        console.error('Get join requests error:', error);
        res.status(500).json({ error: 'Failed to fetch join requests' });
    }
});

// POST /hubs/:hubId/join-requests/:requestId/approve - Approve join request
router.post('/:hubId/join-requests/:requestId/approve', requireAuth, async (req, res) => {
    try {
        const { hubId, requestId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can approve requests' });
        }

        const request = await HubJoinRequest.findById(requestId);
        if (!request || request.hubId !== hubId) {
            return res.status(404).json({ error: 'Join request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Request has already been processed' });
        }

        // Check if hub is full
        const activeMembers = hub.members.filter(m => m.isActive).length;
        if (activeMembers >= hub.maxMembers) {
            return res.status(400).json({ error: 'Hub is at maximum capacity' });
        }

        // Check if user is already a member
        if (isHubMember(hub, request.userInternalId)) {
            return res.status(400).json({ error: 'User is already a member' });
        }

        // Add member
        hub.members.push({
            userInternalId: request.userInternalId,
            role: 'member',
            joinedAt: new Date(),
            contributionCount: 0,
            isActive: true
        });

        await hub.save();

        // Update request
        request.status = 'approved';
        request.reviewedBy = req.internalId;
        request.reviewedAt = new Date();
        await request.save();

        // Create system message
        const systemMessage = new HubChat({
            hubId,
            authorInternalId: 'system',
            message: `New member joined the hub`,
            type: 'system'
        });
        await systemMessage.save();

        res.json({ success: true, message: 'Join request approved' });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ error: 'Failed to approve request' });
    }
});

// POST /hubs/:hubId/join-requests/:requestId/reject - Reject join request
router.post('/:hubId/join-requests/:requestId/reject', requireAuth, async (req, res) => {
    try {
        const { hubId, requestId } = req.params;
        const { reason } = req.body;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can reject requests' });
        }

        const request = await HubJoinRequest.findById(requestId);
        if (!request || request.hubId !== hubId) {
            return res.status(404).json({ error: 'Join request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Request has already been processed' });
        }

        // Update request
        request.status = 'rejected';
        request.reviewedBy = req.internalId;
        request.reviewedAt = new Date();
        request.rejectionReason = reason || '';
        await request.save();

        res.json({ success: true, message: 'Join request rejected' });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ error: 'Failed to reject request' });
    }
});

// DELETE /hubs/:hubId/members/:userId - Remove member from hub
router.delete('/:hubId/members/:userId', requireAuth, async (req, res) => {
    try {
        const { hubId, userId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can remove members' });
        }

        // Cannot remove the creator
        const targetMember = hub.members.find(m => m.userInternalId === userId);
        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (targetMember.role === 'creator') {
            return res.status(400).json({ error: 'Cannot remove the hub creator' });
        }

        // Mark as inactive instead of removing (preserve contribution history)
        targetMember.isActive = false;
        await hub.save();

        res.json({ success: true, message: 'Member removed from hub' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// PATCH /hubs/:hubId/members/:userId/role - Update member role
router.patch('/:hubId/members/:userId/role', requireAuth, async (req, res) => {
    try {
        const { hubId, userId } = req.params;
        const { role } = req.body;

        if (!['member', 'moderator'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "member" or "moderator"' });
        }

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Only creator can change roles
        const requesterMember = hub.members.find(m => m.userInternalId === req.internalId);
        if (!requesterMember || requesterMember.role !== 'creator') {
            return res.status(403).json({ error: 'Only the hub creator can change member roles' });
        }

        const targetMember = hub.members.find(m => m.userInternalId === userId && m.isActive);
        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (targetMember.role === 'creator') {
            return res.status(400).json({ error: 'Cannot change creator role' });
        }

        targetMember.role = role;
        await hub.save();

        res.json({ success: true, message: `Member role updated to ${role}` });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ error: 'Failed to update member role' });
    }
});

// POST /hubs/invites/:inviteId/respond - Respond to hub invite
router.post('/invites/:inviteId/respond', requireAuth, async (req, res) => {
    try {
        const { inviteId } = req.params;
        const { accept } = req.body;

        if (typeof accept !== 'boolean') {
            return res.status(400).json({ error: 'Accept parameter must be boolean' });
        }

        const invite = await HubInvite.findById(inviteId);
        if (!invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        if (invite.status !== 'pending') {
            return res.status(400).json({ error: 'Invite has already been processed' });
        }

        if (invite.expiresAt < new Date()) {
            invite.status = 'expired';
            await invite.save();
            return res.status(400).json({ error: 'Invite has expired' });
        }

        // Check if invite is for this user
        if (invite.inviteeInternalId && invite.inviteeInternalId !== req.internalId) {
            return res.status(403).json({ error: 'This invite is not for you' });
        }

        if (!accept) {
            // Decline invite
            invite.status = 'declined';
            invite.respondedAt = new Date();
            await invite.save();
            return res.json({ success: true, message: 'Invite declined' });
        }

        // Accept invite - use join-via-invite logic
        const hub = await CollaborativeHub.findOne({ hubId: invite.hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check if already a member
        if (isHubMember(hub, req.internalId)) {
            return res.status(400).json({ error: 'You are already a member' });
        }

        // Check if hub is full
        const activeMembers = hub.members.filter(m => m.isActive).length;
        if (activeMembers >= hub.maxMembers) {
            return res.status(400).json({ error: 'Hub is at maximum capacity' });
        }

        // Add member
        hub.members.push({
            userInternalId: req.internalId,
            role: 'member',
            joinedAt: new Date(),
            invitedBy: invite.inviterInternalId,
            contributionCount: 0,
            isActive: true
        });

        await hub.save();

        // Mark invite as accepted
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        await invite.save();

        // Create system message
        const systemMessage = new HubChat({
            hubId: invite.hubId,
            authorInternalId: 'system',
            message: `New member joined via invite`,
            type: 'system'
        });
        await systemMessage.save();

        res.json({ success: true, message: 'Successfully joined the hub' });
    } catch (error) {
        console.error('Respond to invite error:', error);
        res.status(500).json({ error: 'Failed to respond to invite' });
    }
});

// POST /hubs/:hubId/leave - Leave hub
router.post('/:hubId/leave', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        const member = hub.members.find(m => m.userInternalId === req.internalId && m.isActive);
        if (!member) {
            return res.status(400).json({ error: 'You are not a member of this hub' });
        }

        if (member.role === 'creator') {
            return res.status(400).json({ error: 'Creator cannot leave. Transfer ownership or archive the hub instead.' });
        }

        // Mark as inactive
        member.isActive = false;
        await hub.save();

        res.json({ success: true, message: 'You have left the hub' });
    } catch (error) {
        console.error('Leave hub error:', error);
        res.status(500).json({ error: 'Failed to leave hub' });
    }
});

module.exports = router;
