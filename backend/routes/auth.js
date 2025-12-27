const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/request-otp
router.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: 'Email required' });
  
  // Skip OTP for admin email - auto login
  if (email === 'pranav.dot.h@gmail.com') {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        internalId: crypto.randomBytes(12).toString('hex'),
        role: 'admin'
      });
      await user.save();
    }
    // Return user data directly without OTP
    return res.json({ 
      skipOtp: true,
      internalId: user.internalId,
      username: user.username,
      needsUsername: !user.username,
      email: user.email,
      role: user.role || 'admin'
    });
  }
  
  let user = await User.findOne({ email });
  if (!user) {
    // Set role based on email
    const role = email === 'pranav.dot.h@gmail.com' ? 'admin' : 'user';
    user = new User({
      email,
      internalId: crypto.randomBytes(12).toString('hex'),
      role
    });
  }
  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user.save();
  // MOCK: Instead of email, output OTP to console for demo
  console.log(`[MOCK OTP] OTP for ${email}:`, otp);
  res.json({ success: true });
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: 'Email/OTP required' });
  const user = await User.findOne({ email });
  if (!user || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  // Clear OTP after successful use
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();
  
  // Return user info including whether username is set
  res.json({ 
    internalId: user.internalId,
    username: user.username,
    needsUsername: !user.username,
    email: user.email,
    role: user.role || 'user'
  });
});

// POST /auth/setup-username
router.post('/setup-username', async (req, res) => {
  const { internalId, username } = req.body;
  if (!internalId || !username) {
    return res.status(400).json({ error: 'Internal ID and username required' });
  }
  
  // Validate username
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters, letters, numbers, and underscores only' });
  }
  
  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  
  // Update user with username
  const user = await User.findOne({ internalId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  user.username = username;
  await user.save();
  
  res.json({ 
    success: true,
    username: user.username,
    internalId: user.internalId,
    email: user.email,
    role: user.role || 'user'
  });
});

module.exports = router;

