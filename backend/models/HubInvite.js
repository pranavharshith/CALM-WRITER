const mongoose = require('mongoose');
const crypto = require('crypto');

const HubInviteSchema = new mongoose.Schema({
    hubId: { type: String, required: true },
    inviterInternalId: { type: String, required: true }, // who sent invite
    inviteeInternalId: { type: String }, // specific user (null for invite links)
    inviteeEmail: { type: String }, // invite by email (for new users)

    inviteToken: { type: String, unique: true, sparse: true }, // unique URL token

    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
        default: 'pending'
    },
    expiresAt: { type: Date, required: true }, // 7 days from creation

    message: { type: String, maxLength: 200 }, // personal invitation message

    acceptedAt: { type: Date },
    declinedAt: { type: Date },

    createdAt: { type: Date, default: Date.now }
});

// Indexes
HubInviteSchema.index({ hubId: 1, status: 1 });
HubInviteSchema.index({ inviteeInternalId: 1, status: 1 });
HubInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Generate unique invite token before saving
HubInviteSchema.pre('save', function (next) {
    if (!this.inviteToken) {
        this.inviteToken = crypto.randomBytes(16).toString('hex');
    }
    next();
});

module.exports = mongoose.model('HubInvite', HubInviteSchema);
