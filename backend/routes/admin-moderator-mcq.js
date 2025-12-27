const User = require('../models/User');
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const Report = require('../models/Report');
const Bookmark = require('../models/Bookmark');
const ModeratorApplication = require('../models/ModeratorApplication');

// Scenario questions for moderator application (multiple choice)
const MOD_SCENARIOS = [
    {
        scenarioId: 1,
        scenario: "A user posts a story that contains a suicide threat/note. What is your immediate action?",
        options: [
            "A) Delete the story immediately without comment",
            "B) Lock the thread and pin a comment with mental health helpline resources",
            "C) Ignore it as creative writing",
            "D) Issue a timeout to the user"
        ],
        correctAnswer: "B"
    },
    {
        scenarioId: 2,
        scenario: "Two users are having a heated argument in story continuations, using mild insults but not severe harassment. What do you do?",
        options: [
            "A) Ban both users immediately",
            "B) Delete all their comments",
            "C) Pin a warning comment asking them to keep it civil, and monitor the situation",
            "D) Do nothing until it escalates to severe harassment"
        ],
        correctAnswer: "C"
    },
    {
        scenarioId: 3,
        scenario: "At 3 AM, a bot attack posts 50 spam stories with casino links. You're the only mod online. What's your priority?",
        options: [
            "A) Vote to delete each story and wait for 2 more mods to also vote",
            "B) Soft-hide all the stories immediately to clean the feed, then vote for permanent deletion",
            "C) Wait for the admin to wake up and handle it",
            "D) Issue timeouts to all the bot accounts"
        ],
        correctAnswer: "B"
    }
];

// POST /admin/apply-moderator - Submit moderator application with MCQ test
router.post('/apply-moderator', async (req, res) => {
    try {
        const userInternalId = req.header('X-Internal-Id');
        if (!userInternalId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { essay, scenarioAnswers } = req.body;

        if (!essay || essay.length < 200) {
            return res.status(400).json({ error: 'Essay must be at least 200 words' });
        }

        if (!scenarioAnswers || scenarioAnswers.length !== 3) {
            return res.status(400).json({ error: 'Must answer all 3 scenario questions' });
        }

        const user = await User.findOne({ internalId: userInternalId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role !== 'user') {
            return res.status(400).json({ error: 'Only regular users can apply for moderator' });
        }

        // Check eligibility (same as before)
        const accountAge = (Date.now() - user.joinedAt) / (1000 * 60 * 60 * 24);
        const storiesCount = await Story.countDocuments({ internalAuthorId: userInternalId });
        const continuationsCount = await StoryNode.countDocuments({
            authorInternalId: userInternalId,
            type: 'CONTINUATION'
        });
        const stories = await Story.find({ internalAuthorId: userInternalId });
        const totalLikes = stories.reduce((sum, story) => sum + (story.likes || 0), 0);
        const bookmarkedStoriesCount = await Bookmark.countDocuments({
            storyId: { $in: stories.map(s => s._id) }
        });
        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        const reportsAgainst = await Report.countDocuments({
            $or: [
                { storyId: { $in: stories.map(s => s._id) } },
            ],
            createdAt: { $gte: sixMonthsAgo },
            status: 'actioned'
        });

        const meetsRequirements = accountAge >= 90 && storiesCount >= 10 &&
            continuationsCount >= 50 && totalLikes >= 500 &&
            bookmarkedStoriesCount >= 5 && reportsAgainst === 0;

        if (!meetsRequirements) {
            return res.status(403).json({ error: 'You do not meet the moderator requirements' });
        }

        // CRITICAL FIX: Auto-grade scenario tests
        const gradedScenarios = scenarioAnswers.map((answer, index) => {
            const scenario = MOD_SCENARIOS[index];
            const isCorrect = answer.selectedAnswer === scenario.correctAnswer;

            return {
                scenarioId: scenario.scenarioId,
                scenario: scenario.scenario,
                options: scenario.options,
                selectedAnswer: answer.selectedAnswer,
                correctAnswer: scenario.correctAnswer,
                isCorrect
            };
        });

        // Check if any answer is wrong
        const autoRejected = gradedScenarios.some(s => !s.isCorrect);

        // Create application
        const application = new ModeratorApplication({
            userInternalId,
            username: user.username,
            email: user.email,
            eligibility: {
                accountAge,
                storiesCount,
                continuationsCount,
                totalLikes,
                bookmarkedStories: bookmarkedStoriesCount,
                reportsAgainst,
                meetsRequirements
            },
            essay,
            scenarioAnswers: gradedScenarios,
            autoRejected,
            status: autoRejected ? 'rejected' : 'pending'
        });

        await application.save();

        if (autoRejected) {
            return res.json({
                success: false,
                message: 'Application automatically rejected due to incorrect scenario answers',
                applicationId: application._id,
                autoRejected: true,
                incorrectCount: gradedScenarios.filter(s => !s.isCorrect).length
            });
        }

        res.json({
            success: true,
            message: 'Application submitted successfully. An admin will review your essay.',
            applicationId: application._id
        });
    } catch (error) {
        console.error('Apply moderator error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

module.exports = { router, MOD_SCENARIOS };
