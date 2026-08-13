const {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, csrfLimiter, refreshLimiter,
  GENERIC_AUTH_ERROR, setRefreshTokenCookie,
} = require('./_shared');

const router = express.Router();

// GET /auth/csrf-token - Get CSRF token for frontend
router.get('/csrf-token', (req, res) => {
  try {
    // CSRF token is already set in cookie by middleware.
    // Use req.csrfToken (set by generateCSRFTokenMiddleware) so the VERY FIRST
    // request works — on a fresh browser req.cookies is empty even though the
    // middleware just wrote the cookie in the same request's response.
    const csrfToken = req.csrfToken || req.cookies[CSRF_COOKIE_NAME];

    if (!csrfToken) {
      return res.status(400).json({
        success: false,
        error: 'CSRF token not available'
      });
    }

    res.json({
      success: true,
      token: csrfToken
    });
  } catch (error) {
    console.error('CSRF token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CSRF token'
    });
  }
});

module.exports = router;
