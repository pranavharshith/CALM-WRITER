const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth-consolidated');
const TokenBlacklist = require('../models/TokenBlacklist');
const ReadSession = require('../models/ReadSession');
const Story = require('../models/Story');
const jwt = require('jsonwebtoken');
const { logAuthEvent } = require('../utils/logger');

// POST /reads/track - Track a read session for a story
// (mounted at /reads via server.js; keeps ReadSession analytics accurate)
router.post('/track', requireAuth, async (req, res) => {
  try {
    const { storyId, percentRead } = req.body;

    if (!storyId) {
      return res.status(400).json({ success: false, error: 'Story ID required' });
    }

    if (!require('mongoose').isValidObjectId(storyId)) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const story = await Story.findById(storyId);
    if (!story || story.hidden) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    const percent = Math.min(100, Math.max(0, Math.round(Number(percentRead) || 0)));

    // Reuse the latest read session for the (user, story) pair if it is recent,
    // otherwise start a new one — this keeps analytics accurate without unbounded growth.
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours

    let session = await ReadSession.findOne({
      userInternalId: req.internalId,
      storyId,
      startedAt: { $gte: recentThreshold }
    }).sort({ startedAt: -1 });

    if (!session) {
      session = new ReadSession({
        userInternalId: req.internalId,
        storyId,
        startedAt: now,
        percentRead: percent,
        timeSpent: 0
      });
    } else {
      session.percentRead = Math.max(session.percentRead || 0, percent);
      session.completedAt = now;
      session.timeSpent = (session.timeSpent || 0) + 30000; // approximate 30s per tracking tick
    }

    await session.save();

    res.json({ success: true, percentRead: session.percentRead });
  } catch (error) {
    console.error('Read tracking error:', error);
    res.status(500).json({ success: false, error: 'Failed to track read session' });
  }
});

// POST /auth/logout - Logout and blacklist token
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Decode token to get expiration
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    // Add token to blacklist
    const expiresAt = new Date(decoded.exp * 1000);
    await TokenBlacklist.create({
      token,
      userInternalId: req.internalId,
      expiresAt
    });

    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const refreshDecoded = jwt.decode(refreshToken);
        await TokenBlacklist.create({
          token: refreshToken,
          userInternalId: req.internalId,
          expiresAt: refreshDecoded?.exp
            ? new Date(refreshDecoded.exp * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      } catch (blacklistErr) {
        if (blacklistErr.code !== 11000) {
          console.error('Failed to blacklist refresh token:', blacklistErr);
        }
      }
    }

    logAuthEvent('LOGOUT_SUCCESS', req.internalId, true);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

// GET /auth/verify - Verify token is valid and not blacklisted
router.get('/verify', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const blacklisted = await TokenBlacklist.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({ success: false, error: 'Token has been revoked' });
    }

    res.json({
      success: true,
      user: {
        internalId: req.internalId,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

module.exports = router;
