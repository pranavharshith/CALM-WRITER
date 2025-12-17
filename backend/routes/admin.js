const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Story = require('../models/Story');
const User = require('../models/User');

// POST /admin/report - Regular users can report stories (hate, spam, harm only)
router.post('/report', async (req, res) => {
  const { userInternalId, storyId, reason, details } = req.body;
  if (!userInternalId || !storyId || !['hate', 'spam', 'harm'].includes(reason)) {
    return res.status(400).json({ error: 'Invalid report' });
  }
  const report = new Report({ userInternalId, storyId, reason, details });
  await report.save();
  res.json({ success: true });
});

// POST /admin/delete-story - Admin only (no UI for now, basic endpoint)
router.post('/delete-story', async (req, res) => {
  const { storyId, adminSecret } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  await Story.deleteOne({ _id: storyId });
  res.json({ success: true });
});

module.exports = router;

