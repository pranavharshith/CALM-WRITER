const mongoose = require('mongoose');

const moderatorApplicationSchema = new mongoose.Schema({
    userInternalId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },

    // Eligibility metrics (calculated at application time)
    eligibility: {
        accountAge: { type: Number, required: true }, // days
        storiesCount: { type: Number, required: true },
        continuationsCount: { type: Number, required: true },
        totalLikes: { type: Number, required: true },
        bookmarkedStories: { type: Number, required: true },
        reportsAgainst: { type: Number, required: true },
        meetsRequirements: { type: Boolean, required: true }
    },

    // Application content
    essay: { type: String, required: true, minlength: 200 }, // Why do you want to be a mod?

    // IMPROVED: Multiple choice scenario tests (auto-graded)
    scenarioAnswers: [{
        scenarioId: { type: Number, required: true },
        scenario: { type: String, required: true },
        options: [{ type: String }], // A, B, C, D options
        selectedAnswer: { type: String, required: true }, // User's choice
        correctAnswer: { type: String, required: true }, // Correct choice
        isCorrect: { type: Boolean, required: true }
    }],

    autoRejected: { type: Boolean, default: false }, // true if any scenario answer wrong

    // Review
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: String }, // Admin who reviewed
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
}, {
    timestamps: true
});

module.exports = mongoose.model('ModeratorApplication', moderatorApplicationSchema);
