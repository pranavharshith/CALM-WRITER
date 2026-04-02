const express = require('express');
const router = express.Router();
const CollaborativeHub = require('../models/CollaborativeHub');
const HubInvite = require('../models/HubInvite');
const HubJoinRequest = require('../models/HubJoinRequest');
const HubChat = require('../models/HubChat');
const HubCreatorApplication = require('../models/HubCreatorApplication');
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { requireAuth } = require('../middleware/auth-consolidated');
const { requireAdmin } = require('../middleware/adminAuth');

// Helper: Check if user meets hub creation eligibility
async function checkHubCreationEligibility(userInternalId) {
    const user = await User.findOne({ internalId: userInternalId });
    if (!user) {
        return { canCreate: false, reasons: [], missingRequirements: ['User not found'] };
    }

    const reasons = [];
    const missingRequirements = [];

    // Check 1: Trust-based criteria
    const isTrusted = ['trusted_user', 'moderator', 'admin'].includes(user.role);
    const accountAge = Math.floor((Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24));
    const hasNoRecentIssues = !user.timeoutUntil || user.timeoutUntil < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Get user's story stats
    const stories = await Story.find({ internalAuthorId: userInternalId });
    const totalStories = stories.length;
    const totalLikes = stories.reduce((sum, story) => sum + story.likes, 0);
    const avgLikes = totalStories > 0 ? totalLikes / totalStories : 0;

    const trustBasedPass = isTrusted && totalStories >= 15 && avgLikes >= 10 && accountAge >= 30 && hasNoRecentIssues;

    if (trustBasedPass) {
        reasons.push('Trust-based: Trusted user with quality content history');
    } else {
        if (!isTrusted) missingRequirements.push('Need trusted_user/moderator/admin role');
        if (totalStories < 15) missingRequirements.push(`Need 15 stories (have ${totalStories})`);
        if (avgLikes < 10) missingRequirements.push(`Need average 10+ likes per story (have ${avgLikes.toFixed(1)})`);
        if (accountAge < 30) missingRequirements.push(`Need account age ≥30 days (have ${accountAge})`);
        if (!hasNoRecentIssues) missingRequirements.push('Active timeout or recent strikes');
    }

    // Check 2: Engagement-based criteria
    const followerCount = await Follow.countDocuments({ followedUsername: user.username });
    const threadParticipations = await StoryNode.countDocuments({ authorInternalId: userInternalId });

    const engagementBasedPass = followerCount >= 50 && threadParticipations >= 10 && totalLikes >= 100;

    if (engagementBasedPass) {
        reasons.push('Engagement-based: High community engagement');
    } else if (!trustBasedPass) {
        if (followerCount < 50) missingRequirements.push(`Need 50 followers (have ${followerCount})`);
        if (threadParticipations < 10) missingRequirements.push(`Need 10 thread participations (have ${threadParticipations})`);
        if (totalLikes < 100) missingRequirements.push(`Need 100 total likes (have ${totalLikes})`);
    }

    // Check 3: Application-based (approved application)
    const approvedApplication = await HubCreatorApplication.findOne({
        userInternalId,
        status: 'approved'
    });

    if (approvedApplication) {
        reasons.push('Application-approved: Admin granted hub creator status');
    }

    const canCreate = trustBasedPass || engagementBasedPass || !!approvedApplication;

    return {
        canCreate,
        reasons,
        missingRequirements: canCreate ? [] : missingRequirements,
        userStats: {
            role: user.role,
            totalStories,
            totalLikes,
            avgLikes: avgLikes.toFixed(1),
            followerCount,
            threadParticipations,
            accountAge
        }
    };
}

// Helper: Generate unique hubId from name
function generateHubId(name, creatorUsername) {
    const cleanName = name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${cleanName}_${randomSuffix}`;
}

// Helper: Check if user is hub member
function isHubMember(hub, userInternalId) {
    return hub.members.some(m => m.userInternalId === userInternalId && m.isActive);
}

// Helper: Check if user is hub creator or moderator
function isHubModerator(hub, userInternalId) {
    const member = hub.members.find(m => m.userInternalId === userInternalId && m.isActive);
    return member && (member.role === 'creator' || member.role === 'moderator');
}

// GET /hubs/check-eligibility - Check if user can create hubs
router.get('/check-eligibility', requireAuth, async (req, res) => {
    try {
        const eligibility = await checkHubCreationEligibility(req.internalId);
        res.json(eligibility);
    } catch (error) {
        console.error('Check eligibility error:', error);
        res.status(500).json({ error: 'Failed to check eligibility' });
    }
});

// POST /hubs/create - Create new collaborative hub
router.post('/create', requireAuth, async (req, res) => {
    try {
        const { name, description, theme, tags, visibility, joinPolicy, maxMembers } = req.body;

        // Validation
        if (!name || name.length < 3 || name.length > 50) {
            return res.status(400).json({ error: 'Hub name must be 3-50 characters' });
        }

        // Validate description length
        if (description && description.length > 500) {
            return res.status(400).json({ error: 'Hub description cannot exceed 500 characters' });
        }

        // Validate tags
        if (tags && Array.isArray(tags)) {
            if (tags.length > 10) {
                return res.status(400).json({ error: 'Maximum 10 tags allowed' });
            }
            for (const tag of tags) {
                if (typeof tag !== 'string' || tag.length < 2 || tag.length > 30) {
                    return res.status(400).json({ error: 'Each tag must be 2-30 characters' });
                }
            }
        }

        // Check eligibility
        const eligibility = await checkHubCreationEligibility(req.internalId);
        if (!eligibility.canCreate) {
            return res.status(403).json({
                error: 'You do not meet the requirements to create a hub',
                missingRequirements: eligibility.missingRequirements
            });
        }

        // Check hub creation limits (max 3 active hubs per user)
        const existingHubs = await CollaborativeHub.countDocuments({
            creatorInternalId: req.internalId,
            archived: false
        });

        if (existingHubs >= 3) {
            return res.status(400).json({ error: 'Maximum 3 active hubs per user. Archive an existing hub first.' });
        }

        // Get user for username
        const user = await User.findOne({ internalId: req.internalId });

        // Generate unique hubId
        const hubId = generateHubId(name, user.username);

        // Create hub
        const hub = new CollaborativeHub({
            hubId,
            name,
            description: description || '',
            creatorInternalId: req.internalId,
            theme: theme || 'general',
            tags: tags || [],
            visibility: visibility || 'public',
            joinPolicy: joinPolicy || 'approval',
            maxMembers: Math.min(maxMembers || 50, 200),
            members: [{
                userInternalId: req.internalId,
                role: 'creator',
                joinedAt: new Date()
            }]
        });

        await hub.save();

        res.json({
            success: true,
            hub: {
                hubId: hub.hubId,
                name: hub.name,
                description: hub.description,
                theme: hub.theme,
                memberCount: 1
            }
        });
    } catch (error) {
        console.error('Create hub error:', error);
        res.status(500).json({ error: 'Failed to create hub' });
    }
});

// GET /hubs - Get discoverable hubs
router.get('/', requireAuth, async (req, res) => {
    try {
        const { visibility, theme, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const filter = { archived: false, locked: false };

        if (visibility === 'public') {
            filter.visibility = 'public';
        } else {
            // Show public and unlisted hubs
            filter.visibility = { $in: ['public', 'unlisted'] };
        }

        if (theme && theme !== 'all') {
            filter.theme = theme;
        }

        const hubs = await CollaborativeHub.find(filter)
            .sort({ lastActivityAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await CollaborativeHub.countDocuments(filter);

        res.json({
            hubs: hubs.map(hub => ({
                hubId: hub.hubId,
                name: hub.name,
                description: hub.description,
                theme: hub.theme,
                tags: hub.tags,
                visibility: hub.visibility,
                joinPolicy: hub.joinPolicy,
                memberCount: hub.members.filter(m => m.isActive).length,
                maxMembers: hub.maxMembers,
                totalStories: hub.totalStories,
                lastActivityAt: hub.lastActivityAt,
                createdAt: hub.createdAt
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalHubs: total
            }
        });
    } catch (error) {
        console.error('Get hubs error:', error);
        res.status(500).json({ error: 'Failed to fetch hubs' });
    }
});

// GET /hubs/my-hubs - Get user's hubs
router.get('/my-hubs', requireAuth, async (req, res) => {
    try {
        const hubs = await CollaborativeHub.find({
            'members.userInternalId': req.internalId,
            'members.isActive': true,
            archived: false
        }).sort({ lastActivityAt: -1 }).lean();

        res.json({
            hubs: hubs.map(hub => {
                const member = hub.members.find(m => m.userInternalId === req.internalId);
                return {
                    hubId: hub.hubId,
                    name: hub.name,
                    description: hub.description,
                    theme: hub.theme,
                    memberCount: hub.members.filter(m => m.isActive).length,
                    yourRole: member.role,
                    totalStories: hub.totalStories,
                    lastActivityAt: hub.lastActivityAt
                };
            })
        });
    } catch (error) {
        console.error('Get my hubs error:', error);
        res.status(500).json({ error: 'Failed to fetch your hubs' });
    }
});

// GET /hubs/:hubId - Get hub details
router.get('/:hubId', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const hub = await CollaborativeHub.findOne({ hubId }).lean();

        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check access: public hubs or member-only for private hubs
        if (hub.visibility === 'private' && !isHubMember(hub, req.internalId)) {
            return res.status(403).json({ error: 'This hub is private' });
        }

        // Get member usernames
        const memberIds = hub.members.filter(m => m.isActive).map(m => m.userInternalId);
        const users = await User.find({ internalId: { $in: memberIds } }).select('internalId username displayName').lean();
        const userMap = Object.fromEntries(users.map(u => [u.internalId, u]));

        const isMember = isHubMember(hub, req.internalId);
        const isModerator = isHubModerator(hub, req.internalId);

        res.json({
            hub: {
                hubId: hub.hubId,
                name: hub.name,
                description: hub.description,
                theme: hub.theme,
                tags: hub.tags,
                visibility: hub.visibility,
                joinPolicy: hub.joinPolicy,
                maxMembers: hub.maxMembers,
                totalStories: hub.totalStories,
                totalNodes: hub.totalNodes,
                totalLikes: hub.totalLikes,
                lastActivityAt: hub.lastActivityAt,
                createdAt: hub.createdAt,
                chatEnabled: hub.chatEnabled,
                allowThreads: hub.allowThreads,
                requireApproval: hub.requireApproval,
                wordLimitPerContribution: hub.wordLimitPerContribution,
                members: hub.members.filter(m => m.isActive).map(m => ({
                    userInternalId: m.userInternalId,
                    username: userMap[m.userInternalId]?.username,
                    displayName: userMap[m.userInternalId]?.displayName,
                    role: m.role,
                    joinedAt: m.joinedAt,
                    contributionCount: m.contributionCount
                })),
                isMember,
                isModerator
            }
        });
    } catch (error) {
        console.error('Get hub details error:', error);
        res.status(500).json({ error: 'Failed to fetch hub details' });
    }
});

// PATCH /hubs/:hubId - Update hub settings
router.patch('/:hubId', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { description, tags, joinPolicy, maxMembers, chatEnabled, requireApproval, wordLimitPerContribution } = req.body;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub creator/moderators can update settings' });
        }

        // Update fields
        if (description !== undefined) hub.description = description;
        if (tags !== undefined) hub.tags = tags;
        if (joinPolicy !== undefined) hub.joinPolicy = joinPolicy;
        if (maxMembers !== undefined) hub.maxMembers = Math.min(maxMembers, 200);
        if (chatEnabled !== undefined) hub.chatEnabled = chatEnabled;
        if (requireApproval !== undefined) hub.requireApproval = requireApproval;
        if (wordLimitPerContribution !== undefined) hub.wordLimitPerContribution = wordLimitPerContribution;

        hub.updatedAt = new Date();
        await hub.save();

        res.json({ success: true, message: 'Hub settings updated' });
    } catch (error) {
        console.error('Update hub error:', error);
        res.status(500).json({ error: 'Failed to update hub' });
    }
});

// DELETE /hubs/:hubId/archive - Archive hub
router.delete('/:hubId/archive', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const hub = await CollaborativeHub.findOne({ hubId });

        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Only creator can archive
        const member = hub.members.find(m => m.userInternalId === req.internalId);
        if (!member || member.role !== 'creator') {
            return res.status(403).json({ error: 'Only the hub creator can archive' });
        }

        hub.archived = true;
        hub.archivedAt = new Date();
        await hub.save();

        res.json({ success: true, message: 'Hub archived successfully' });
    } catch (error) {
        console.error('Archive hub error:', error);
        res.status(500).json({ error: 'Failed to archive hub' });
    }
});

module.exports = router;
