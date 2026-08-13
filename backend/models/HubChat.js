const mongoose = require('mongoose');

const HubChatSchema = new mongoose.Schema({
    hubId: { type: String, required: true },
    authorInternalId: { type: String, required: true },
    message: { type: String, required: true, maxLength: 1000 },

    // Message Types
    type: {
        type: String,
        enum: ['message', 'announcement', 'system'],
        default: 'message'
    },
    // announcement: pinned important messages from creator/mods
    // system: automated messages (new member, story published, etc.)

    isPinned: { type: Boolean, default: false },

    // Reactions
    reactions: [{
        userInternalId: String,
        emoji: String,
        reactedAt: { type: Date, default: Date.now }
    }],

    // Threading
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'HubChat' },

    // Soft delete support
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    createdAt: { type: Date, default: Date.now }
});

// Indexes
HubChatSchema.index({ hubId: 1, createdAt: -1 });
HubChatSchema.index({ hubId: 1, isPinned: 1 });

module.exports = mongoose.model('HubChat', HubChatSchema);
