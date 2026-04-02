const express = require('express');
const router = express.Router();
const Follow = require('../models/Follow');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/auth-consolidated');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// POST /follows/:username - Follow user
router.post('/:username', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (targetUser.internalId === req.internalId) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existing = await Follow.findOne({
      followerInternalId: req.internalId,
      followingInternalId: targetUser.internalId
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Already following' });
    }

    const follow = new Follow({
      followerInternalId: req.internalId,
      followingInternalId: targetUser.internalId
    });

    await follow.save();

    res.json({
      success: true,
      message: 'User followed',
      following: true
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, error: 'Failed to follow user' });
  }
});

// DELETE /follows/:username - Unfollow user
router.delete('/:username', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await Follow.deleteOne({
      followerInternalId: req.internalId,
      followingInternalId: targetUser.internalId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Not following' });
    }

    res.json({
      success: true,
      message: 'User unfollowed',
      following: false
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ success: false, error: 'Failed to unfollow user' });
  }
});

// GET /follows/status/:username - Get follow status
router.get('/status/:username', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const follow = await Follow.findOne({
      followerInternalId: req.internalId,
      followingInternalId: targetUser.internalId
    });

    res.json({
      success: true,
      isFollowing: !!follow
    });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ success: false, error: 'Failed to check follow status' });
  }
});

// GET /follows/counts/:username - Get follow counts
router.get('/counts/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const followers = await Follow.countDocuments({ followingInternalId: user.internalId });
    const following = await Follow.countDocuments({ followerInternalId: user.internalId });

    res.json({
      success: true,
      username: user.username,
      followers,
      following
    });
  } catch (error) {
    console.error('Follow counts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get follow counts' });
  }
});

// GET /follows/following/:username - Get following list for user
router.get('/following/:username', optionalAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const total = await Follow.countDocuments({ followerInternalId: user.internalId });
    const follows = await Follow.find({ followerInternalId: user.internalId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const followingUsers = await Promise.all(follows.map(async (f) => {
      const followedUser = await User.findOne({ internalId: f.followingInternalId });
      return {
        username: followedUser?.username,
        displayName: followedUser?.displayName,
        internalId: followedUser?.internalId,
        profilePicture: followedUser?.profilePicture?.url || null
      };
    }));

    res.json({
      success: true,
      username: user.username,
      following: followingUsers,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Following list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch following list' });
  }
});

// GET /follows/following - Get current user's following list
router.get('/following', requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await Follow.countDocuments({ followerInternalId: req.internalId });
    const follows = await Follow.find({ followerInternalId: req.internalId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const followingUsers = await Promise.all(follows.map(async (f) => {
      const user = await User.findOne({ internalId: f.followingInternalId });
      return {
        username: user?.username,
        displayName: user?.displayName,
        internalId: user?.internalId,
        profilePicture: user?.profilePicture?.url || null
      };
    }));

    res.json({
      success: true,
      following: followingUsers,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('My following list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch following list' });
  }
});

module.exports = router;
