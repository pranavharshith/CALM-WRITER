const mongoose = require('mongoose');

const HubCreatorApplicationSchema = new mongoose.Schema({
    userInternalId: { type: String, required: true },

    // Application Details
    proposedHubName: { type: String, required: true },
    proposedTheme: {
        type: String,
        required: true,
        enum: ['general', 'scifi', 'fantasy', 'poetry', 'mystery', 'horror', 'romance', 'nonfiction', 'other']
    },
    justification: { type: String, required: true, minLength: 200, maxLength: 1000 },

    // User Stats at Application Time (snapshot)
    userStats: {
        totalStories: Number,
        totalLikes: Number,
        followerCount: Number,
        accountAge: Number, // days
        threadParticipations: Number
    },

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: { type: String }, // admin who reviewed
    reviewedAt: { type: Date },
    reviewNotes: { type: String },

    createdAt: { type: Date, default: Date.now }
});

// Indexes
HubCreatorApplicationSchema.index({ userInternalId: 1, status: 1 });
HubCreatorApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HubCreatorApplication', HubCreatorApplicationSchema);
