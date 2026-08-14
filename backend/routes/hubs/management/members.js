const {
  express, CollaborativeHub, HubInvite, HubJoinRequest, User, Story,
  requireAuth, optionalAuth, getPaginationParams, getPaginationMeta, crypto,
} = require('./_shared');

const router = express.Router();

// POST /hubs/:hubId/invite - Send hub invite
router.post('/:hubId/invite', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username required' });
    }

    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member || (member.role !== 'creator' && member.role !== 'moderator')) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // SECURITY FIX: Check if hub is at max capacity
    if (hub.members.length >= hub.maxMembers) {
      return res.status(400).json({ success: false, error: 'Hub is at maximum capacity' });
    }

    const safeName = String(username).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const targetUser = await User.findOne({ username: new RegExp(`^${safeName}$`, 'i') });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already member
    if (hub.members.some(m => m.userInternalId === targetUser.internalId)) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }

    // SECURITY FIX: Check for duplicate pending invites
    const existingInvite = await HubInvite.findOne({
      hubId: req.params.hubId,
      inviteeInternalId: targetUser.internalId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
      return res.status(400).json({ success: false, error: 'Invite already pending for this user' });
    }

    const invite = new HubInvite({
      hubId: req.params.hubId,
      inviterInternalId: req.internalId,
      inviteeInternalId: targetUser.internalId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await invite.save();

    const { createNotification } = require('../../../utils/notificationHelper');
    createNotification({
      userInternalId: targetUser.internalId,
      type: 'hub_invite',
      fromUserId: req.internalId,
      fromUsername: req.user?.username,
      hubId: hub.hubId,
      message: `${req.user?.username || 'Someone'} invited you to join ${hub.name}.`
    });

    res.json({ success: true, message: 'Invite sent' });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invite' });
  }
});

// POST /hubs/:hubId/request-join - Request to join hub
router.post('/:hubId/request-join', requireAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    if (hub.joinPolicy === 'invite_only' || hub.visibility === 'private') {
      return res.status(403).json({ success: false, error: 'This hub is invite only' });
    }

    if (hub.members.some(m => m.userInternalId === req.internalId && m.isActive !== false)) {
      return res.status(400).json({ success: false, error: 'Already a member' });
    }

    const activeMembers = hub.members.filter(m => m.isActive !== false).length;
    if (hub.maxMembers && activeMembers >= hub.maxMembers) {
      return res.status(400).json({ success: false, error: 'Hub is at maximum capacity' });
    }

    const existing = await HubJoinRequest.findOne({
      hubId: req.params.hubId,
      userInternalId: req.internalId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Request already pending' });
    }

    if (hub.joinPolicy === 'open') {
      hub.members.push({
        userInternalId: req.internalId,
        role: 'member',
        joinedAt: new Date(),
        contributionCount: 0,
        isActive: true
      });
      hub.lastActivityAt = new Date();
      await hub.save();
      return res.json({ success: true, message: 'Joined hub successfully', autoApproved: true });
    }

    const joinRequest = new HubJoinRequest({
      hubId: req.params.hubId,
      userInternalId: req.internalId
    });

    await joinRequest.save();

    const { notifyHubStaff } = require('../../../utils/notificationHelper');
    notifyHubStaff(hub, {
      type: 'hub_join_request',
      fromUserId: req.internalId,
      fromUsername: req.user?.username,
      hubId: hub.hubId,
      message: `${req.user?.username || 'Someone'} asked to join ${hub.name}.`
    });

    res.json({ success: true, message: 'Join request submitted' });
  } catch (error) {
    console.error('Join request error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit join request' });
  }
});

// POST /hubs/:hubId/leave - Leave hub
router.post('/:hubId/leave', requireAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const memberIndex = hub.members.findIndex(m => m.userInternalId === req.internalId);
    if (memberIndex === -1) {
      return res.status(400).json({ success: false, error: 'Not a member' });
    }

    if (hub.members[memberIndex].role === 'creator') {
      return res.status(400).json({ success: false, error: 'Creator cannot leave hub' });
    }

    hub.members.splice(memberIndex, 1);
    await hub.save();

    res.json({ success: true, message: 'Left hub' });
  } catch (error) {
    console.error('Leave hub error:', error);
    res.status(500).json({ success: false, error: 'Failed to leave hub' });
  }
});

// POST /hubs/:hubId/remove-member - Remove member from hub
router.post('/:hubId/remove-member', requireAuth, async (req, res) => {
  try {
    const { userInternalId } = req.body;
    if (!userInternalId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member || (member.role !== 'creator' && member.role !== 'moderator')) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const memberIndex = hub.members.findIndex(m => m.userInternalId === userInternalId);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const target = hub.members[memberIndex];
    if (target.role === 'creator') {
      return res.status(400).json({ success: false, error: 'Cannot remove the hub creator' });
    }
    if (target.role === 'moderator' && member.role !== 'creator') {
      return res.status(403).json({ success: false, error: 'Only the creator can remove moderators' });
    }

    hub.members.splice(memberIndex, 1);
    await hub.save();

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
});

// POST /hubs/:hubId/update-role - Update member role
router.post('/:hubId/update-role', requireAuth, async (req, res) => {
  try {
    const { userInternalId, newRole } = req.body;
    if (!userInternalId || !newRole) {
      return res.status(400).json({ success: false, error: 'User ID and role required' });
    }

    // SECURITY FIX: Validate role against allowed values
    const validRoles = ['member', 'moderator'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role. Must be: member or moderator' });
    }

    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId && m.isActive !== false);
    if (!member || member.role !== 'creator') {
      return res.status(403).json({ success: false, error: 'Only creator can change roles' });
    }

    const targetMember = hub.members.find(m => m.userInternalId === userInternalId && m.isActive !== false);
    if (!targetMember) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    if (targetMember.role === 'creator') {
      return res.status(400).json({ success: false, error: 'Cannot change the creator role' });
    }

    targetMember.role = newRole;
    await hub.save();

    const { createNotification } = require('../../../utils/notificationHelper');
    createNotification({
      userInternalId: userInternalId,
      type: 'hub_role',
      fromUserId: req.internalId,
      fromUsername: req.user?.username,
      hubId: hub.hubId,
      message: newRole === 'moderator'
        ? `You're now a moderator of ${hub.name}.`
        : `Your role in ${hub.name} is now member.`
    });

    res.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// GET /hubs/:hubId/members - Get hub members
router.get('/:hubId/members', optionalAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const requester = req.internalId
      ? hub.members.find(m => m.userInternalId === req.internalId && m.isActive !== false)
      : null;
    if (hub.visibility === 'private' && !requester) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const members = await Promise.all(hub.members.map(async (m) => {
      const user = await User.findOne({ internalId: m.userInternalId });
      return {
        userInternalId: m.userInternalId,
        username: user?.username || 'Unknown',
        role: m.role,
        joinedAt: m.joinedAt,
        contributionCount: m.contributionCount,
        isActive: m.isActive
      };
    }));

    res.json({ success: true, members });
  } catch (error) {
    console.error('Members fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
});

// GET /hubs/:hubId/pending-requests - Get pending join requests
router.get('/:hubId/pending-requests', requireAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member || (member.role !== 'creator' && member.role !== 'moderator')) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const requests = await HubJoinRequest.find({ hubId: req.params.hubId, status: 'pending' });

    const enriched = await Promise.all(requests.map(async (r) => {
      const user = await User.findOne({ internalId: r.userInternalId });
      return {
        _id: r._id,
        user: {
          username: user?.username,
          internalId: user?.internalId
        },
        username: user?.username || 'Unknown',
        createdAt: r.createdAt,
        requestedAt: r.createdAt
      };
    }));

    res.json({ success: true, requests: enriched });
  } catch (error) {
    console.error('Pending requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// POST /hubs/:hubId/requests/:requestId - Approve or reject a join request
router.post('/:hubId/requests/:requestId', requireAuth, async (req, res) => {
  try {
    const { hubId, requestId } = req.params;
    const { approve } = req.body;

    if (typeof approve !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Approve parameter must be boolean' });
    }

    const hub = await CollaborativeHub.findOne({ hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member || (member.role !== 'creator' && member.role !== 'moderator')) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const request = await HubJoinRequest.findById(requestId);
    if (!request || request.hubId !== hubId) {
      return res.status(404).json({ success: false, error: 'Join request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Request has already been processed' });
    }

    if (approve) {
      if (hub.members.length >= hub.maxMembers) {
        return res.status(400).json({ success: false, error: 'Hub is at maximum capacity' });
      }

      if (hub.members.some(m => m.userInternalId === request.userInternalId)) {
        return res.status(400).json({ success: false, error: 'User is already a member' });
      }

      hub.members.push({
        userInternalId: request.userInternalId,
        role: 'member',
        joinedAt: new Date(),
        contributionCount: 0,
        isActive: true
      });
    }

    request.status = approve ? 'approved' : 'rejected';
    request.reviewedBy = req.internalId;
    request.reviewedAt = new Date();
    if (!approve) {
      request.rejectionReason = req.body.reason || '';
    }

    await hub.save();
    await request.save();

    const { createNotification } = require('../../../utils/notificationHelper');
    createNotification({
      userInternalId: request.userInternalId,
      type: approve ? 'hub_approved' : 'hub_rejected',
      fromUserId: req.internalId,
      fromUsername: req.user?.username,
      hubId: hub.hubId,
      message: approve
        ? `You've been approved to join ${hub.name}.`
        : `Your request to join ${hub.name} was declined.`
    });

    res.json({ success: true, message: approve ? 'Join request approved' : 'Join request rejected' });
  } catch (error) {
    console.error('Process request error:', error);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// POST /hubs/:hubId/seen - Mark hub as visited (clears chat/activity cues)
router.post('/:hubId/seen', requireAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }
    const member = hub.members.find(m => m.userInternalId === req.internalId && m.isActive !== false);
    if (!member) {
      return res.status(403).json({ success: false, error: 'Not a member' });
    }
    member.lastSeenAt = new Date();
    await hub.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Hub seen error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark hub seen' });
  }
});

module.exports = router;
