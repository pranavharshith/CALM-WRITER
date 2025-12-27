const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');

// GET /leaderboards/top-stories: Get top stories by likes in different time periods
router.get('/top-stories', async (req, res) => {
  try {
    const period = req.query.period || '24h'; // 24h, 3d, 1w, all-time

    let timeFilter = { hidden: false };
    const now = new Date();

    switch (period) {
      case '24h':
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
        break;
      case '3d':
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) };
        break;
      case '1w':
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'all-time':
        // No time filter, just hidden: false
        break;
      default:
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
    }

    // Get top stories by likes
    const topStories = await Story.find(timeFilter)
      .sort({ likes: -1 })
      .limit(10)
      .lean();

    // Get usernames for the authors
    const enrichedLeaderboard = [];

    for (const story of topStories) {
      const user = await User.findOne({ internalId: story.internalAuthorId });
      if (user && user.username) {
        enrichedLeaderboard.push({
          storyId: story._id,
          storyTitle: story.title || 'Untitled',
          username: user.username,
          internalId: story.internalAuthorId,
          likes: story.likes || 0,
          wordCount: story.wordCount || 0,
          createdAt: story.createdAt
        });
      }
    }

    res.json({
      period,
      leaderboard: enrichedLeaderboard
    });
  } catch (error) {
    console.error('Top stories leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch top stories' });
  }
});

module.exports = router;
