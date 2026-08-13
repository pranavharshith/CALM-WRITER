const {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, csrfLimiter, refreshLimiter,
  GENERIC_AUTH_ERROR, setRefreshTokenCookie,
} = require('./_shared');

const router = express.Router();

// POST /auth/signup - Register new user with username and password
router.post('/signup', authLimiter, passwordValidationMiddleware, async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, username, and password are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Username validation (3-20 characters, alphanumeric + underscore)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)'
      });
    }

    // Keep consistent with /auth/setup-username — reject consecutive underscores
    if (username.includes('__')) {
      return res.status(400).json({
        success: false,
        error: 'Username cannot contain consecutive underscores'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      logSecurityEvent('SIGNUP_DUPLICATE_EMAIL', { email: email.toLowerCase(), ip: req.ip });
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      logSecurityEvent('SIGNUP_DUPLICATE_USERNAME', { username: username.toLowerCase(), ip: req.ip });
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }

    // Create user
    const internalId = crypto.randomBytes(16).toString('hex');
    const user = new User({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      internalId,
      displayName: username,
      tokenVersion: 0 // Initialize token version
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    user.isEmailVerified = false;

    // Set password (hashed)
    await user.setPassword(password);
    await user.save();

    logAuthEvent('SIGNUP_SUCCESS', internalId, true, { username: username.toLowerCase() });

    // Send verification email
    try {
      const { sendVerificationEmail } = require('../../services/emailService');
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Verification email failed:', emailError);
    }

    // Return success but REQUIRE verification
    res.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      requireVerification: true,
      email: user.email
    });
  } catch (error) {
    console.error('Signup error:', error);
    logAuthEvent('SIGNUP_ERROR', 'unknown', false, { error: error.message });

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'email' ? 'Email' : 'Username';
      return res.status(400).json({
        success: false,
        error: `${fieldName} already registered`,
        code: 'DUPLICATE_' + field.toUpperCase()
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
});

module.exports = router;
