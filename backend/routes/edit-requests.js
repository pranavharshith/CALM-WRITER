const express = require('express');
const router = express.Router();
const EditRequest = require('../models/EditRequest');
const Story = require('../models/Story');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');
const { sanitizeStoryMiddleware } = require('../middleware/inputSanitization');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// POST /edit-requests/:storyId/create - Create edit request
router.post('/:storyId/create', requireAuth, sanitizeStoryMiddleware, async (req, res) => {
  try {
    const { proposedText, proposedTitle, reason } = req.body;

    if (!proposedText) {
      return res.status(400).json({ success: false, error: 'Proposed text required' });
    }

    // Validate proposed text length
    if (proposedText.length < 10) {
      return res.status(400).json({ success: false, error: 'Proposed text must be at least 10 characters' });
    }

    if (proposedText.length > 800) {
      return res.status(400).json({ success: false, error: 'Proposed text cannot exceed 800 characters' });
    }

    // Validate proposed title length
    if (proposedTitle && proposedTitle.length > 200) {
      return res.status(400).json({ success: false, error: 'Proposed title cannot exceed 200 characters' });
    }

    // Validate reason length
    if (reason && reason.length > 500) {
      return res.status(400).json({ success: false, error: 'Reason cannot exceed 500 characters' });
    }

    const story = await Story.findById(req.params.storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    if (story.internalAuthorId === req.internalId) {
      return res.status(400).json({ success: false, error: 'Cannot edit your own story' });
    }

    const editRequest = new EditRequest({
      storyId: req.params.storyId,
      authorInternalId: story.internalAuthorId,
      proposerInternalId: req.internalId,
      proposedText,
      proposedTitle: proposedTitle || story.title,
      reason,
      status: 'pending'
    });

    await editRequest.save();

    res.json({
      success: true,
      message: 'Edit request created',
      editRequest: {
        _id: editRequest._id,
        status: editRequest.status,
        createdAt: editRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Edit request creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create edit request' });
  }
});

// GET /edit-requests/:storyId - Fetch edit requests
router.get('/:storyId', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await EditRequest.countDocuments({ storyId: req.params.storyId });
    const editRequests = await EditRequest.find({ storyId: req.params.storyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enriched = await Promise.all(editRequests.map(async (er) => {
      const proposer = await User.findOne({ internalId: er.proposerInternalId });
      return {
        _id: er._id,
        proposedText: er.proposedText.substring(0, 200) + '...',
        proposedTitle: er.proposedTitle,
        reason: er.reason,
        status: er.status,
        votes: er.votes,
        proposer: proposer?.username,
        createdAt: er.createdAt
      };
    }));

    res.json({
      success: true,
      editRequests: enriched,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Edit requests fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch edit requests' });
  }
});

// POST /edit-requests/:requestId/vote - Vote on edit request
router.post('/:requestId/vote', requireAuth, async (req, res) => {
  try {
    const editRequest = await EditRequest.findById(req.params.requestId);
    if (!editRequest) {
      return res.status(404).json({ success: false, error: 'Edit request not found' });
    }

    // Check if already voted
    const hasVoted = editRequest.voters?.includes(req.internalId);

    if (hasVoted) {
      // Remove vote
      editRequest.votes = Math.max(0, editRequest.votes - 1);
      editRequest.voters = editRequest.voters.filter(id => id !== req.internalId);
    } else {
      // Add vote
      editRequest.votes += 1;
      if (!editRequest.voters) editRequest.voters = [];
      editRequest.voters.push(req.internalId);
    }

    await editRequest.save();

    res.json({
      success: true,
      voted: !hasVoted,
      votes: editRequest.votes
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, error: 'Failed to vote on edit request' });
  }
});

// POST /edit-requests/:requestId/author-response - Author response to edit request
router.post('/:requestId/author-response', requireAuth, async (req, res) => {
  try {
    const { approved, note } = req.body;

    const editRequest = await EditRequest.findById(req.params.requestId);
    if (!editRequest) {
      return res.status(404).json({ success: false, error: 'Edit request not found' });
    }

    if (editRequest.authorInternalId !== req.internalId) {
      return res.status(403).json({ success: false, error: 'Only author can respond' });
    }

    editRequest.status = approved ? 'approved' : 'rejected';
    editRequest.authorNote = note;
    editRequest.respondedAt = new Date();

    await editRequest.save();

    // If approved, update story
    if (approved) {
      const story = await Story.findById(editRequest.storyId);
      if (story) {
        story.text = editRequest.proposedText;
        story.title = editRequest.proposedTitle;
        story.editCount = (story.editCount || 0) + 1;
        story.lastEditedAt = new Date();
        await story.save();
      }
    }

    res.json({
      success: true,
      message: `Edit request ${approved ? 'approved' : 'rejected'}`,
      status: editRequest.status
    });
  } catch (error) {
    console.error('Author response error:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to edit request' });
  }
});

module.exports = router;
