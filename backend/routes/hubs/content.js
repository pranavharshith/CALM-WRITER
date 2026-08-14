const express = require('express');
const router = express.Router();
const CollaborativeHub = require('../../models/CollaborativeHub');
const Story = require('../../models/Story');
const StoryNode = require('../../models/StoryNode');
const User = require('../../models/User');
const { requireAuth, optionalAuth } = require('../../middleware/auth');

// Helper: Check if user is hub member
function isHubMember(hub, userInternalId) {
    return hub.members.some(m => m.userInternalId === userInternalId && m.isActive !== false);
}

// Helper: Check if user is hub creator or moderator
function isHubModerator(hub, userInternalId) {
    const member = hub.members.find(m => m.userInternalId === userInternalId && m.isActive !== false);
    return member && (member.role === 'creator' || member.role === 'moderator');
}

// POST /hubs/:hubId/stories/submit - Submit story to hub
async function handleHubStorySubmit(req, res) {
    try {
        const { hubId } = req.params;
        const { title, text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Story text is required' });
        }

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check if user is a member
        const member = hub.members.find(m => m.userInternalId === req.internalId && m.isActive !== false);
        if (!member) {
            return res.status(403).json({ error: 'You must be a member to submit stories' });
        }

        // Check cooldown
        if (member.lastContributionAt) {
            const timeSinceLastContribution = Date.now() - new Date(member.lastContributionAt).getTime();
            if (timeSinceLastContribution < hub.cooldownBetweenContributions) {
                const remainingMs = hub.cooldownBetweenContributions - timeSinceLastContribution;
                const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
                return res.status(429).json({
                    error: `Cooldown active. Please wait ${remainingMinutes} minutes before your next contribution.`
                });
            }
        }

        // Check word limit
        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount > hub.wordLimitPerContribution) {
            return res.status(400).json({
                error: `Story exceeds hub word limit of ${hub.wordLimitPerContribution} words (you have ${wordCount})`
            });
        }

        // Create story
        const story = new Story({
            internalAuthorId: req.internalId,
            title: title || text.split('\n')[0].substring(0, 50),
            text,
            wordCount,
            hubId,
            isHubCollaborative: true,
            hubContributors: [req.internalId],
            hubApprovalStatus: hub.requireApproval ? 'pending' : 'approved'
        });

        await story.save();

        if (!hub.requireApproval) {
            try {
                const { afterPublishedStory } = require('../../utils/writingDay');
                await afterPublishedStory(req.internalId, story.wordCount, story.createdAt);
            } catch (err) {
                console.error('WritingDay record error:', err.message);
            }
        }

        // Update hub stats (only if approved)
        if (!hub.requireApproval) {
            hub.totalStories += 1;
            hub.lastActivityAt = new Date();
            hub.rootStories.push(story._id);
        }

        // Update member contribution count
        member.contributionCount += 1;
        member.lastContributionAt = new Date();

        await hub.save();

        if (!hub.requireApproval) {
            const { notifyHubMembers } = require('../../utils/notificationHelper');
            notifyHubMembers(hub, {
                type: 'hub_story',
                fromUserId: req.internalId,
                fromUsername: req.user?.username,
                hubId,
                storyId: String(story._id),
                storyTitle: story.title,
                message: `${req.user?.username || 'Someone'} posted “${story.title}” in ${hub.name}.`
            }, { exclude: [req.internalId] });
        }

        res.json({
            success: true,
            story: {
                _id: story._id,
                title: story.title,
                wordCount: story.wordCount,
                approvalStatus: story.hubApprovalStatus
            },
            message: hub.requireApproval ? 'Story submitted for approval' : 'Story published to hub'
        });
    } catch (error) {
        console.error('Submit hub story error:', error);
        res.status(500).json({ error: 'Failed to submit story' });
    }
}

router.post('/:hubId/stories/submit', requireAuth, handleHubStorySubmit);
router.post('/:hubId/stories', requireAuth, handleHubStorySubmit);

// GET /hubs/:hubId/stories - Get hub stories
router.get('/:hubId/stories', optionalAuth, async (req, res) => {
    try {
        const { hubId } = req.params;
        const { page = 1, limit = 10, sort = 'latest' } = req.query;
        const skip = (page - 1) * limit;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check access
        const isMember = isHubMember(hub, req.internalId);
        if (hub.visibility === 'private' && (!req.internalId || !isMember)) {
            return res.status(403).json({ error: 'This hub is private' });
        }

        // Build filter
        const filter = { hubId, hubApprovalStatus: 'approved' };

        // Sort
        let sortQuery = { createdAt: -1 }; // latest
        if (sort === 'likes') sortQuery = { likes: -1, createdAt: -1 };
        if (sort === 'oldest') sortQuery = { createdAt: 1 };

        const stories = await Story.find(filter)
            .sort(sortQuery)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Story.countDocuments(filter);

        // Get author info
        const authorIds = [...new Set(stories.map(s => s.internalAuthorId))];
        const authors = await User.find({ internalId: { $in: authorIds } })
            .select('internalId username displayName')
            .lean();
        const authorMap = Object.fromEntries(authors.map(a => [a.internalId, a]));

        // Add isLikedByUser flag
        const storiesWithMeta = stories.map(story => ({
            ...story,
            author: authorMap[story.internalAuthorId],
            authorUsername: authorMap[story.internalAuthorId]?.username || 'Anonymous',
            authorDisplayName: authorMap[story.internalAuthorId]?.displayName || 'Anonymous',
            isLikedByUser: req.internalId ? (story.likedBy || []).includes(req.internalId) : false,
            preview: (story.text || '').substring(0, 200) + ((story.text || '').length > 200 ? '...' : '')
        }));

        res.json({
            stories: storiesWithMeta,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalStories: total
            }
        });
    } catch (error) {
        console.error('Get hub stories error:', error);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});

// POST /hubs/:hubId/stories/:storyId/approve - Approve pending story
router.post('/:hubId/stories/:storyId/approve', requireAuth, async (req, res) => {
    try {
        const { hubId, storyId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can approve stories' });
        }

        const story = await Story.findById(storyId);
        if (!story || story.hubId !== hubId) {
            return res.status(404).json({ error: 'Story not found' });
        }

        if (story.hubApprovalStatus !== 'pending') {
            return res.status(400).json({ error: 'Story has already been reviewed' });
        }

        // Approve story
        story.hubApprovalStatus = 'approved';
        story.hubApprovedBy = req.internalId;
        await story.save();
        try {
            const { afterPublishedStory } = require('../../utils/writingDay');
            await afterPublishedStory(story.internalAuthorId, story.wordCount, story.createdAt);
        } catch (err) {
            console.error('WritingDay record error:', err.message);
        }

        // Update hub stats
        hub.totalStories += 1;
        hub.lastActivityAt = new Date();
        hub.rootStories.push(story._id);
        await hub.save();

        res.json({ success: true, message: 'Story approved' });
    } catch (error) {
        console.error('Approve story error:', error);
        res.status(500).json({ error: 'Failed to approve story' });
    }
});

// POST /hubs/:hubId/stories/:storyId/reject - Reject pending story
router.post('/:hubId/stories/:storyId/reject', requireAuth, async (req, res) => {
    try {
        const { hubId, storyId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can reject stories' });
        }

        const story = await Story.findById(storyId);
        if (!story || story.hubId !== hubId) {
            return res.status(404).json({ error: 'Story not found' });
        }

        if (story.hubApprovalStatus !== 'pending') {
            return res.status(400).json({ error: 'Story has already been reviewed' });
        }

        // Reject story
        story.hubApprovalStatus = 'rejected';
        story.hubApprovedBy = req.internalId;
        await story.save();

        res.json({ success: true, message: 'Story rejected' });
    } catch (error) {
        console.error('Reject story error:', error);
        res.status(500).json({ error: 'Failed to reject story' });
    }
});

// GET /hubs/:hubId/stories/pending - Get pending stories (moderators only)
router.get('/:hubId/stories/pending', requireAuth, async (req, res) => {
    try {
        const { hubId } = req.params;

        const hub = await CollaborativeHub.findOne({ hubId });
        if (!hub) {
            return res.status(404).json({ error: 'Hub not found' });
        }

        // Check permissions
        if (!isHubModerator(hub, req.internalId)) {
            return res.status(403).json({ error: 'Only hub moderators can view pending stories' });
        }

        const stories = await Story.find({ hubId, hubApprovalStatus: 'pending' })
            .sort({ createdAt: -1 })
            .lean();

        // Get author info
        const authorIds = [...new Set(stories.map(s => s.internalAuthorId))];
        const authors = await User.find({ internalId: { $in: authorIds } })
            .select('internalId username displayName')
            .lean();
        const authorMap = Object.fromEntries(authors.map(a => [a.internalId, a]));

        const storiesWithAuthors = stories.map(story => ({
            ...story,
            author: authorMap[story.internalAuthorId]
        }));

        res.json({ stories: storiesWithAuthors });
    } catch (error) {
        console.error('Get pending stories error:', error);
        res.status(500).json({ error: 'Failed to fetch pending stories' });
    }
});

module.exports = router;
