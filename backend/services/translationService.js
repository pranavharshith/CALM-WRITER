const TranslationCache = require('../models/TranslationCache');
const crypto = require('crypto');
const { translate } = require('@vitalets/google-translate-api');

// Helper to hash text for cache validation
function hashText(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

class TranslationService {
    /**
     * Translates text to the target language.
     * Checks cache first, then calls Google Translate API.
     */
    async translate(contentId, contentType, text, targetLanguage) {
        try {
            if (!text || !targetLanguage) throw new Error('Missing text or target language');

            const textHash = hashText(text);

            // 1. Check Cache
            const cached = await TranslationCache.findOne({
                contentId,
                targetLanguage
            });

            // If cached and original text hasn't changed (hash match)
            if (cached && cached.originalTextHash === textHash) {
                return {
                    translatedText: cached.translatedText,
                    source: 'cache'
                };
            }

            // 2. Call Google Translate API
            const translatedText = await this.googleTranslate(text, targetLanguage);

            // 3. Update/Save Cache
            if (cached) {
                // Update existing cache entry if text changed
                cached.translatedText = translatedText;
                cached.originalTextHash = textHash;
                cached.createdAt = Date.now(); // Reset expiry
                await cached.save();
            } else {
                // Create new cache entry
                await TranslationCache.create({
                    contentId,
                    contentType,
                    originalTextHash: textHash,
                    targetLanguage,
                    translatedText,
                    engine: 'google-translate'
                });
            }

            return {
                translatedText,
                source: 'api'
            };

        } catch (error) {
            console.error('TranslationService Error:', error);
            throw error;
        }
    }

    // Real Google Translate API call with auto-detection
    async googleTranslate(text, targetLang) {
        try {
            // Auto-detect source language by not specifying 'from' parameter
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (error) {
            console.error('Google Translate API Error:', error);
            throw new Error(`Translation failed: ${error.message}`);
        }
    }
}

module.exports = new TranslationService();

