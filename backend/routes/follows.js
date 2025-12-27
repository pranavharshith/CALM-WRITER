const express = require('express');
const router = express.Router();
const Follow = require('../models/Follow');
const User = require('../models/User');

// Middleware: Check session by internalId
function requireSession(req, res, next) {
  const userId = req.header('X-Internal-Id');
  if (!userId) return res.status(401).json({ error: 'Missing session' });
  req.internalId = userId;
  next();
}

// Helper: find user by username
async function findUserByUsername(username) {
  return await User.findOne({ username });
}

// POST /follows/:username - follow a user
router.post('/:username', requireSession, async (req, res) => {
  try {
    const { username } = req.params;
    const target = await findUserByUsername(username);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.internalId === req.internalId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    await Follow.updateOne(
      { followerInternalId: req.internalId, followingInternalId: target.internalId },
      { $setOnInsert: { followerInternalId: req.internalId, followingInternalId: target.internalId } },
      { upsert: true }
    );

    const followers = await Follow.countDocuments({ followingInternalId: target.internalId });
    res.json({ success: true, isFollowing: true, followers });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /follows/:username - unfollow a user
router.delete('/:username', requireSession, async (req, res) => {
  try {
    const { username } = req.params;
    const target = await findUserByUsername(username);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.internalId === req.internalId) {
      return res.status(400).json({ error: 'Cannot unfollow yourself' });
    }

    await Follow.deleteOne({ followerInternalId: req.internalId, followingInternalId: target.internalId });

    const followers = await Follow.countDocuments({ followingInternalId: target.internalId });
    res.json({ success: true, isFollowing: false, followers });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /follows/status/:username - whether viewer follows user
router.get('/status/:username', requireSession, async (req, res) => {
  try {
    const { username } = req.params;
    const target = await findUserByUsername(username);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const existing = await Follow.findOne({ followerInternalId: req.internalId, followingInternalId: target.internalId });
    res.json({ isFollowing: !!existing });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ error: 'Failed to get follow status' });
  }
});

// GET /follows/counts/:username - follower/following counts for profile
router.get('/counts/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const target = await findUserByUsername(username);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const [followers, following] = await Promise.all([
      Follow.countDocuments({ followingInternalId: target.internalId }),
      Follow.countDocuments({ followerInternalId: target.internalId }),
    ]);

    res.json({ followers, following });
  } catch (error) {
    console.error('Follow counts error:', error);
    res.status(500).json({ error: 'Failed to get follow counts' });
  }
});

// GET /follows/following/:username - Get list of users a specific user is following
router.get('/following/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const targetUser = await findUserByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const follows = await Follow.find({ followerInternalId: targetUser.internalId });
    const followingIds = follows.map(f => f.followingInternalId);
    const users = await User.find({ internalId: { $in: followingIds } }).select('username displayName');

    res.json(users);
  } catch (error) {
    console.error('Get following list for user error:', error);
    res.status(500).json({ error: 'Failed to get following list' });
  }
});

// GET /follows/following - Get list of users the current user is following
router.get('/following', requireSession, async (req, res) => {
  try {
    // 1. Find all follow relationships for the current user
    const follows = await Follow.find({ followerInternalId: req.internalId });

    // 2. Extract the internalIds of the users being followed
    const followingIds = follows.map(f => f.followingInternalId);

    // 3. Find all users who match the extracted IDs
    const users = await User.find({ internalId: { $in: followingIds } }).select('username displayName');

    res.json(users);
  } catch (error) {
    console.error('Get following list error:', error);
    res.status(500).json({ error: 'Failed to get following list' });
  }
});

module.exports = router;
