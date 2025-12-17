const express = require('express');
const router = express.Router();
const ReadSession = require('../models/ReadSession');

// Middleware: Check session by internalId
function requireSession(req, res, next) {
  const userId = req.header('X-Internal-Id');
  if (!userId) return res.status(401).json({ error: 'Missing session' });
  req.internalId = userId;
  next();
}

// POST /reads/track -- track reading progress
router.post('/track', requireSession, async (req, res) => {
  const { storyId, percentRead } = req.body;
  if (!storyId || typeof percentRead !== 'number') {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  // Find or create read session
  let session = await ReadSession.findOne({ 
    userInternalId: req.internalId, 
    storyId 
  });
  
  if (!session) {
    session = new ReadSession({ 
      userInternalId: req.internalId, 
      storyId,
      startedAt: new Date()
    });
  }
  
  session.percentRead = Math.max(session.percentRead || 0, percentRead);
  if (percentRead >= 90 && !session.completedAt) {
    session.completedAt = new Date();
  }
  
  await session.save();
  res.json({ success: true });
});

// POST /reads/start -- user starts reading a story
router.post('/start', requireSession, async (req, res) => {
  const { storyId } = req.body;
  if (!storyId) return res.status(400).json({ error: 'Missing fields' });
  const session = new ReadSession({ 
    userInternalId: req.internalId, 
    storyId,
    startedAt: new Date()
  });
  await session.save();
  res.json({ sessionId: session._id });
});

// POST /reads/complete -- user finishes a story
router.post('/complete', async (req, res) => {
  const { sessionId, percentRead, timeSpent } = req.body;
  if (!sessionId || typeof percentRead !== 'number' || typeof timeSpent !== 'number') return res.status(400).json({ error: 'Missing fields'});
  const session = await ReadSession.findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Not found' });
  session.percentRead = percentRead;
  session.timeSpent = timeSpent;
  session.completedAt = new Date();
  await session.save();
  res.json({ success: true });
});

module.exports = router;

