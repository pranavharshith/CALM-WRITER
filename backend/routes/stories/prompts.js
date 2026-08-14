const express = require('express');
const router = express.Router();
const DailyPrompt = require('../../models/DailyPrompt');
const User = require('../../models/User');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/adminAuth');

// Built-in prompt bank — used to seed the rotation on first run so the
// daily prompt works even before an admin creates any prompts.
const BUILTIN_PROMPTS = [
  { prompt: 'Write about a small quiet moment that changed your day.', description: 'A gentle warm-up — notice the ordinary.' },
  { prompt: 'Describe a place you love as if seeing it for the first time.', description: 'Slow down and let details breathe.' },
  { prompt: 'Write a letter to a younger version of yourself.', description: 'One page, no need to send it.' },
  { prompt: 'What does "calm" feel like in your body?', description: 'A sensory exploration of stillness.' },
  { prompt: 'Tell the story of an object you have kept for years.', description: 'Give a thing a life of its own.' },
  { prompt: 'The last good conversation you had — what made it good?', description: 'Capture the shape of connection.' },
  { prompt: 'Write about rain, but never say the word "rain".', description: 'A small constraint, a wider view.' },
  { prompt: 'Describe a stranger you remember but never spoke to.', description: 'Fiction or memory — both count.' },
  { prompt: 'What did you learn this week that surprised you?', description: 'A weekly reflection in a few lines.' },
  { prompt: 'Write the first paragraph of a story that starts with a door closing.', description: 'Let the scene open from that sound.' },
  { prompt: 'A habit from your childhood that has quietly stayed.', description: 'Follow the thread into the present.' },
  { prompt: 'Name one thing you are grateful for today, and why it matters.', description: 'A short, honest entry.' },
  { prompt: 'In five sentences, describe your perfect morning.', description: 'Precise, gentle, yours.' },
  { prompt: 'Write about light — window light, lamplight, screen light.', description: 'Observe without judging.' },
  { prompt: 'A promise you made and kept (or broke). What did it teach you?', description: 'Truth-telling with yourself.' }
];

function utcDayStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function utcDayRange(d = new Date()) {
  const start = utcDayStart(d);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function serializePrompt(prompt) {
  if (!prompt) return null;
  return {
    _id: prompt._id,
    prompt: prompt.prompt,
    description: prompt.description,
    activeDate: prompt.activeDate,
    participationCount: prompt.participationCount || 0
  };
}

// Ensure the built-in bank is present so the rotation never runs dry
async function ensurePromptBank() {
  try {
    const count = await DailyPrompt.countDocuments();
    if (count === 0) {
      const origin = utcDayStart();
      const prompts = BUILTIN_PROMPTS.map((p, idx) => new DailyPrompt({
        prompt: p.prompt,
        description: p.description,
        activeDate: new Date(origin.getTime() - (BUILTIN_PROMPTS.length - idx) * 24 * 60 * 60 * 1000),
        createdBy: 'system',
        order: idx,
        isActive: true
      }));
      await DailyPrompt.insertMany(prompts);
      console.log(`✓ Seeded ${prompts.length} built-in daily prompts`);
    }
  } catch (error) {
    console.error('Prompt bank seeding error:', error.message);
  }
}

// GET /prompts/current - Get today's prompt (stable for the UTC day)
router.get('/current', async (req, res) => {
  try {
    await ensurePromptBank();

    const { start, end } = utcDayRange();

    let prompt = await DailyPrompt.findOne({
      isActive: true,
      activeDate: { $gte: start, $lt: end }
    }).sort({ activeDate: -1 });

    if (!prompt) {
      const allPrompts = await DailyPrompt.find({ isActive: true }).sort({ order: 1, _id: 1 });
      if (allPrompts.length > 0) {
        const lastAssigned = await DailyPrompt.findOne({ isActive: true }).sort({ activeDate: -1 });
        const lastIdx = lastAssigned
          ? allPrompts.findIndex((p) => String(p._id) === String(lastAssigned._id))
          : -1;
        const nextIndex = lastIdx >= 0 ? (lastIdx + 1) % allPrompts.length : 0;
        prompt = allPrompts[nextIndex];
        prompt.activeDate = start;
        await prompt.save();
      }
    }

    res.json({ success: !!prompt, prompt: serializePrompt(prompt) });
  } catch (error) {
    console.error('Get current prompt error:', error);
    res.status(500).json({ success: false, error: 'Failed to get prompt' });
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
      activeDate: utcDayStart(),
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