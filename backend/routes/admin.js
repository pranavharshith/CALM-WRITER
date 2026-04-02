const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Story = require('../models/Story');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth-consolidated');
const { requireAuth } = require('../middleware/auth-consolidated');
const { reportLimiter } = require('../middleware/rateLimiter');
const { logAdminAction } = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const { ipKey } = require('express-rate-limit');

// Every route in this router requires authentication
router.use(requireAuth);

// Rate limiter for admin endpoints - 50 requests per hour
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { success: false, error: 'Too many admin requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKey(req),
  skip: (req) => !req.internalId
});

// POST /admin/report - Regular users can report stories or nodes (with rate limiting)
router.post('/report', requireAuth, reportLimiter, async (req, res) => {
  const { storyId, storyNodeId, reason, details } = req.body;

  // Must have either storyId or storyNodeId
  if (!storyId && !storyNodeId) {
    return res.status(400).json({
      success: false,
      error: 'Story ID or node ID required'
    });
  }

  // Validate reason
  if (!['spam', 'hate', 'harassment', 'explicit_harm'].includes(reason)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report reason'
    });
  }

  // Validate details field - max 5000 characters
  if (details && typeof details === 'string') {
    if (details.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Report details must not exceed 5000 characters'
      });
    }
    // Sanitize details to prevent injection
    if (/<script|javascript:|onerror|onclick/i.test(details)) {
      return res.status(400).json({
        success: false,
        error: 'Report details contain invalid content'
      });
    }
  }

  const report = new Report({
    userInternalId: req.internalId,
    storyId: storyId || null,
    storyNodeId: storyNodeId || null,
    reason,
    details: details ? details.trim() : '',
    status: 'pending',
  });
  await report.save();

  res.json({ success: true, reportId: report._id });
});

// REMOVED: Insecure /admin/delete-story endpoint that used admin secret in request body
// Use JWT-based authentication with requireAdmin middleware instead

// Admin Analytics Endpoints
const ReadSession = require('../models/ReadSession');

// GET /admin/stats - Comprehensive analytics dashboard with all metrics
router.get('/stats', requireAdmin, adminLimiter, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last15Mins = new Date(now.getTime() - 15 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Story statistics with comprehensive metrics
    const storyStats = await Story.aggregate([
      {
        $facet: {
          totalStories: [{ $count: 'count' }],
          totalThreads: [{ $match: { threadLocked: { $exists: true } } }, { $count: 'count' }],
          storiesToday: [{ $match: { createdAt: { $gte: today } } }, { $count: 'count' }],
          storiesYesterday: [{ $match: { createdAt: { $gte: yesterday, $lt: today } } }, { $count: 'count' }],
          avgWordCount: [{ $group: { _id: null, avg: { $avg: '$wordCount' } } }],
          storiesOver800: [{ $match: { wordCount: { $gte: 800 } } }, { $count: 'count' }],
          orphanedStories: [{ $match: { likes: 0 } }, { $count: 'count' }],
          totalLikes: [{ $group: { _id: null, total: { $sum: '$likes' } } }],
          featuredStories: [{ $match: { isFeatured: true } }, { $count: 'count' }],
          storiesByHour: [
            { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          contentTypeSplit: [
            { $group: { _id: null, original: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // User statistics with DAU/MAU and retention metrics
    const userStats = await User.aggregate([
      {
        $facet: {
          totalUsers: [{ $count: 'count' }],
          roleDistribution: [{ $group: { _id: '$role', count: { $sum: 1 } } }],
          usersLast30Days: [{ $match: { createdAt: { $gte: last30Days } } }, { $count: 'count' }],
          usersLast7Days: [{ $match: { createdAt: { $gte: last7Days } } }, { $count: 'count' }],
          usersToday: [{ $match: { createdAt: { $gte: today } } }, { $count: 'count' }],
          growthCohorts: [
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                newUsers: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]
        }
      }
    ]);

    // Read session statistics for engagement metrics
    const readStats = await ReadSession.aggregate([
      {
        $facet: {
          totalReads: [{ $count: 'count' }],
          avgReadPercent: [{ $group: { _id: null, avg: { $avg: '$percentRead' } } }],
          completedReads: [{ $match: { percentRead: { $gte: 90 } } }, { $count: 'count' }],
          readsLast7Days: [{ $match: { startedAt: { $gte: last7Days } } }, { $count: 'count' }],
          avgReadTime: [{ $group: { _id: null, avg: { $avg: '$timeSpent' } } }],
          activeReadersLast15Min: [{ $match: { updatedAt: { $gte: last15Mins } } }, { $count: 'count' }]
        }
      }
    ]);

    // Calculate DAU (users with activity today)
    const dauCount = await ReadSession.distinct('userInternalId', { startedAt: { $gte: today } }).then(arr => arr.length);

    // Calculate MAU (users with activity in last 30 days)
    const mauCount = await ReadSession.distinct('userInternalId', { startedAt: { $gte: last30Days } }).then(arr => arr.length);

    // Calculate read-to-like ratio
    const totalReads = readStats[0].totalReads[0]?.count || 0;
    const totalLikes = storyStats[0].totalLikes[0]?.total || 0;
    const readToLikeRatio = totalReads > 0 ? (totalLikes / totalReads * 100).toFixed(2) : 0;

    // Moderation and reports
    const reportStats = await Report.aggregate([
      {
        $facet: {
          totalReports: [{ $count: 'count' }],
          pendingReports: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          reportsByReason: [{ $group: { _id: '$reason', count: { $sum: 1 } } }],
          reportOutcomes: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          avgResolutionTime: [
            { $match: { reviewedAt: { $exists: true } } },
            {
              $project: {
                resolutionTime: {
                  $subtract: ['$reviewedAt', '$createdAt']
                }
              }
            },
            { $group: { _id: null, avg: { $avg: '$resolutionTime' } } }
          ]
        }
      }
    ]);

    // Thread/StoryNode statistics
    const StoryNode = require('../models/StoryNode');
    const threadStats = await StoryNode.aggregate([
      {
        $facet: {
          totalNodes: [{ $count: 'count' }],
          continuations: [{ $match: { type: 'CONTINUATION' } }, { $count: 'count' }],
          responses: [{ $match: { type: 'RESPONSE' } }, { $count: 'count' }],
          avgThreadDepth: [
            { $group: { _id: '$rootStoryId', nodeCount: { $sum: 1 } } },
            { $group: { _id: null, avg: { $avg: '$nodeCount' } } }
          ]
        }
      }
    ]);

    // Bookmark statistics
    const Bookmark = require('../models/Bookmark');
    const bookmarkStats = await Bookmark.aggregate([
      {
        $facet: {
          totalBookmarks: [{ $count: 'count' }],
          bookmarksLast7Days: [{ $match: { createdAt: { $gte: last7Days } } }, { $count: 'count' }]
        }
      }
    ]);

    // Calculate bookmark rate (bookmarks / total reads)
    const totalBookmarks = bookmarkStats[0].totalBookmarks[0]?.count || 0;
    const bookmarkRate = totalReads > 0 ? (totalBookmarks / totalReads * 100).toFixed(2) : 0;

    // Follow metrics
    const Follow = require('../models/Follow');
    const followStats = await Follow.aggregate([
      {
        $facet: {
          totalFollows: [{ $count: 'count' }],
          followsLast7Days: [{ $match: { createdAt: { $gte: last7Days } } }, { $count: 'count' }],
          avgFollowsPerUser: [
            { $group: { _id: '$followerInternalId', followCount: { $sum: 1 } } },
            { $group: { _id: null, avg: { $avg: '$followCount' } } }
          ]
        }
      }
    ]);

    const totalFollows = followStats[0].totalFollows[0]?.count || 0;

    // OTP success rate
    const usersWithOTP = await User.countDocuments({ otp: { $exists: true } });
    const completedUsers = await User.countDocuments({ username: { $exists: true, $ne: null } });
    const otpSuccessRate = usersWithOTP > 0 ? ((completedUsers / usersWithOTP) * 100).toFixed(2) : 0;

    // Get total users count first (needed for other calculations)
    const totalUsersCount = userStats[0].totalUsers[0]?.count || 0;

    // Writers vs Readers count
    const uniqueAuthors = await Story.distinct('internalAuthorId').then(arr => arr.length);
    const writersCount = uniqueAuthors;
    const readersOnlyCount = Math.max(0, totalUsersCount - writersCount);
    const writerPercentage = totalUsersCount > 0 ? ((writersCount / totalUsersCount) * 100).toFixed(2) : 0;

    // Churn rate: users inactive for > 30 days
    const activeUserIds = await ReadSession.distinct('userInternalId', { startedAt: { $gte: last30Days } });
    const churnedUsers = Math.max(0, totalUsersCount - activeUserIds.length);
    const churnRate = totalUsersCount > 0 ? (churnedUsers / totalUsersCount * 100).toFixed(2) : 0;

    // Calm compliance percentage
    const totalStoriesCount = storyStats[0].totalStories[0]?.count || 0;
    const storiesOver800Count = storyStats[0].storiesOver800[0]?.count || 0;
    const calmCompliance = totalStoriesCount > 0 ? ((storiesOver800Count / totalStoriesCount) * 100).toFixed(2) : 0;

    res.json({
      commandCenter: {
        totalUsers: totalUsersCount,
        activeReadersNow: readStats[0].activeReadersLast15Min[0]?.count || 0,
        storiesToday: storyStats[0].storiesToday[0]?.count || 0,
        storiesYesterday: storyStats[0].storiesYesterday[0]?.count || 0,
        pendingReports: reportStats[0].pendingReports[0]?.count || 0,
        todayVsYesterdayChange: storyStats[0].storiesYesterday[0]?.count
          ? (((storyStats[0].storiesToday[0]?.count || 0) - (storyStats[0].storiesYesterday[0]?.count || 0)) / (storyStats[0].storiesYesterday[0]?.count || 1) * 100).toFixed(1)
          : 0
      },
      userIntelligence: {
        totalUsers: totalUsersCount,
        newUsersLast30Days: userStats[0].usersLast30Days[0]?.count || 0,
        newUsersLast7Days: userStats[0].usersLast7Days[0]?.count || 0,
        newUsersToday: userStats[0].usersToday[0]?.count || 0,
        dau: dauCount,
        mau: mauCount,
        dauMauRatio: mauCount > 0 ? ((dauCount / mauCount) * 100).toFixed(2) : 0,
        churnRate: churnRate,
        otpSuccessRate: otpSuccessRate,
        roleDistribution: userStats[0].roleDistribution,
        growthCohorts: userStats[0].growthCohorts,
        writerPercentage: writerPercentage,
        totalFollows: totalFollows,
        avgFollowsPerUser: followStats[0].avgFollowsPerUser[0]?.avg?.toFixed(2) || 0
      },
      contentEcosystem: {
        totalStories: totalStoriesCount,
        totalThreads: threadStats[0].totalNodes[0]?.count || 0,
        avgWordCount: Math.round(storyStats[0].avgWordCount[0]?.avg || 0),
        storiesOver800: storiesOver800Count,
        calmCompliance: calmCompliance,
        orphanedStories: storyStats[0].orphanedStories[0]?.count || 0,
        orphanedPercentage: totalStoriesCount > 0 ? ((storyStats[0].orphanedStories[0]?.count || 0) / totalStoriesCount * 100).toFixed(2) : 0,
        avgThreadDepth: threadStats[0].avgThreadDepth[0]?.avg || 0,
        continuations: threadStats[0].continuations[0]?.count || 0,
        responses: threadStats[0].responses[0]?.count || 0,
        storiesByHour: storyStats[0].storiesByHour,
        featuredStories: storyStats[0].featuredStories[0]?.count || 0
      },
      engagement: {
        totalReads: totalReads,
        avgReadPercent: Math.round(readStats[0].avgReadPercent[0]?.avg || 0),
        completedReads: readStats[0].completedReads[0]?.count || 0,
        completionRate: totalReads > 0 ? ((readStats[0].completedReads[0]?.count || 0) / totalReads * 100).toFixed(2) : 0,
        totalLikes: totalLikes,
        readToLikeRatio: readToLikeRatio,
        bookmarkRate: bookmarkRate,
        totalBookmarks: totalBookmarks,
        readsLast7Days: readStats[0].readsLast7Days[0]?.count || 0,
        avgReadTime: Math.round(readStats[0].avgReadTime[0]?.avg || 0),
        lurkerRatio: totalUsersCount > 0 && totalStoriesCount > 0
          ? (((totalUsersCount - (await Story.distinct('internalAuthorId').then(arr => arr.length))) / totalUsersCount) * 100).toFixed(2)
          : 0
      },
      moderation: {
        totalReports: reportStats[0].totalReports[0]?.count || 0,
        pendingReports: reportStats[0].pendingReports[0]?.count || 0,
        reportsByReason: reportStats[0].reportsByReason,
        reportOutcomes: reportStats[0].reportOutcomes,
        avgResolutionTime: Math.round(reportStats[0].avgResolutionTime[0]?.avg || 0),
        avgResolutionTimeHours: reportStats[0].avgResolutionTime[0]?.avg
          ? (reportStats[0].avgResolutionTime[0].avg / (1000 * 60 * 60)).toFixed(2)
          : 0
      },
      systemHealth: {
        timestamp: now,
        dbSize: 'N/A' // Would need MongoDB admin access to get actual size
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /admin/activity - Real-time activity feed
router.get('/activity', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recentStories = await Story.find().sort({ createdAt: -1 }).limit(limit).lean();
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(limit).lean();

    const activities = [];
    recentStories.forEach(story => {
      activities.push({
        type: 'story_published',
        timestamp: story.createdAt,
        message: `Story "${story.title || 'Untitled'}" published`,
        storyId: story._id
      });
    });

    recentUsers.forEach(user => {
      if (user.username) {
        activities.push({
          type: 'user_joined',
          timestamp: user.createdAt,
          message: `User @${user.username} joined`,
          username: user.username
        });
      }
    });

    activities.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ activities: activities.slice(0, limit) });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Moderator Application Endpoints
const ModeratorApplication = require('../models/ModeratorApplication');
const StoryNode = require('../models/StoryNode');
const Bookmark = require('../models/Bookmark');

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
      const ModeratorChat = require('../models/ModeratorChat');
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
    const ModeratorChat = require('../models/ModeratorChat');
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

// GET /admin/check-like-consistency - Check and report data consistency issues
router.get('/check-like-consistency', requireAdmin, async (req, res) => {
  try {
    console.log('Starting like data consistency check...');

    // Find stories where likedBy array length doesn't match likes count
    const inconsistencies = await Story.find({
      $expr: { $ne: [{ $size: '$likedBy' }, '$likes'] }
    }).select('_id title likes likedBy').limit(100);

    // Find Like records that don't have corresponding Story.likedBy entries
    const Like = require('../models/Like');
    const allLikes = await Like.find({}).lean();
    const orphanedLikes = [];

    for (const like of allLikes) {
      const story = await Story.findById(like.storyId).select('likedBy');
      if (!story || !story.likedBy?.includes(like.userInternalId)) {
        orphanedLikes.push({
          likeId: like._id,
          storyId: like.storyId,
          userInternalId: like.userInternalId
        });
      }
    }

    res.json({
      success: true,
      summary: {
        totalStories: await Story.countDocuments(),
        totalLikes: allLikes.length,
        inconsistentStories: inconsistencies.length,
        orphanedLikes: orphanedLikes.length
      },
      inconsistencies: inconsistencies.map(s => ({
        storyId: s._id,
        title: s.title,
        likedByCount: s.likedBy?.length || 0,
        likesCount: s.likes
      })),
      orphanedLikes: orphanedLikes.slice(0, 20) // Show first 20
    });
  } catch (error) {
    console.error('Consistency check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check consistency' });
  }
});

// POST /admin/fix-like-consistency - Attempt to fix data consistency issues
router.post('/admin/fix-like-consistency', requireAdmin, async (req, res) => {
  try {
    console.log('Starting like data consistency fix...');

    const Like = require('../models/Like');
    let fixed = 0;

    // Fix stories with inconsistent like counts
    const inconsistencies = await Story.find({
      $expr: { $ne: [{ $size: '$likedBy' }, '$likes'] }
    });

    for (const story of inconsistencies) {
      const correctCount = story.likedBy?.length || 0;
      if (story.likes !== correctCount) {
        await Story.findByIdAndUpdate(story._id, {
          likes: correctCount
        });
        fixed++;
      }
    }

    // Fix orphaned likes (Like records without Story.likedBy entry)
    const allLikes = await Like.find({}).lean();
    let orphanedFixed = 0;

    for (const like of allLikes) {
      const story = await Story.findById(like.storyId);
      if (!story) {
        // Story deleted, remove the like
        await Like.deleteOne({ _id: like._id });
        orphanedFixed++;
      } else if (!story.likedBy?.includes(like.userInternalId)) {
        // Add to likedBy array
        await Story.findByIdAndUpdate(like.storyId, {
          $addToSet: { likedBy: like.userInternalId },
          $inc: { likes: 1 }
        });
        orphanedFixed++;
      }
    }

    res.json({
      success: true,
      fixed: {
        inconsistentStories: fixed,
        orphanedLikes: orphanedFixed
      }
    });
  } catch (error) {
    console.error('Consistency fix error:', error);
    res.status(500).json({ success: false, error: 'Failed to fix consistency' });
  }
});

module.exports = router;


