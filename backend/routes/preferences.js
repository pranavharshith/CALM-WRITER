const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');

// GET /preferences - Fetch user preferences
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      preferences: user.preferences || {
        calmMode: true,
        fontSize: 'medium',
        autoScroll: false,
        autoScrollSpeed: 50,
        preferredLanguage: 'en'
      }
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
});

// POST /preferences - Update user preferences
router.post('/', requireAuth, async (req, res) => {
  try {
    const { calmMode, fontSize, autoScroll, autoScrollSpeed, preferredLanguage } = req.body;

    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Validate inputs
    if (fontSize && !['small', 'medium', 'large'].includes(fontSize)) {
      return res.status(400).json({ success: false, error: 'Invalid font size' });
    }

    if (autoScrollSpeed !== undefined && (autoScrollSpeed < 1 || autoScrollSpeed > 100)) {
      return res.status(400).json({ success: false, error: 'Auto scroll speed must be 1-100' });
    }

    // Update preferences
    user.preferences = {
      calmMode: calmMode !== undefined ? calmMode : user.preferences.calmMode,
      fontSize: fontSize || user.preferences.fontSize,
      autoScroll: autoScroll !== undefined ? autoScroll : user.preferences.autoScroll,
      autoScrollSpeed: autoScrollSpeed !== undefined ? autoScrollSpeed : user.preferences.autoScrollSpeed,
      preferredLanguage: preferredLanguage || user.preferences.preferredLanguage
    };

    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

module.exports = router;
