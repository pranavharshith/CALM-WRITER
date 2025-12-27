const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const User = require('../models/User');

const SOFT_WORD_LIMIT = 800;

// Middleware: Check session by internalId
function requireSession(req, res, next) {
  const userId = req.header('X-Internal-Id');
  if (!userId) return res.status(401).json({ error: 'Missing session' });
  req.internalId = userId;
  next();
}

// POST /threads/:storyId/continue - Original author creates continuation chapter
router.post('/:storyId/continue', requireSession, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount > SOFT_WORD_LIMIT) {
      return res.status(400).json({ error: 'Try to keep continuations under 800 words.' });
    }

    // Get original story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check if thread is locked
    if (story.threadLocked) {
      return res.status(403).json({ error: 'This thread has been locked by moderators' });
    }

    // Only original author can create continuation
    if (story.internalAuthorId !== req.internalId) {
      return res.status(403).json({ error: 'Only the original author can continue this story' });
    }

    // Create continuation node
    const continuation = new StoryNode({
      parentStoryId: storyId,
      rootStoryId: storyId,
      authorInternalId: req.internalId,
      content,
      type: 'CONTINUATION',
      wordCount,
      locked: true,
    });

    await continuation.save();

    res.json({ 
      success: true, 
      nodeId: continuation._id,
      message: 'Continuation added'
    });
  } catch (error) {
    console.error('Continue error:', error);
    res.status(500).json({ error: 'Failed to create continuation' });
  }
});

// POST /threads/:storyId/respond - Any user creates response (not nested)
router.post('/:storyId/respond', requireSession, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { content, nodeId } = req.body; // nodeId optional - can respond to story or specific continuation

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount > SOFT_WORD_LIMIT) {
      return res.status(400).json({ error: 'Try to keep responses under 800 words.' });
    }

    // Get original story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check if thread is locked
    if (story.threadLocked) {
      return res.status(403).json({ error: 'This thread has been locked by moderators' });
    }

    // If responding to a specific node, verify it exists
    let parentNode = null;
    if (nodeId) {
      parentNode = await StoryNode.findById(nodeId);
      if (!parentNode || parentNode.rootStoryId.toString() !== storyId) {
        return res.status(404).json({ error: 'Node not found' });
      }
    }

    // Create response node
    const response = new StoryNode({
      parentStoryId: storyId,
      rootStoryId: storyId,
      authorInternalId: req.internalId,
      content,
      type: 'RESPONSE',
      wordCount,
      locked: true,
      parentNodeId: nodeId || null,
    });

    await response.save();

    res.json({ 
      success: true, 
      nodeId: response._id,
      message: 'Response added'
    });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

// GET /threads/:storyId - Get full thread (story + continuations + responses)
router.get('/:storyId', requireSession, async (req, res) => {
  try {
    const { storyId } = req.params;

    // Get original story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Don't show hidden stories unless user is moderator/admin
    const user = await User.findOne({ internalId: req.internalId });
    const isModerator = user && ['moderator', 'admin'].includes(user.role);
    
    if (story.hidden && !isModerator) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Get author info
    const author = await User.findOne({ internalId: story.internalAuthorId });

    // Get all nodes for this thread
    const nodes = await StoryNode.find({ rootStoryId: storyId }).sort({ createdAt: 1 });

    // Separate continuations and responses
    const continuations = nodes.filter(n => n.type === 'CONTINUATION' && (!n.hidden || isModerator));
    const responses = nodes.filter(n => n.type === 'RESPONSE' && (!n.hidden || isModerator));

    // Enrich with author info
    const enrichedContinuations = await Promise.all(continuations.map(async (node) => {
      const nodeAuthor = await User.findOne({ internalId: node.authorInternalId });
      return {
        ...node.toObject(),
        authorUsername: nodeAuthor?.username || 'Anonymous',
        authorRole: nodeAuthor?.role || 'user',
      };
    }));

    const enrichedResponses = await Promise.all(responses.map(async (node) => {
      const nodeAuthor = await User.findOne({ internalId: node.authorInternalId });
      return {
        ...node.toObject(),
        authorUsername: nodeAuthor?.username || 'Anonymous',
        authorRole: nodeAuthor?.role || 'user',
      };
    }));

    res.json({
      story: {
        ...story.toObject(),
        authorUsername: author?.username || 'Anonymous',
        authorRole: author?.role || 'user',
      },
      continuations: enrichedContinuations,
      responses: enrichedResponses,
      threadLocked: story.threadLocked,
      isOriginalAuthor: story.internalAuthorId === req.internalId,
    });
  } catch (error) {
    console.error('Thread fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// GET /threads/:storyId/has-thread - Check if story has continuations or responses
router.get('/:storyId/has-thread', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    const nodeCount = await StoryNode.countDocuments({ 
      rootStoryId: storyId,
      hidden: false 
    });

    res.json({ 
      hasThread: nodeCount > 0,
      nodeCount 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check thread' });
  }
});

module.exports = router;
