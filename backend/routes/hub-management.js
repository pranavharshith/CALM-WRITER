const express = require('express');
const router = express.Router();
const CollaborativeHub = require('../models/CollaborativeHub');
const HubInvite = require('../models/HubInvite');
const HubJoinRequest = require('../models/HubJoinRequest');
const User = require('../models/User');
const Story = require('../models/Story');
const { requireAuth } = require('../middleware/auth-consolidated');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const crypto = require('crypto');

// POST /hubs/create - Create hub
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { name, description, theme, visibility, joinPolicy, maxMembers } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Hub name required' });
    }

    // Validate hub name length (3-100 characters)
    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Hub name must be between 3 and 100 characters' 
      });
    }

    // Validate visibility
    const validVisibilities = ['public', 'private', 'unlisted'];
    if (visibility && !validVisibilities.includes(visibility)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid visibility. Must be: public, private, or unlisted' 
      });
    }

    // Validate join policy
    const validJoinPolicies = ['open', 'approval', 'invite_only'];
    if (joinPolicy && !validJoinPolicies.includes(joinPolicy)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid join policy. Must be: open, approval, or invite_only' 
      });
    }

    // Validate maxMembers if provided
    if (maxMembers && (maxMembers < 2 || maxMembers > 1000)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Max members must be between 2 and 1000' 
      });
    }

    // Generate unique hub ID
    const hubId = `${name.toLowerCase().replace(/\s+/g, '_')}_${crypto.randomBytes(4).toString('hex')}`;

    const hub = new CollaborativeHub({
      hubId,
      name,
      description,
      theme: theme || 'general',
      visibility: visibility || 'public',
      joinPolicy: joinPolicy || 'approval',
      maxMembers: maxMembers || 100,
      creatorInternalId: req.internalId,
      members: [{
        userInternalId: req.internalId,
        role: 'creator',
        joinedAt: new Date()
      }]
    });

    await hub.save();

    res.json({
      success: true,
      message: 'Hub created successfully',
      hub: {
        _id: hub._id,
        hubId: hub.hubId,
        name: hub.name,
        theme: hub.theme
      }
    });
  } catch (error) {
    console.error('Hub creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create hub' });
  }
});

// GET /hubs - Fetch hubs
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { visibility, theme } = req.query;

    let query = { archived: false, locked: false };
    if (visibility) query.visibility = visibility;
    if (theme) query.theme = theme;

    const total = await CollaborativeHub.countDocuments(query);
    const hubs = await CollaborativeHub.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('hubId name description theme visibility members totalStories');

    const enriched = hubs.map(h => ({
      _id: h._id,
      hubId: h.hubId,
      name: h.name,
      description: h.description,
      theme: h.theme,
      visibility: h.visibility,
      memberCount: h.members.length,
      totalStories: h.totalStories
    }));

    res.json({
      success: true,
      hubs: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Hubs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hubs' });
  }
});

// GET /hubs/my-hubs - Get user's hubs
router.get('/my-hubs', requireAuth, async (req, res) => {
  try {
    const hubs = await CollaborativeHub.find({
      'members.userInternalId': req.internalId,
      archived: false
    }).select('hubId name theme members');

    const enriched = hubs.map(h => ({
      _id: h._id,
      hubId: h.hubId,
      name: h.name,
      theme: h.theme,
      memberCount: h.members.length,
      role: h.members.find(m => m.userInternalId === req.internalId)?.role
    }));

    res.json({ success: true, hubs: enriched });
  } catch (error) {
    console.error('My hubs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hubs' });
  }
});

// GET /hubs/:hubId - Get hub details
router.get('/:hubId', async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const creator = await User.findOne({ internalId: hub.creatorInternalId });

    res.json({
      success: true,
      hub: {
        _id: hub._id,
        hubId: hub.hubId,
        name: hub.name,
        description: hub.description,
        theme: hub.theme,
        visibility: hub.visibility,
        joinPolicy: hub.joinPolicy,
        creator: creator?.username,
        memberCount: hub.members.length,
        maxMembers: hub.maxMembers,
        totalStories: hub.totalStories,
        chatEnabled: hub.chatEnabled,
        createdAt: hub.createdAt
      }
    });
  } catch (error) {
    console.error('Hub details error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hub' });
  }
});

// PATCH /hubs/:hubId/update - Update hub settings
router.patch('/:hubId/update', requireAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member || (member.role !== 'creator' && member.role !== 'moderator')) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { description, visibility, joinPolicy, wordLimitPerContribution, chatEnabled } = req.body;

    if (description !== undefined) hub.description = description;
    if (visibility !== undefined) hub.visibility = visibility;
    if (joinPolicy !== undefined) hub.joinPolicy = joinPolicy;
    if (wordLimitPerContribution !== undefined) {
      if (wordLimitPerContribution < 100 || wordLimitPerContribution > 2000) {
        return res.status(400).json({ success: false, error: 'Word limit must be 100-2000' });
      }
      hub.wordLimitPerContribution = wordLimitPerContribution;
    }
    if (chatEnabled !== undefined) hub.chatEnabled = chatEnabled;

    await hub.save();

    res.json({ success: true, message: 'Hub updated', hub: { hubId: hub.hubId, name: hub.name } });
  } catch (error) {
    console.error('Hub update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update hub' });
  }
});

// DELETE /hubs/:hubId - Delete hub
router.delete('/:hubId', requireAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    if (hub.creatorInternalId !== req.internalId) {
      return res.status(403).json({ success: false, error: 'Only creator can delete hub' });
    }

    hub.archived = true;
    hub.archivedAt = new Date();
    await hub.save();

    res.json({ success: true, message: 'Hub archived' });
  } catch (error) {
    console.error('Hub deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete hub' });
  }
});

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

    const targetUser = await User.findOne({ username: username.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already member
    if (hub.members.some(m => m.userInternalId === targetUser.internalId)) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }

    // SECURITY FIX: Check for duplicate pending invites
    const existingInvite = await HubInvite.findOne({
      hubId: hub._id,
      invitedUserInternalId: targetUser.internalId,
      status: 'pending'
    });

    if (existingInvite) {
      return res.status(400).json({ success: false, error: 'Invite already pending for this user' });
    }

    const invite = new HubInvite({
      hubId: hub._id,
      invitedUserInternalId: targetUser.internalId,
      invitedBy: req.internalId
    });

    await invite.save();

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

    if (hub.members.some(m => m.userInternalId === req.internalId)) {
      return res.status(400).json({ success: false, error: 'Already a member' });
    }

    const existing = await HubJoinRequest.findOne({
      hubId: hub._id,
      userInternalId: req.internalId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Request already pending' });
    }

    const joinRequest = new HubJoinRequest({
      hubId: hub._id,
      userInternalId: req.internalId
    });

    await joinRequest.save();

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

    const member = hub.members.find(m => m.userInternalId === req.internalId);
    if (!member || member.role !== 'creator') {
      return res.status(403).json({ success: false, error: 'Only creator can change roles' });
    }

    const targetMember = hub.members.find(m => m.userInternalId === userInternalId);
    if (!targetMember) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    targetMember.role = newRole;
    await hub.save();

    res.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// GET /hubs/my-invites - Get hub invites for user
router.get('/my-invites', requireAuth, async (req, res) => {
  try {
    const invites = await HubInvite.find({ invitedUserInternalId: req.internalId, status: 'pending' })
      .populate('hubId', 'hubId name theme');

    const enriched = invites.map(i => ({
      _id: i._id,
      hub: {
        _id: i.hubId._id,
        hubId: i.hubId.hubId,
        name: i.hubId.name,
        theme: i.hubId.theme
      },
      invitedAt: i.createdAt
    }));

    res.json({ success: true, invites: enriched });
  } catch (error) {
    console.error('Invites fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invites' });
  }
});

// GET /hubs/:hubId/members - Get hub members
router.get('/:hubId/members', async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const members = await Promise.all(hub.members.map(async (m) => {
      const user = await User.findOne({ internalId: m.userInternalId });
      return {
        username: user?.username,
        role: m.role,
        joinedAt: m.joinedAt,
        contributionCount: m.contributionCount
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

    const requests = await HubJoinRequest.find({ hubId: hub._id, status: 'pending' });

    const enriched = await Promise.all(requests.map(async (r) => {
      const user = await User.findOne({ internalId: r.userInternalId });
      return {
        _id: r._id,
        user: {
          username: user?.username,
          internalId: user?.internalId
        },
        requestedAt: r.createdAt
      };
    }));

    res.json({ success: true, requests: enriched });
  } catch (error) {
    console.error('Pending requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

module.exports = router;
