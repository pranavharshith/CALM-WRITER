const mongoose = require('mongoose');

const timeoutAppealSchema = new mongoose.Schema({
    userInternalId: { type: String, required: true, index: true },
    username: String,

    // Original timeout info
    timeoutReason: String,
    timeoutIssuedBy: String,
    timeoutDuration: String, // "1h", "12h", "24h"
    timeoutUntil: Date,

    // Appeal questionnaire (pre-determined questions)
    questions: [{
        questionId: Number,
        question: String,
        answer: String,
        expectedKeywords: [String] // For automated scoring
    }],

    // Review by moderator
    status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'denied'],
        default: 'pending'
    },
    reviewedBy: String, // Moderator who reviewed
    reviewedAt: Date,
    reviewNotes: String,
    assignedReviewer: String, // Assigned to specific moderator/admin
    conflictedWith: [String], // Moderators who cannot review (e.g., issuer)

    // Final decision
    finalDecision: {
        type: String,
        enum: ['timeout_confirmed', 'timeout_reduced', 'timeout_cancelled'],
    },
    newTimeoutDuration: String, // If reduced

    // Admin override (only admins can revoke)
    adminOverride: {
        overriddenBy: String,
        overriddenAt: Date,
        overrideReason: String
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TimeoutAppeal', timeoutAppealSchema);
