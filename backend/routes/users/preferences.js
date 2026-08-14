const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { requireAuth } = require('../../middleware/auth');
const { clampGoal, DEFAULT_GOAL } = require('../../utils/writingDay');

function normalizeScrollSpeed(value) {
  if (value === 'slow' || value === 'medium' || value === 'fast') return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return 'medium';
  if (n <= 33) return 'slow';
  if (n <= 66) return 'medium';
  return 'fast';
}

function publicPreferences(prefs = {}) {
  return {
    calmMode: prefs.calmMode !== false,
    fontSize: ['small', 'medium', 'large'].includes(prefs.fontSize) ? prefs.fontSize : 'medium',
    autoScroll: !!prefs.autoScroll,
    autoScrollSpeed: normalizeScrollSpeed(prefs.autoScrollSpeed),
    preferredLanguage: prefs.preferredLanguage || 'en',
    dailyWordGoal: clampGoal(prefs.dailyWordGoal ?? DEFAULT_GOAL),
  };
}

// GET /preferences - Fetch user preferences
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      preferences: publicPreferences(user.preferences)
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
});

// POST /preferences - Update user preferences
router.post('/', requireAuth, async (req, res) => {
  try {
    const { calmMode, fontSize, autoScroll, autoScrollSpeed, preferredLanguage, dailyWordGoal } = req.body;

    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (fontSize && !['small', 'medium', 'large'].includes(fontSize)) {
      return res.status(400).json({ success: false, error: 'Invalid font size' });
    }

    if (autoScrollSpeed !== undefined && !['slow', 'medium', 'fast'].includes(normalizeScrollSpeed(autoScrollSpeed))) {
      return res.status(400).json({ success: false, error: 'Invalid auto-scroll speed' });
    }

    const current = publicPreferences(user.preferences);
    user.preferences = {
      calmMode: calmMode !== undefined ? !!calmMode : current.calmMode,
      fontSize: fontSize || current.fontSize,
      autoScroll: autoScroll !== undefined ? !!autoScroll : current.autoScroll,
      autoScrollSpeed: autoScrollSpeed !== undefined ? normalizeScrollSpeed(autoScrollSpeed) : current.autoScrollSpeed,
      preferredLanguage: preferredLanguage || current.preferredLanguage,
      dailyWordGoal: dailyWordGoal !== undefined ? clampGoal(dailyWordGoal) : current.dailyWordGoal
    };

    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated',
      preferences: publicPreferences(user.preferences)
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

module.exports = router;
