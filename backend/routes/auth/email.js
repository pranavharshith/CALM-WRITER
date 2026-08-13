const {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, csrfLimiter, refreshLimiter,
  GENERIC_AUTH_ERROR, setRefreshTokenCookie,
} = require('./_shared');

const router = express.Router();

// POST /auth/verify-email - Verify email with token
router.post('/verify-email', authLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    logAuthEvent('EMAIL_VERIFIED', user.internalId, true);

    // Send welcome email NOW after verification
    try {
      const { sendWelcomeEmail } = require('../../services/emailService');
      await sendWelcomeEmail(user.email, user.username);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    // Auto-login after verification
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      message: 'Email verified successfully',
      accessToken,
      // refreshToken removed from body
      user: {
        internalId: user.internalId,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify email' });
  }
});

// POST /auth/resend-verification - Resend verification email
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Security: Always return success even if user not found or already verified
    if (!user || user.isEmailVerified) {
      return res.json({ success: true, message: 'If account requires verification, email has been sent.' });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send email
    try {
      const { sendVerificationEmail } = require('../../services/emailService');
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Resend verification email failed:', emailError);
    }

    res.json({ success: true, message: 'Verification email sent.' });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to resend verification email' });
  }
});

module.exports = router;
