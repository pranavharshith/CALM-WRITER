const mongoose = require('mongoose');

const dailyPromptSchema = new mongoose.Schema({
    prompt: { type: String, required: true },
    description: String,
    activeDate: { type: Date, required: true, index: true },
    createdBy: String,
    participationCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 } // For rotation
}, {
    timestamps: true
});

module.exports = mongoose.model('DailyPrompt', dailyPromptSchema);
