const express = require('express');
const router = express.Router();
const HubCreatorApplication = require('../models/HubCreatorApplication');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');
const { requireAdmin } = require('../middleware/adminAuth');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { logAuthEvent } = require('../utils/logger');

// POST /hubs/apply-creator - Apply to be hub creator
router.post('/apply-creator', requireAuth, async (req, res) => {
  try {
    const { essay, motivation } = req.body;

    if (!essay || !motivation) {
      return res.status(400).json({ success: false, error: 'Essay and motivation required' });
    }

    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already applied
    const existing = await HubCreatorApplication.findOne({
      userInternalId: req.internalId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Application already pending' });
    }

    const application = new HubCreatorApplication({
      userInternalId: req.internalId,
      essay,
      motivation,
      status: 'pending'
    });

    await application.save();
    logAuthEvent('HUB_CREATOR_APPLICATION_SUBMITTED', req.internalId, true);

    res.json({
      success: true,
      message: 'Application submitted',
      application: {
        _id: application._id,
        status: application.status,
        createdAt: application.createdAt
      }
    });
  } catch (error) {
    console.error('Hub creator application error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

// GET /hubs/creator-applications - Get hub creator applications
router.get('/creator-applications', requireAdmin, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const status = req.query.status || 'pending';

    const total = await HubCreatorApplication.countDocuments({ status });
    const applications = await HubCreatorApplication.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enriched = await Promise.all(applications.map(async (app) => {
      const user = await User.findOne({ internalId: app.userInternalId });
      return {
        _id: app._id,
        user: {
          username: user?.username,
          internalId: user?.internalId
        },
        essay: (app.essay || '').substring(0, 200),
        motivation: (app.motivation || '').substring(0, 200),
        status: app.status,
        createdAt: app.createdAt
      };
    }));

    res.json({
      success: true,
      applications: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// POST /hubs/review-creator-application - Review hub creator application
router.post('/review-creator-application', requireAdmin, async (req, res) => {
  try {
    const { applicationId, decision, notes } = req.body;

    if (!applicationId || !decision) {
      return res.status(400).json({ success: false, error: 'Application ID and decision required' });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Invalid decision' });
    }

    const application = await HubCreatorApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    application.status = decision;
    application.reviewedBy = req.internalId;
    application.reviewNotes = notes;
    application.reviewedAt = new Date();

    await application.save();

    if (decision === 'approved') {
      const user = await User.findOne({ internalId: application.userInternalId });
      if (user) {
        // Grant hub creator privileges (could be a new role or flag)
        user.canCreateHubs = true;
        await user.save();
        logAuthEvent('HUB_CREATOR_APPROVED', user.internalId, true);
      }
    }

    res.json({
      success: true,
      message: `Application ${decision}`,
      application: {
        _id: application._id,
        status: application.status
      }
    });
  } catch (error) {
    console.error('Application review error:', error);
    res.status(500).json({ success: false, error: 'Failed to review application' });
  }
});

module.exports = router;
