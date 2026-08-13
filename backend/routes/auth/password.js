const {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, csrfLimiter, refreshLimiter,
  GENERIC_AUTH_ERROR, setRefreshTokenCookie,
} = require('./_shared');

const router = express.Router();

// POST /auth/forgot-password - Send OTP for password reset
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ success: true, message: 'If email exists, OTP has been sent' });
    }

    // Generate 8-digit OTP using cryptographically secure random
    const otp = crypto.randomInt(10000000, 99999999).toString();
    await user.setOTP(otp);
    await user.save();

    // Send OTP via email
    const { sendOTPEmail } = require('../../services/emailService');
    const emailSent = await sendOTPEmail(email, otp);

    res.json({
      success: true,
      message: emailSent ? 'OTP sent to your email' : 'OTP generated (check server console in development)'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /auth/reset-password - Reset password with OTP
router.post('/reset-password', passwordResetLimiter, passwordValidationMiddleware, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or OTP' });
    }

    // Verify OTP
    const isValidOTP = await user.verifyOTP(otp);
    if (!isValidOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Check if new password is reused
    const { isPasswordReused } = require('../../middleware/passwordValidation');
    const reused = await isPasswordReused(newPassword, user.passwordHistory);
    if (reused) {
      return res.status(400).json({
        success: false,
        error: 'Password has been used before. Please choose a different password.'
      });
    }

    // Set new password
    await user.setPassword(newPassword);
    user.clearOTP();

    // Rotate token version to invalidate all sessions on password reset
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    // CRITICAL FIX: Invalidate ALL existing tokens for this user (token rotation on sensitive operation)
    // Clean up old blacklist entries to prevent database bloat
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await TokenBlacklist.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    // Add all existing tokens to blacklist to force re-authentication
    const { logSecurityEvent } = require('../../utils/logger');
    logSecurityEvent('PASSWORD_RESET_ALL_TOKENS_INVALIDATED', {
      userId: user.internalId,
      email: user.email
    });

    logAuthEvent('PASSWORD_RESET_SUCCESS', user.internalId, true);

    res.json({
      success: true,
      message: 'Password reset successfully. Please sign in again.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /auth/request-otp - Alias for forgot-password (frontend compatibility)
router.post('/request-otp', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ success: true, message: 'If email exists, OTP has been sent' });
    }

    // Generate 8-digit OTP using cryptographically secure random
    const otp = crypto.randomInt(10000000, 99999999).toString();
    await user.setOTP(otp);
    await user.save();

    // Send OTP via email
    const { sendOTPEmail } = require('../../services/emailService');
    const emailSent = await sendOTPEmail(email, otp);

    res.json({
      success: true,
      message: emailSent ? 'OTP sent to your email' : 'OTP generated (check server console in development)'
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /auth/verify-otp - Verify OTP code
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or OTP' });
    }

    // Verify OTP with timing attack protection
    const isValidOTP = await user.verifyOTP(otp);
    if (!isValidOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

module.exports = router;
