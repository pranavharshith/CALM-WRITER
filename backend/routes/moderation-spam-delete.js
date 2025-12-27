// CRITICAL FIX P1: Spam Detection with Trusted User Modifier
function detectSpam(story, userRole) {
    const spamPatterns = [
        /http[s]?:\/\/(bit\.ly|tinyurl|goo\.gl|t\.co)/i, // URL shorteners
        /\b(viagra|cialis|casino|lottery|crypto|bitcoin)\b/i, // Spam keywords
        /(click here|buy now|limited offer|act now|free money)/i, // Spam phrases
        /(\.ru|\.cn)\b/i, // Suspicious TLDs
        /\b\d{10,}\b/, // Long number sequences
    ];

    let score = 0;
    const text = (story.title + ' ' + story.text).toLowerCase();

    // Pattern matching
    spamPatterns.forEach(pattern => {
        if (pattern.test(text)) score++;
    });

    // URL count check
    const urlCount = (text.match(/http[s]?:\/\//g) || []).length;
    if (urlCount > 3) score += 2;

    // CRITICAL FIX: Trusted user modifier (-2 points)
    // Prevents false positives on quality research content
    if (userRole === 'trusted_user' || userRole === 'moderator' || userRole === 'admin') {
        score -= 2;
    }

    // Score cannot be negative
    return Math.max(0, score);
}

// POST /moderation/vote-delete - Moderator votes to permanently delete story
async function voteToDelete(req, res) {
    try {
        const { storyId, reason } = req.body;

        if (!storyId || !reason) {
            return res.status(400).json({ error: 'Story ID and reason required' });
        }

        const Story = require('../models/Story');
        const User = require('../models/User');

        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({ error: 'Story not found' });
        }

        // Check if moderator already voted
        const existingVote = story.deleteVotes.find(v => v.moderatorId === req.internalId);
        if (existingVote) {
            return res.status(400).json({ error: 'You have already voted to delete this story' });
        }

        // Add vote
        story.deleteVotes.push({
            moderatorId: req.internalId,
            votedAt: new Date(),
            reason
        });

        // Get story author's role for spam detection
        const author = await User.findOne({ internalId: story.internalAuthorId });
        const spamScore = detectSpam(story, author?.role || 'user');
        story.spamScore = spamScore;

        // Mark for deletion if 3 votes OR high spam score
        if (story.deleteVotes.length >= 3 || spamScore >= 3) {
            story.markedForDeletion = true;
        }

        await story.save();

        res.json({
            success: true,
            votes: story.deleteVotes.length,
            votesNeeded: Math.max(0, 3 - story.deleteVotes.length),
            spamScore,
            markedForDeletion: story.markedForDeletion
        });
    } catch (error) {
        console.error('Vote delete error:', error);
        res.status(500).json({ error: 'Failed to vote for deletion' });
    }
}

// POST /moderation/permanent-delete - Permanently delete story
async function permanentDelete(req, res) {
    try {
        const { storyId } = req.body;

        if (!storyId) {
            return res.status(400).json({ error: 'Story ID required' });
        }

        const Story = require('../models/Story');
        const ModAction = require('../models/ModAction');

        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({ error: 'Story not found' });
        }

        const hasEnoughVotes = story.deleteVotes.length >= 3;
        const isHighSpam = story.spamScore >= 3;

        if (!hasEnoughVotes && !isHighSpam) {
            return res.status(403).json({
                error: 'Story does not meet deletion criteria',
                votes: story.deleteVotes.length,
                votesNeeded: 3 - story.deleteVotes.length,
                spamScore: story.spamScore
            });
        }

        // Log moderation action
        const modAction = new ModAction({
            moderatorInternalId: req.internalId,
            actionType: 'permanent_delete',
            targetStoryId: storyId,
            reason: `Permanently deleted: ${hasEnoughVotes ? '3 moderator votes' : 'High spam score'}`,
        });
        await modAction.save();

        // Permanently delete
        await Story.findByIdAndDelete(storyId);

        res.json({
            success: true,
            message: 'Story permanently deleted',
            deletionReason: hasEnoughVotes ? 'moderator_votes' : 'spam_detection'
        });
    } catch (error) {
        console.error('Permanent delete error:', error);
        res.status(500).json({ error: 'Failed to permanently delete story' });
    }
}

module.exports = { detectSpam, voteToDelete, permanentDelete };
