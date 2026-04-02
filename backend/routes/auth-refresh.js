const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} = require('../middleware/auth-consolidated');
const rateLimit = require('express-rate-limit');
const { ipKey } = require('express-rate-limit');

// Rate limiter for token refresh - 100 per 15 minutes (generous for legitimate use)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many refresh attempts. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKey(req)
});

/**
 * POST /auth/refresh - Refresh access token using refresh token
 * This allows users to get a new access token without re-authenticating
 */
router.post('/refresh', refreshLimiter, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (err) {
            return res.status(401).json({
                error: 'Invalid or expired refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }

        // Get user from database
        const user = await User.findOne({ internalId: decoded.internalId });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user is timed out
        if (user.timeoutUntil && user.timeoutUntil > new Date()) {
            return res.status(403).json({
                error: 'Account temporarily suspended',
                timeoutUntil: user.timeoutUntil
            });
        }

        // Generate new tokens (token rotation for security)
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
                internalId: user.internalId,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

module.exports = router;
