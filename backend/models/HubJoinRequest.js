const mongoose = require('mongoose');

const HubJoinRequestSchema = new mongoose.Schema({
    hubId: { type: String, required: true },
    userInternalId: { type: String, required: true },

    message: { type: String, maxLength: 500 }, // why they want to join

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: { type: String }, // hub creator/mod who reviewed
    reviewedAt: { type: Date },
    rejectionReason: { type: String },

    createdAt: { type: Date, default: Date.now }
});

// Indexes
HubJoinRequestSchema.index({ userInternalId: 1, hubId: 1 });

// Prevent duplicate pending requests
HubJoinRequestSchema.index(
    { userInternalId: 1, hubId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: 'pending' }
    }
);

module.exports = mongoose.model('HubJoinRequest', HubJoinRequestSchema);
