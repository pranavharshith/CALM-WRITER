const express = require('express');
const router = express.Router();
const TranslationCache = require('../models/TranslationCache');
const { requireAuth } = require('../middleware/auth-consolidated');
const translationService = require('../services/translationService');

// POST /translate - Translate content
router.post('/', requireAuth, async (req, res) => {
  try {
    const { contentId, contentType, text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ success: false, error: 'Text and target language required' });
    }

    if (!['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'hi', 'ar', 'ru', 'tr', 'nl', 'pl', 'id'].includes(targetLanguage)) {
      return res.status(400).json({ success: false, error: 'Unsupported language' });
    }

    // Translate using the service (which handles caching internally)
    const result = await translationService.translate(contentId, contentType, text, targetLanguage);

    if (!result.translatedText) {
      return res.status(500).json({ success: false, error: 'Translation returned empty result' });
    }

    res.json({
      success: true,
      translatedText: result.translatedText,
      cached: result.source === 'cache'
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ success: false, error: 'Failed to translate content' });
  }
});

module.exports = router;
