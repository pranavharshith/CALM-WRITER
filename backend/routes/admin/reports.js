const {
  express, Report, Story, StoryNode, User, Bookmark, Like, ModeratorApplication,
  requireAdmin, requireAuth, reportLimiter, logAdminAction, adminLimiter,
} = require('./_shared');

const router = express.Router();
router.use(requireAuth);

// POST /admin/report - Regular users can report stories or nodes (with rate limiting)
router.post('/report', requireAuth, reportLimiter, async (req, res) => {
  const { storyId, storyNodeId, reason, details } = req.body;

  // Must have either storyId or storyNodeId
  if (!storyId && !storyNodeId) {
    return res.status(400).json({
      success: false,
      error: 'Story ID or node ID required'
    });
  }

  // Validate reason
  if (!['spam', 'hate', 'harassment', 'explicit_harm', 'inappropriate_content', 'plagiarism', 'other'].includes(reason)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report reason'
    });
  }

  // Validate details field - max 5000 characters
  if (details && typeof details === 'string') {
    if (details.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Report details must not exceed 5000 characters'
      });
    }
    // Sanitize details to prevent injection
    if (/<script|javascript:|onerror|onclick/i.test(details)) {
      return res.status(400).json({
        success: false,
        error: 'Report details contain invalid content'
      });
    }
  }

  const report = new Report({
    userInternalId: req.internalId,
    storyId: storyId || null,
    storyNodeId: storyNodeId || null,
    reason,
    details: details ? details.trim() : '',
    status: 'pending',
  });
  await report.save();

  res.json({ success: true, reportId: report._id });
});

module.exports = router;
