const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema({
    internalAuthorId: { type: String, required: true, index: true },
    title: { type: String, default: '' },
    text: { type: String, default: '' },
    wordCount: { type: Number, default: 0 },
    lastSaved: { type: Date, default: Date.now },
    promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPrompt', default: null },
    tags: { type: [String], default: [] },

    // Draft sharing feature
    shareToken: { type: String, unique: true, sparse: true }, // UUID for secret link
    shareExpiresAt: { type: Date }, // 7-day expiry
    shareEnabled: { type: Boolean, default: false },
}, {
    timestamps: true
});

module.exports = mongoose.model('Draft', draftSchema);
