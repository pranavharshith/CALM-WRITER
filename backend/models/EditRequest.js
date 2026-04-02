const mongoose = require('mongoose');

const EditRequestSchema = new mongoose.Schema({
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    requesterId: { type: String, required: true }, // who requested the edit
    requesterUsername: { type: String },
    proposedText: { type: String, required: true },
    proposedTitle: { type: String },
    reason: { type: String }, // why they want to edit

    votes: [{
        userId: String,
        votedAt: { type: Date, default: Date.now }
    }],

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'applied'],
        default: 'pending'
    },

    voteThreshold: { type: Number, default: 10 }, // votes needed

    // Author response
    authorResponse: {
        approved: { type: Boolean },
        respondedAt: { type: Date },
        note: { type: String }
    },

    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date } // auto-expire after 7 days
});

EditRequestSchema.index({ storyId: 1, status: 1 });
EditRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EditRequest', EditRequestSchema);
