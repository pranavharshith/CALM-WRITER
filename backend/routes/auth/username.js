const {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, csrfLimiter, refreshLimiter,
  GENERIC_AUTH_ERROR, setRefreshTokenCookie,
} = require('./_shared');

const router = express.Router();

// POST /auth/setup-username - Setup username after signup
router.post('/setup-username', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Username validation (3-20 characters, alphanumeric + underscore, no consecutive underscores)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)'
      });
    }

    // Check for consecutive underscores
    if (username.includes('__')) {
      return res.status(400).json({
        success: false,
        error: 'Username cannot contain consecutive underscores'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }

    // Update user
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.username = username.toLowerCase();
    user.displayName = username;
    await user.save();

    logAuthEvent('USERNAME_SETUP', user.internalId, true, { username: username.toLowerCase() });

    res.json({
      success: true,
      message: 'Username set successfully',
      user: {
        internalId: user.internalId,
        username: user.username,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Setup username error:', error);
    res.status(500).json({ success: false, error: 'Failed to setup username' });
  }
});

module.exports = router;
