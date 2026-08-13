const express = require('express');
const router = express.Router();
const HubCreatorApplication = require('../models/HubCreatorApplication');
const { requireAuth } = require('../middleware/auth-consolidated');
const { requireAdmin } = require('../middleware/adminAuth');

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
