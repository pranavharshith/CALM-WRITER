const {
  express, CollaborativeHub, HubInvite, HubJoinRequest, HubChat, User, requireAuth,
  isHubMember, isHubModerator,
} = require('./_shared');

const router = express.Router();

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

        const targetMember = hub.members.find(m => m.userInternalId === userId && m.isActive !== false);
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
        const activeMembers = hub.members.filter(m => m.isActive !== false).length;
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

        const { notifyHubStaff } = require('../../../utils/notificationHelper');
        notifyHubStaff(hub, {
            type: 'hub_approved',
            fromUserId: req.internalId,
            fromUsername: req.user?.username,
            hubId: invite.hubId,
            message: `${req.user?.username || 'Someone'} accepted an invite to ${hub.name}.`
        });

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

module.exports = router;
