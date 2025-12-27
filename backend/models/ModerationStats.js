const mongoose = require('mongoose');

const moderationStatsSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    spamRemoved: { type: Number, default: 0 },
    threadsLocked: { type: Number, default: 0 },
    timeoutsIssued: { type: Number, default: 0 },
    appealsReviewed: { type: Number, default: 0 },
    warningsIssued: { type: Number, default: 0 },
    reportsProcessed: { type: Number, default: 0 },
    contentHidden: { type: Number, default: 0 }
});

module.exports = mongoose.model('ModerationStats', moderationStatsSchema);
