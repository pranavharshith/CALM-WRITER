const mongoose = require('mongoose');

const TranslationCacheSchema = new mongoose.Schema({
    // Unique identifier for the content being translated (storyId, nodeId, etc.)
    contentId: { type: String, required: true },

    // Type of content (story_text, story_title, chat_message, etc.)
    contentType: { type: String, required: true },

    // Hash of the original text to detect edits/changes
    originalTextHash: { type: String, required: true },

    // The target language code (e.g., 'es', 'fr', 'zh')
    targetLanguage: { type: String, required: true },

    // The translated content
    translatedText: { type: String, required: true },

    // Metadata
    engine: { type: String, default: 'mock' }, // 'deepl', 'google', 'mock'
    createdAt: { type: Date, default: Date.now, expires: '30d' } // Auto-expire after 30 days unused
});

// Composite index for fast lookups
TranslationCacheSchema.index({ contentId: 1, targetLanguage: 1 }, { unique: true });

module.exports = mongoose.model('TranslationCache', TranslationCacheSchema);
