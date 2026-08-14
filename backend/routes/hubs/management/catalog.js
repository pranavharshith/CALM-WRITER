const {
  express, CollaborativeHub, HubInvite, HubJoinRequest, User, Story,
  requireAuth, optionalAuth, getPaginationParams, getPaginationMeta, crypto,
} = require('./_shared');

const router = express.Router();

// POST /hubs/create - Create hub
router.post('/create', requireAuth, async (req, res) => {
  try {
    const actor = await User.findOne({ internalId: req.internalId });
    if (!actor) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (actor.role !== 'admin' && !actor.canCreateHubs) {
      return res.status(403).json({ success: false, error: 'Hub creator approval required' });
    }

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
      tags: req.body.tags || [],
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

    let query = { archived: false, locked: false, visibility: 'public' };
    if (typeof theme === 'string' && theme) query.theme = theme;

    const total = await CollaborativeHub.countDocuments(query);
    const hubs = await CollaborativeHub.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('hubId name description theme tags visibility members totalStories lastActivityAt');

    const enriched = hubs.map(h => ({
      _id: h._id,
      hubId: h.hubId,
      name: h.name,
      description: h.description,
      theme: h.theme,
      tags: h.tags || [],
      visibility: h.visibility,
      memberCount: h.members.length,
      totalStories: h.totalStories || 0,
      lastActivityAt: h.lastActivityAt
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
    })
      .select('hubId name description theme tags visibility members totalStories lastActivityAt lastChatMessageAt')
      .sort({ lastActivityAt: -1 });

    const staffHubIds = [];
    const previews = hubs.map(h => {
      const membership = h.members.find(m => m.userInternalId === req.internalId);
      const role = membership?.role || 'member';
      if (role === 'creator' || role === 'moderator') staffHubIds.push(h.hubId);
      const unreadChat = !!(h.lastChatMessageAt && membership
        && (!membership.lastSeenAt || h.lastChatMessageAt > membership.lastSeenAt));
      return { h, membership, role, unreadChat };
    });

    const requestCounts = {};
    if (staffHubIds.length) {
      const grouped = await HubJoinRequest.aggregate([
        { $match: { hubId: { $in: staffHubIds }, status: 'pending' } },
        { $group: { _id: '$hubId', n: { $sum: 1 } } }
      ]);
      for (const row of grouped) requestCounts[row._id] = row.n;
    }

    const enriched = previews.map(({ h, membership, role, unreadChat }) => ({
      _id: h._id,
      hubId: h.hubId,
      name: h.name,
      description: h.description || '',
      theme: h.theme,
      tags: h.tags || [],
      visibility: h.visibility,
      memberCount: h.members.length,
      totalStories: h.totalStories || 0,
      lastActivityAt: h.lastActivityAt,
      role,
      joinedAt: membership?.joinedAt,
      pendingRequestCount: requestCounts[h.hubId] || 0,
      unreadChat
    }));

    res.json({ success: true, hubs: enriched });
  } catch (error) {
    console.error('My hubs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hubs' });
  }
});

// GET /hubs/cues - Lightweight attention counts for nav badges
router.get('/cues', requireAuth, async (req, res) => {
  try {
    const [inviteCount, myHubs] = await Promise.all([
      HubInvite.countDocuments({
        inviteeInternalId: req.internalId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }),
      CollaborativeHub.find({
        'members.userInternalId': req.internalId,
        archived: false
      }).select('hubId members lastChatMessageAt')
    ]);

    const staffHubIds = [];
    let unreadChat = 0;
    for (const h of myHubs) {
      const me = h.members.find(m => m.userInternalId === req.internalId && m.isActive !== false);
      if (!me) continue;
      if (h.lastChatMessageAt && (!me.lastSeenAt || h.lastChatMessageAt > me.lastSeenAt)) {
        unreadChat += 1;
      }
      if (me.role === 'creator' || me.role === 'moderator') staffHubIds.push(h.hubId);
    }

    const requestCount = staffHubIds.length
      ? await HubJoinRequest.countDocuments({ hubId: { $in: staffHubIds }, status: 'pending' })
      : 0;

    res.json({
      success: true,
      inviteCount,
      requestCount,
      unreadChat,
      attention: inviteCount + requestCount + unreadChat
    });
  } catch (error) {
    console.error('Hub cues error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hub cues' });
  }
});

// GET /hubs/check-eligibility - Check if user can create a hub
router.get('/check-eligibility', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const requirements = [
      'Registered account',
      'At least 1 published story'
    ];

    const storyCount = await Story.countDocuments({ internalAuthorId: req.internalId });
    const canCreate = user.role === 'admin' || !!user.canCreateHubs;
    const eligible = canCreate && storyCount >= 1;
    const reason = !canCreate
      ? 'Hub creation is limited. Apply from Hubs or ask an admin.'
      : (storyCount >= 1 ? null : 'You must publish at least one story before creating a hub.');

    res.json({
      success: true,
      eligible,
      reason,
      requirements,
      canCreateHubs: !!user.canCreateHubs,
      role: user.role || 'user'
    });
  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ success: false, error: 'Failed to check eligibility' });
  }
});

// GET /hubs/my-invites - Get pending hub invites for the current user
router.get('/my-invites', requireAuth, async (req, res) => {
  try {
    const invites = await HubInvite.find({
      inviteeInternalId: req.internalId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).lean();

    const hubIds = [...new Set(invites.map(i => i.hubId))];
    const inviterIds = [...new Set(invites.map(i => i.inviterInternalId).filter(Boolean))];
    const [hubs, inviters] = await Promise.all([
      CollaborativeHub.find({ hubId: { $in: hubIds } })
        .select('hubId name theme description')
        .lean(),
      inviterIds.length
        ? User.find({ internalId: { $in: inviterIds } }).select('internalId username').lean()
        : []
    ]);
    const hubMap = Object.fromEntries(hubs.map(h => [h.hubId, h]));
    const inviterMap = Object.fromEntries(inviters.map(u => [u.internalId, u.username]));

    const enriched = invites.map(i => ({
      _id: i._id,
      inviteToken: i.inviteToken,
      hub: {
        hubId: i.hubId,
        name: hubMap[i.hubId]?.name || 'Unknown Hub',
        theme: hubMap[i.hubId]?.theme || 'general',
        description: hubMap[i.hubId]?.description || ''
      },
      inviterUsername: inviterMap[i.inviterInternalId] || null,
      message: i.message || '',
      invitedAt: i.createdAt,
      expiresAt: i.expiresAt
    }));

    res.json({ success: true, invites: enriched });
  } catch (error) {
    console.error('Invites fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invites' });
  }
});

module.exports = router;
