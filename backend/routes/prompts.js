const express = require('express');
const router = express.Router();
const DailyPrompt = require('../models/DailyPrompt');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth-consolidated');
const { requireAdmin } = require('../middleware/adminAuth');

// GET /prompts/current - Get today's prompt
router.get('/current', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let prompt = await DailyPrompt.findOne({
            activeDate: today,
            isActive: true
        });

        // If no prompt for today, auto-rotate from bank
        if (!prompt) {
            const allPrompts = await DailyPrompt.find({ isActive: true }).sort({ order: 1 });
            if (allPrompts.length > 0) {
                // Get next prompt in rotation
                const lastUsed = await DailyPrompt.findOne().sort({ activeDate: -1 });
                const nextIndex = lastUsed ? (lastUsed.order + 1) % allPrompts.length : 0;

                prompt = allPrompts[nextIndex];
                prompt.activeDate = today;
                await prompt.save();
            }
        }

        res.json({ prompt });
    } catch (error) {
        console.error('Get current prompt error:', error);
        res.status(500).json({ error: 'Failed to get prompt' });
    }
});

// POST /prompts/create - Admin creates prompt
router.post('/create', requireAdmin, async (req, res) => {
    try {
        const { prompt, description } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt text required' });
        }

        const promptCount = await DailyPrompt.countDocuments();

        const newPrompt = new DailyPrompt({
            prompt,
            description,
            activeDate: new Date(),
            createdBy: req.internalId,
            order: promptCount
        });

        await newPrompt.save();

        res.json({ success: true, prompt: newPrompt });
    } catch (error) {
        console.error('Create prompt error:', error);
        res.status(500).json({ error: 'Failed to create prompt' });
    }
});

// GET /prompts/history - Get past prompts
router.get('/history', async (req, res) => {
    try {
        const prompts = await DailyPrompt.find()
            .sort({ activeDate: -1 })
            .limit(30);

        res.json({ prompts });
    } catch (error) {
        console.error('Get prompt history error:', error);
        res.status(500).json({ error: 'Failed to get prompt history' });
    }
});

module.exports = router;
