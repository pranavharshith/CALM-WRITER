const {
  express, CollaborativeHub, HubInvite, HubJoinRequest, HubChat, User, requireAuth,
  isHubMember, isHubModerator,
} = require('./_shared');

const router = express.Router();

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
        const activeMembers = hub.members.filter(m => m.isActive !== false).length;
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

            const { notifyHubStaff } = require('../../../utils/notificationHelper');
            notifyHubStaff(hub, {
                type: 'hub_approved',
                fromUserId: req.internalId,
                fromUsername: req.user?.username,
                hubId,
                message: `${req.user?.username || 'Someone'} joined ${hub.name}.`
            });

            return res.json({ success: true, message: 'Joined hub successfully', autoApproved: true });
        }

        // Create join request
        const joinRequest = new HubJoinRequest({
            hubId,
            userInternalId: req.internalId,
            message: message || ''
        });

        await joinRequest.save();

        const { notifyHubStaff } = require('../../../utils/notificationHelper');
        notifyHubStaff(hub, {
            type: 'hub_join_request',
            fromUserId: req.internalId,
            fromUsername: req.user?.username,
            hubId,
            message: `${req.user?.username || 'Someone'} asked to join ${hub.name}.`
        });

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
        const activeMembers = hub.members.filter(m => m.isActive !== false).length;
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

        // Notify the newly approved member
        const { createNotification } = require('../../../utils/notificationHelper');
        createNotification({
          userInternalId: request.userInternalId,
          type: 'hub_approved',
          fromUserId: req.internalId,
          fromUsername: req.user?.username,
          hubId,
          message: `You've been approved to join ${hub.name}.`
        });

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

module.exports = router;
