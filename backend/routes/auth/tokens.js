const {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, csrfLimiter, refreshLimiter,
  GENERIC_AUTH_ERROR, setRefreshTokenCookie, clearRefreshTokenCookie,
} = require('./_shared');

const router = express.Router();

// POST /auth/refresh - Refresh access token using HttpOnly cookie
router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token is not blacklisted
    const blacklisted = await TokenBlacklist.findOne({ token: refreshToken });
    if (blacklisted) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Refresh token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Verify and decode refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Verify user still exists
    const user = await User.findOne({ internalId: decoded.internalId });
    if (!user) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check token version (Global Logout)
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Session expired (logged out from another device)',
        code: 'TOKEN_REVOKED'
      });
    }

    // Check if user is timed out
    if (user.timeoutUntil && user.timeoutUntil > new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Account temporarily suspended',
        timeoutUntil: user.timeoutUntil,
        timeoutReason: user.timeoutReason
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    // Optional: Rotate refresh token (Issue new one)
    // const newRefreshToken = generateRefreshToken(user);
    // setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// POST /auth/logout-all - Logout from all devices
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.user.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Increment token version to invalidate all existing tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    logSecurityEvent('LOGOUT_ALL_DEVICES', {
      userId: user.internalId,
      ip: req.ip
    });

    // Clear the refresh token cookie with the same options used to set it
    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ success: false, error: 'Failed to logout from all devices' });
  }
});

module.exports = router;
