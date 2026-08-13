const {
  express, CollaborativeHub, HubInvite, HubJoinRequest, User, Story,
  requireAuth, optionalAuth, getPaginationParams, getPaginationMeta, crypto,
} = require('./_shared');

const router = express.Router();

// GET /hubs/:hubId - Get hub details
router.get('/:hubId', optionalAuth, async (req, res) => {
  try {
    const hub = await CollaborativeHub.findOne({ hubId: req.params.hubId });
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const creator = await User.findOne({ internalId: hub.creatorInternalId });

    const memberUserIds = hub.members.map(m => m.userInternalId);
    const memberUsers = await User.find({ internalId: { $in: memberUserIds } })
      .select('internalId username displayName')
      .lean();
    const memberUserMap = Object.fromEntries(memberUsers.map(u => [u.internalId, u]));

    const members = hub.members.map(m => ({
      userInternalId: m.userInternalId,
      username: memberUserMap[m.userInternalId]?.username || 'Unknown',
      displayName: memberUserMap[m.userInternalId]?.displayName || null,
      role: m.role,
      joinedAt: m.joinedAt,
      contributionCount: m.contributionCount,
      isActive: m.isActive
    }));

    const currentMember = req.internalId ? hub.members.find(m => m.userInternalId === req.internalId) : null;
    const isMember = !!(currentMember && currentMember.isActive);
    const isModerator = !!(currentMember && (currentMember.role === 'creator' || currentMember.role === 'moderator') && currentMember.isActive);

    if (hub.visibility === 'private' && !isMember) {
      return res.status(404).json({ success: false, error: 'Hub not found' });
    }

    const storyList = await Story.find({
      hubId: req.params.hubId,
      hubApprovalStatus: 'approved'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const storyAuthorIds = [...new Set(storyList.map(s => s.internalAuthorId))];
    const storyAuthorUsers = await User.find({ internalId: { $in: storyAuthorIds } })
      .select('internalId username displayName')
      .lean();
    const storyAuthorMap = Object.fromEntries(storyAuthorUsers.map(u => [u.internalId, u]));

    const stories = storyList.map(s => ({
      _id: s._id,
      title: s.title,
      text: isMember || hub.visibility === 'public' ? s.text : undefined,
      preview: (s.text || '').substring(0, 200),
      wordCount: s.wordCount,
      likes: s.likes,
      isLikedByUser: req.internalId ? (s.likedBy || []).includes(req.internalId) : false,
      authorUsername: storyAuthorMap[s.internalAuthorId]?.username || 'Anonymous',
      authorDisplayName: storyAuthorMap[s.internalAuthorId]?.displayName || 'Anonymous',
      createdAt: s.createdAt
    }));

    res.json({
      success: true,
      hub: {
        _id: hub._id,
        hubId: hub.hubId,
        name: hub.name,
        description: hub.description,
        theme: hub.theme,
        tags: hub.tags || [],
        visibility: hub.visibility,
        joinPolicy: hub.joinPolicy,
        creator: creator?.username || 'Anonymous',
        creatorInternalId: hub.creatorInternalId,
        memberCount: hub.members.length,
        maxMembers: hub.maxMembers,
        totalStories: hub.totalStories,
        chatEnabled: hub.chatEnabled,
        requireApproval: hub.requireApproval,
        wordLimitPerContribution: hub.wordLimitPerContribution,
        allowThreads: hub.allowThreads,
        isMember,
        isModerator,
        createdAt: hub.createdAt
      },
      members,
      stories
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

module.exports = router;
