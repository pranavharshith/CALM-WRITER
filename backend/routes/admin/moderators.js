const {
  express, Report, Story, StoryNode, User, Bookmark, Like, ModeratorApplication,
  requireAdmin, requireAuth, reportLimiter, logAdminAction, adminLimiter,
} = require('./_shared');

const router = express.Router();
router.use(requireAuth);

// GET /admin/check-moderator-eligibility - Check if current user meets moderator requirements
router.get('/check-moderator-eligibility', requireAuth, async (req, res) => {
  try {
    const userInternalId = req.internalId;

    const user = await User.findOne({ internalId: userInternalId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate account age in days
    const accountAge = Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Count stories published
    const storiesCount = await Story.countDocuments({ internalAuthorId: userInternalId });

    // Count thread continuations
    const continuationsCount = await StoryNode.countDocuments({
      authorInternalId: userInternalId,
      type: 'CONTINUATION'
    });

    // Count total likes received
    const stories = await Story.find({ internalAuthorId: userInternalId });
    const totalLikes = stories.reduce((sum, story) => sum + (story.likes || 0), 0);

    // Count bookmarked stories
    const bookmarkedStories = await Bookmark.aggregate([
      {
        $lookup: {
          from: 'stories',
          localField: 'storyId',
          foreignField: '_id',
          as: 'story'
        }
      },
      { $unwind: '$story' },
      { $match: { 'story.internalAuthorId': userInternalId } },
      {
        $group: {
          _id: '$storyId'
        }
      },
      { $count: 'total' }
    ]);
    const bookmarkedStoriesCount = bookmarkedStories[0]?.total || 0;

    // Count reports against user in last 6 months
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const reportsAgainst = await Report.countDocuments({
      $or: [
        { storyId: { $in: stories.map(s => s._id) } },
        {
          storyNodeId: {
            $in: (await StoryNode.find({ authorInternalId: userInternalId }).select('_id')).map(n => n._id)
          }
        }
      ],
      createdAt: { $gte: sixMonthsAgo },
      status: 'actioned'
    });

    // Check requirements
    const requirements = {
      accountAge: { value: accountAge, required: 90, met: accountAge >= 90 },
      storiesCount: { value: storiesCount, required: 10, met: storiesCount >= 10 },
      continuationsCount: { value: continuationsCount, required: 50, met: continuationsCount >= 50 },
      totalLikes: { value: totalLikes, required: 500, met: totalLikes >= 500 },
      bookmarkedStories: { value: bookmarkedStoriesCount, required: 5, met: bookmarkedStoriesCount >= 5 },
      cleanRecord: { value: reportsAgainst, required: 0, met: reportsAgainst === 0 }
    };

    const meetsRequirements = Object.values(requirements).every(req => req.met);

    res.json({
      eligible: meetsRequirements,
      requirements,
      canApply: meetsRequirements && user.role === 'user'
    });
  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// POST /admin/apply-moderator - Submit moderator application (authenticated user)
router.post('/apply-moderator', requireAuth, async (req, res) => {
  try {
    const userInternalId = req.internalId;

    const { essay, scenarioAnswers } = req.body;

    if (!essay || essay.length < 200) {
      return res.status(400).json({ error: 'Essay must be at least 200 words' });
    }

    // Check eligibility directly instead of doing an internal HTTP call
    const eligibilityCheck = await (async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      const userStories = await Story.find({ internalAuthorId: userInternalId });
      const totalStories = userStories.length;
      const totalLikes = userStories.reduce((sum, story) => sum + (story.likes || 0), 0);
      const avgLikes = totalStories > 0 ? totalLikes / totalStories : 0;

      const user = await User.findOne({ internalId: userInternalId });
      if (!user) {
        return { canApply: false };
      }

      const accountAgeDays = Math.floor((now - user.joinedAt) / (1000 * 60 * 60 * 24));
      const followerCount = await Bookmark.countDocuments({}); // placeholder, mirror logic from stats if needed

      // For now, reuse simple gate: must have at least some stories and be older than a week
      const canApply = totalStories >= 5 && accountAgeDays >= 7;

      return {
        canApply,
        requirements: {
          totalStories: { value: totalStories },
          avgLikes: { value: avgLikes },
          accountAgeDays: { value: accountAgeDays },
          followerCount: { value: followerCount }
        }
      };
    })();

    if (!eligibilityCheck.canApply) {
      return res.status(403).json({ error: 'You do not meet the requirements to apply' });
    }

    const user = await User.findOne({ internalId: userInternalId });

    // Create application
    const application = new ModeratorApplication({
      userInternalId,
      username: user.username,
      email: user.email,
      eligibility: eligibilityCheck.requirements,
      essay,
      scenarioAnswers,
      status: 'pending'
    });

    await application.save();

    res.json({ success: true, applicationId: application._id });
  } catch (error) {
    console.error('Apply moderator error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// GET /admin/moderator-applications - Get moderator applications (admin only)
router.get('/moderator-applications', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';

    const applications = await ModeratorApplication.find({ status })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ applications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /admin/review-moderator-application - Review moderator application (admin only)
router.post('/review-moderator-application', requireAdmin, async (req, res) => {
  try {
    const { applicationId, decision, notes } = req.body;

    if (!applicationId || !decision) {
      return res.status(400).json({ error: 'Application ID and decision required' });
    }

    const application = await ModeratorApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application
    application.status = decision; // 'approved' or 'rejected'
    application.reviewedBy = req.internalId;
    application.reviewedAt = new Date();
    application.reviewNotes = notes;

    await application.save();

    // If approved, promote user to moderator
    if (decision === 'approved') {
      await User.findOneAndUpdate(
        { internalId: application.userInternalId },
        {
          role: 'moderator',
          moderatorJoinedAt: new Date(),
          moderatorPromotedBy: req.internalId
        }
      );

      // Create system message in moderator chat
      const ModeratorChat = require('../../models/ModeratorChat');
      const systemMessage = new ModeratorChat({
        senderInternalId: 'system',
        senderUsername: 'System',
        message: `@${application.username} has been promoted to Community Guardian!`,
        isSystemMessage: true
      });
      await systemMessage.save();
    }

    res.json({ success: true, message: `Application ${decision}` });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ error: 'Failed to review application' });
  }
});

// POST /admin/promote-to-moderator - Directly promote user to moderator (admin only)
router.post('/promote-to-moderator', requireAdmin, async (req, res) => {
  try {
    const { userInternalId, justification } = req.body;

    if (!userInternalId || !justification) {
      return res.status(400).json({ error: 'User ID and justification required' });
    }

    const user = await User.findOne({ internalId: userInternalId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'user') {
      return res.status(400).json({ error: 'User is already a moderator or admin' });
    }

    // Promote user
    user.role = 'moderator';
    user.moderatorJoinedAt = new Date();
    user.moderatorPromotedBy = req.internalId;
    await user.save();

    // Create system message in moderator chat
    const ModeratorChat = require('../../models/ModeratorChat');
    const systemMessage = new ModeratorChat({
      senderInternalId: 'system',
      senderUsername: 'System',
      message: `@${user.username} has been directly promoted to Community Guardian by an admin. Reason: ${justification}`,
      isSystemMessage: true
    });
    await systemMessage.save();

    res.json({ success: true, message: 'User promoted to moderator' });
  } catch (error) {
    console.error('Promote to moderator error:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

module.exports = router;
