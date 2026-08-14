const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { listAchievements, evaluateAchievements } = require('../../utils/achievements');
const { ensureBackfilled, computeStreak, computeBestStreak } = require('../../utils/writingDay');
const WritingDay = require('../../models/WritingDay');
const User = require('../../models/User');

// GET /users/achievements
router.get('/', requireAuth, async (req, res) => {
  try {
    await ensureBackfilled(req.internalId);
    const user = await User.findOne({ internalId: req.internalId }).select('freezeUsedDates');
    const days = await WritingDay.find({ userInternalId: req.internalId }).select('date').lean();
    const keys = days.map((d) => d.date);
    const { currentStreak } = computeStreak(keys, user?.freezeUsedDates || []);
    await evaluateAchievements(req.internalId, {
      currentStreak,
      bestStreak: computeBestStreak(keys)
    });
    const { earned, locked } = await listAchievements(req.internalId);
    res.json({ success: true, earned, locked });
  } catch (error) {
    console.error('Achievements fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
});

module.exports = router;
