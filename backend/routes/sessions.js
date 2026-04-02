const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth-consolidated');
const TokenBlacklist = require('../models/TokenBlacklist');
const jwt = require('jsonwebtoken');
const { logAuthEvent } = require('../utils/logger');

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

    logAuthEvent('LOGOUT_SUCCESS', req.internalId, true);

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
