const {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, csrfLimiter, refreshLimiter,
  GENERIC_AUTH_ERROR, setRefreshTokenCookie,
} = require('./_shared');

const router = express.Router();

// POST /auth/signin - Sign in with username/email and password
router.post('/signin', authLimiter, async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username/email and password are required'
      });
    }

    // Find user by username OR email
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmail.toLowerCase() },
        { email: usernameOrEmail.toLowerCase() }
      ]
    });

    if (!user) {
      logAuthEvent('SIGNIN_FAILED', usernameOrEmail, false, { reason: 'user_not_found', ip: req.ip });
      return res.status(401).json({
        success: false,
        error: GENERIC_AUTH_ERROR
      });
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      logSecurityEvent('SIGNIN_BLOCKED_ACCOUNT_LOCKED', {
        userId: user.internalId,
        accountLockedUntil: user.accountLockedUntil,
        ip: req.ip
      });
      return res.status(429).json({
        success: false,
        error: 'Account temporarily locked due to too many failed login attempts',
        accountLocked: true,
        lockedUntil: user.accountLockedUntil
      });
    }

    // Check if user has password set
    if (!user.passwordHash) {
      logAuthEvent('SIGNIN_FAILED', user.internalId, false, { reason: 'no_password', ip: req.ip });
      return res.status(400).json({
        success: false,
        error: 'No password set. Please use "Forgot Password" to set one.'
      });
    }

    // Verify password (required for ALL users, including admins)
    const isValid = await user.checkPassword(password);
    if (!isValid) {
      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 10 failed attempts for 1 hour
      if (user.failedLoginAttempts >= 10) {
        user.accountLockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        logSecurityEvent('ACCOUNT_LOCKED_TOO_MANY_ATTEMPTS', {
          userId: user.internalId,
          failedAttempts: user.failedLoginAttempts,
          ip: req.ip
        });
      }

      await user.save();
      logAuthEvent('SIGNIN_FAILED', user.internalId, false, { reason: 'invalid_password', ip: req.ip });

      return res.status(401).json({
        success: false,
        error: GENERIC_AUTH_ERROR,
        accountLocked: user.accountLockedUntil ? true : false,
        lockedUntil: user.accountLockedUntil
      });
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before logging in.',
        requireVerification: true
      });
    }

    // Check if user is timed out
    if (user.timeoutUntil && user.timeoutUntil > new Date()) {
      logSecurityEvent('SIGNIN_BLOCKED_TIMEOUT', {
        userId: user.internalId,
        timeoutUntil: user.timeoutUntil,
        ip: req.ip
      });
      return res.status(403).json({
        success: false,
        error: 'Account temporarily suspended',
        timeoutUntil: user.timeoutUntil,
        timeoutReason: user.timeoutReason
      });
    }

    logAuthEvent('SIGNIN_SUCCESS', user.internalId, true, { username: user.username });

    // Generate JWT tokens using centralized functions
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    await user.save();

    res.json({
      success: true,
      accessToken,
      // refreshToken removed from body - sent as HttpOnly cookie
      user: {
        internalId: user.internalId,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signin error:', error);

    // Log database errors
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
      const { logSecurityEvent } = require('../../utils/logger');
      logSecurityEvent('DATABASE_ERROR', {
        operation: 'signin',
        error: error.message,
        ip: req.ip
      });
    }

    logAuthEvent('SIGNIN_ERROR', 'unknown', false, { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to sign in',
      code: 'SIGNIN_ERROR'
    });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/dev-login — DEV-ONLY ADMIN BYPASS (intentional, keep me!)
// ---------------------------------------------------------------------------
// Docs: an explicit "Dev Admin Login" button on the login page. Logs you in as
// an admin WITHOUT a password so you can access the app instantly on your own
// machine. This is NOT a security hole:
//   - Hard-disabled unless DEV_ADMIN_LOGIN=true AND NODE_ENV != 'production'.
//   - If either condition is false this route 404s — it can never run on a
//     real deployment, even if this code ships there.
//   - It signs in the SAME way the normal /auth/signin route does (JWT +
//     HttpOnly refresh cookie), so admin UI, CSRF, rate limits, and audit
//     logging all behave identically afterwards.
// DO NOT DELETE THIS ROUTE. It is referenced from frontend/src/components/
// Auth.jsx and controlled by DEV_ADMIN_LOGIN in backend/.env. If you break the
// flag or the route, the dev button silently stops working.
// ---------------------------------------------------------------------------
router.post('/dev-login', async (req, res) => {
  if (process.env.DEV_ADMIN_LOGIN !== 'true' || process.env.NODE_ENV === 'production') {
    // Intentionally indistinguishable from "route doesn't exist".
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  try {
    const user = await User.findOne({ role: 'admin' });
    if (!user) {
      // No admin exists — no way to bypass into nothing.
      return res.status(404).json({ success: false, error: 'No admin user found to log in as' });
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }

    logAuthEvent('DEV_LOGIN', user.internalId, true, { username: user.username, reason: 'dev admin bypass button' });

    // Generate JWT tokens using centralized functions (same as signin)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token as HttpOnly cookie (same as signin)
    setRefreshTokenCookie(res, refreshToken);

    await user.save();

    res.json({
      success: true,
      accessToken,
      user: {
        internalId: user.internalId,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Dev login error:', error);
    res.status(500).json({ success: false, error: 'Failed to log in' });
  }
});

module.exports = router;
