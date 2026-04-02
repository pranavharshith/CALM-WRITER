const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const { passwordResetLimiter, authLimiter } = require('../middleware/rateLimiter');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth } = require('../middleware/auth-consolidated');
const { passwordValidationMiddleware } = require('../middleware/passwordValidation');
const { logAuthEvent, logSecurityEvent } = require('../utils/logger');
const TokenBlacklist = require('../models/TokenBlacklist');
const { CSRF_COOKIE_NAME } = require('../middleware/csrfProtection');
const rateLimit = require('express-rate-limit');
const { ipKey } = require('express-rate-limit');

// Rate limiter for CSRF token requests - 200 per 15 minutes (very generous for page reloads)
const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many CSRF token requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKey(req),
  skip: (req) => req.path === '/auth/csrf-token' && req.method === 'GET' // Don't count GET requests
});

// GET /auth/csrf-token - Get CSRF token for frontend
router.get('/csrf-token', (req, res) => {
  try {
    // CSRF token is already set in cookie by middleware
    // Return it in response for frontend to use in headers
    const csrfToken = req.cookies[CSRF_COOKIE_NAME];

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

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in production
    sameSite: 'strict', // Protect against CSRF
    path: '/auth/refresh', // Only send cookie to refresh endpoint
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  res.cookie('refreshToken', token, cookieOptions);
};

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
      const { sendVerificationEmail } = require('../services/emailService');
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

// Generic error messages for auth failures to prevent user enumeration
const GENERIC_AUTH_ERROR = 'Invalid credentials';

// POST /auth/signin - Sign in with username/email and password
router.post('/signin', async (req, res) => {
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

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before logging in.',
        requireVerification: true,
        email: user.email
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
      const { logSecurityEvent } = require('../utils/logger');
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
    const { sendOTPEmail } = require('../services/emailService');
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
    const { isPasswordReused } = require('../middleware/passwordValidation');
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
    const { logSecurityEvent } = require('../utils/logger');
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

// POST /auth/refresh - Refresh access token using HttpOnly cookie
router.post('/refresh', passwordResetLimiter, async (req, res) => {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token is not blacklisted
    const blacklisted = await TokenBlacklist.findOne({ token: refreshToken });
    if (blacklisted) {
      res.clearCookie('refreshToken', { path: '/auth/refresh' });
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
      res.clearCookie('refreshToken', { path: '/auth/refresh' });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Verify user still exists
    const user = await User.findOne({ internalId: decoded.internalId });
    if (!user) {
      res.clearCookie('refreshToken', { path: '/auth/refresh' });
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check token version (Global Logout)
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      res.clearCookie('refreshToken', { path: '/auth/refresh' });
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

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', { path: '/auth/refresh' });

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ success: false, error: 'Failed to logout from all devices' });
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
    const { sendOTPEmail } = require('../services/emailService');
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
router.post('/verify-otp', async (req, res) => {
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
      const { sendWelcomeEmail } = require('../services/emailService');
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
      const { sendVerificationEmail } = require('../services/emailService');
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

module.exports = router;
