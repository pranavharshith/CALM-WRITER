const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Story = require('../models/Story');
const User = require('../models/User');

// POST /admin/report - Regular users can report stories or nodes
router.post('/report', async (req, res) => {
  const { userInternalId, storyId, storyNodeId, reason, details } = req.body;
  
  // Must have either storyId or storyNodeId
  if (!userInternalId || (!storyId && !storyNodeId)) {
    return res.status(400).json({ error: 'User ID and content ID required' });
  }
  
  // Validate reason
  if (!['spam', 'hate', 'harassment', 'explicit_harm'].includes(reason)) {
    return res.status(400).json({ error: 'Invalid report reason' });
  }
  
  const report = new Report({ 
    userInternalId, 
    storyId: storyId || null,
    storyNodeId: storyNodeId || null,
    reason, 
    details,
    status: 'pending',
  });
  await report.save();
  res.json({ success: true, reportId: report._id });
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

