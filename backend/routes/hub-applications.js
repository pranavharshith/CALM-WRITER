const express = require('express');
const router = express.Router();
const HubCreatorApplication = require('../models/HubCreatorApplication');
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');
const { requireAdmin } = require('../middleware/adminAuth');

// POST /hubs/apply-creator - Apply for hub creator status
router.post('/apply-creator', requireAuth, async (req, res) => {
    try {
        const { proposedHubName, proposedTheme, justification } = req.body;

        // Validation
        if (!proposedHubName || proposedHubName.length < 3 || proposedHubName.length > 50) {
            return res.status(400).json({ error: 'Hub name must be 3-50 characters' });
        }

        if (!proposedTheme || !['general', 'scifi', 'fantasy', 'poetry', 'mystery', 'horror', 'romance', 'nonfiction', 'other'].includes(proposedTheme)) {
            return res.status(400).json({ error: 'Invalid theme' });
        }

        if (!justification || justification.length < 200 || justification.length > 1000) {
            return res.status(400).json({ error: 'Justification must be 200-1000 characters' });
        }

        // Check if user already has a pending application
        const existing = await HubCreatorApplication.findOne({
            userInternalId: req.internalId,
            status: 'pending'
        });

        if (existing) {
            return res.status(400).json({ error: 'You already have a pending application' });
        }

        // Check if user already has an approved application
        const approved = await HubCreatorApplication.findOne({
            userInternalId: req.internalId,
            status: 'approved'
        });

        if (approved) {
            return res.status(400).json({ error: 'You already have creator status' });
        }

        // Collect user stats
        const user = await User.findOne({ internalId: req.internalId });
        const stories = await Story.find({ internalAuthorId: req.internalId });
        const totalStories = stories.length;
        const totalLikes = stories.reduce((sum, story) => sum + story.likes, 0);
        const followerCount = await Follow.countDocuments({ followedUsername: user.username });
        const accountAge = Math.floor((Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24));
        const threadParticipations = await StoryNode.countDocuments({ authorInternalId: req.internalId });

        // Create application
        const application = new HubCreatorApplication({
            userInternalId: req.internalId,
            proposedHubName,
            proposedTheme,
            justification,
            userStats: {
                totalStories,
                totalLikes,
                followerCount,
                accountAge,
                threadParticipations
            }
        });

        await application.save();

        res.json({
            success: true,
            message: 'Application submitted for review',
            applicationId: application._id
        });
    } catch (error) {
        console.error('Submit application error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// GET /hubs/creator-applications - Get all applications (admin only)
router.get('/creator-applications', requireAdmin, async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const applications = await HubCreatorApplication.find({ status })
            .sort({ createdAt: -1 })
            .lean();

        // Get user info
        const userIds = applications.map(app => app.userInternalId);
        const users = await User.find({ internalId: { $in: userIds } })
            .select('internalId username displayName email role')
            .lean();
        const userMap = Object.fromEntries(users.map(u => [u.internalId, u]));

        const applicationsWithUsers = applications.map(app => ({
            ...app,
            user: userMap[app.userInternalId]
        }));

        res.json({ applications: applicationsWithUsers });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// POST /hubs/creator-applications/:id/review - Review application (admin only)
router.post('/creator-applications/:id/review', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, notes } = req.body;

        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ error: 'Decision must be "approved" or "rejected"' });
        }

        const application = await HubCreatorApplication.findById(id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status !== 'pending') {
            return res.status(400).json({ error: 'Application has already been reviewed' });
        }

        application.status = decision;
        application.reviewedBy = req.internalId;
        application.reviewedAt = new Date();
        application.reviewNotes = notes || '';
        await application.save();

        res.json({
            success: true,
            message: `Application ${decision}`,
            application: {
                _id: application._id,
                status: application.status,
                reviewedAt: application.reviewedAt
            }
        });
    } catch (error) {
        console.error('Review application error:', error);
        res.status(500).json({ error: 'Failed to review application' });
    }
});

// GET /hubs/my-application - Get current user's application status
router.get('/my-application', requireAuth, async (req, res) => {
    try {
        const application = await HubCreatorApplication.findOne({
            userInternalId: req.internalId
        }).sort({ createdAt: -1 }).lean();

        if (!application) {
            return res.json({ hasApplication: false });
        }

        res.json({
            hasApplication: true,
            application: {
                _id: application._id,
                proposedHubName: application.proposedHubName,
                proposedTheme: application.proposedTheme,
                justification: application.justification,
                status: application.status,
                createdAt: application.createdAt,
                reviewedAt: application.reviewedAt,
                reviewNotes: application.reviewNotes
            }
        });
    } catch (error) {
        console.error('Get my application error:', error);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
});

module.exports = router;
