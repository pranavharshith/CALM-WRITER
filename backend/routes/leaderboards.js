const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const ReadSession = require('../models/ReadSession');
const Reaction = require('../models/Reaction');
const User = require('../models/User');

// GET /leaderboards/most-felt - Stories with high completion and reactions
router.get('/most-felt', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get all non-hidden stories
    const stories = await Story.find({ hidden: false }).lean();
    
    // Calculate "felt" score for each story
    const scoredStories = await Promise.all(stories.map(async (story) => {
      const reads = await ReadSession.find({ storyId: story._id });
      const reactions = await Reaction.countDocuments({ storyId: story._id });
      
      if (reads.length === 0) {
        return { story, score: 0 };
      }
      
      // Completion rate (0-1)
      const completionRate = reads.filter(r => r.percentRead >= 90).length / reads.length;
      
      // Average time spent (normalized)
      const avgTimeSpent = reads.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / reads.length;
      const normalizedTime = Math.min(avgTimeSpent / 60000, 1); // Cap at 1 minute = 1.0
      
      // Reaction rate (reactions per read)
      const reactionRate = reactions / reads.length;
      
      // Score: heavily weight completion and reactions, slightly ignore total likes
      const score = (completionRate * 3) + (normalizedTime * 2) + (reactionRate * 4);
      
      return { story, score, completionRate, reactions, reads: reads.length };
    }));
    
    // Sort by score and take top N
    scoredStories.sort((a, b) => b.score - a.score);
    const topStories = scoredStories.slice(0, limit);
    
    // Enrich with author info
    const enrichedStories = await Promise.all(topStories.map(async ({ story, completionRate, reactions, reads }) => {
      const author = await User.findOne({ internalId: story.internalAuthorId });
      return {
        _id: story._id,
        title: story.title,
        preview: story.text.substring(0, 150) + '...',
        authorUsername: author?.username || 'Anonymous',
        completionRate: Math.round(completionRate * 100),
        reactions,
        reads,
        createdAt: story.createdAt,
      };
    }));
    
    res.json({
      lens: 'most_felt',
      description: 'Stories people stayed with',
      stories: enrichedStories,
    });
  } catch (error) {
    console.error('Most Felt error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /leaderboards/quietly-powerful - Low exposure, high completion, has engagement
router.get('/quietly-powerful', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get all non-hidden stories
    const stories = await Story.find({ hidden: false }).lean();
    
    // Calculate "quietly powerful" score
    const scoredStories = await Promise.all(stories.map(async (story) => {
      const reads = await ReadSession.find({ storyId: story._id });
      const reactions = await Reaction.countDocuments({ storyId: story._id });
      const continuations = await StoryNode.countDocuments({ 
        rootStoryId: story._id, 
        type: 'CONTINUATION',
        hidden: false 
      });
      const responses = await StoryNode.countDocuments({ 
        rootStoryId: story._id, 
        type: 'RESPONSE',
        hidden: false 
      });
      
      // Must have low exposure (few reads)
      if (reads.length > 50 || reads.length < 3) {
        return { story, score: 0 };
      }
      
      // Must have high completion
      const completionRate = reads.filter(r => r.percentRead >= 90).length / reads.length;
      if (completionRate < 0.7) {
        return { story, score: 0 };
      }
      
      // Must have at least one continuation OR multiple responses
      const hasEngagement = continuations > 0 || responses >= 2;
      if (!hasEngagement) {
        return { story, score: 0 };
      }
      
      // Score: reward high completion with low exposure
      const score = completionRate * (1 / Math.log(reads.length + 2)) * (continuations * 2 + responses);
      
      return { story, score, completionRate, reads: reads.length, continuations, responses };
    }));
    
    // Filter out zero scores and sort
    const validStories = scoredStories.filter(s => s.score > 0);
    validStories.sort((a, b) => b.score - a.score);
    const topStories = validStories.slice(0, limit);
    
    // Enrich with author info
    const enrichedStories = await Promise.all(topStories.map(async ({ story, completionRate, reads, continuations, responses }) => {
      const author = await User.findOne({ internalId: story.internalAuthorId });
      return {
        _id: story._id,
        title: story.title,
        preview: story.text.substring(0, 150) + '...',
        authorUsername: author?.username || 'Anonymous',
        completionRate: Math.round(completionRate * 100),
        reads,
        continuations,
        responses,
        createdAt: story.createdAt,
      };
    }));
    
    res.json({
      lens: 'quietly_powerful',
      description: 'Hidden gems with deep impact',
      stories: enrichedStories,
    });
  } catch (error) {
    console.error('Quietly Powerful error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /leaderboards/growing-stories - Active continuations and ongoing engagement
router.get('/growing-stories', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const daysAgo = parseInt(req.query.days) || 7; // Default to last 7 days
    
    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Get all non-hidden stories
    const stories = await Story.find({ hidden: false }).lean();
    
    // Calculate "growing" score
    const scoredStories = await Promise.all(stories.map(async (story) => {
      // Get recent activity
      const recentNodes = await StoryNode.find({
        rootStoryId: story._id,
        createdAt: { $gte: cutoffDate },
        hidden: false,
      });
      
      const recentReads = await ReadSession.find({
        storyId: story._id,
        startedAt: { $gte: cutoffDate },
      });
      
      const recentReactions = await Reaction.find({
        storyId: story._id,
        createdAt: { $gte: cutoffDate },
      });
      
      const continuations = recentNodes.filter(n => n.type === 'CONTINUATION').length;
      const responses = recentNodes.filter(n => n.type === 'RESPONSE').length;
      
      // Must have ongoing activity
      if (continuations === 0 && responses === 0) {
        return { story, score: 0 };
      }
      
      // Check if activity is spread over multiple days
      const activityDates = new Set();
      recentNodes.forEach(n => {
        activityDates.add(n.createdAt.toDateString());
      });
      const daysActive = activityDates.size;
      
      // Score: reward sustained engagement over time
      const score = (continuations * 3 + responses * 1.5) * daysActive * (recentReads.length / 10);
      
      return { 
        story, 
        score, 
        continuations, 
        responses, 
        recentReads: recentReads.length,
        daysActive,
      };
    }));
    
    // Filter and sort
    const validStories = scoredStories.filter(s => s.score > 0);
    validStories.sort((a, b) => b.score - a.score);
    const topStories = validStories.slice(0, limit);
    
    // Enrich with author info
    const enrichedStories = await Promise.all(topStories.map(async ({ story, continuations, responses, recentReads, daysActive }) => {
      const author = await User.findOne({ internalId: story.internalAuthorId });
      return {
        _id: story._id,
        title: story.title,
        preview: story.text.substring(0, 150) + '...',
        authorUsername: author?.username || 'Anonymous',
        continuations,
        responses,
        recentReads,
        daysActive,
        createdAt: story.createdAt,
      };
    }));
    
    res.json({
      lens: 'growing_stories',
      description: 'Stories that keep evolving',
      stories: enrichedStories,
    });
  } catch (error) {
    console.error('Growing Stories error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
