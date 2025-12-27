const mongoose = require('mongoose');

const moderatorChatSchema = new mongoose.Schema({
    senderInternalId: { type: String, required: true },
    senderUsername: String,
    message: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },

    // System messages (e.g., "User X was promoted to moderator")
    isSystemMessage: { type: Boolean, default: false },

    // For editing/deletion tracking
    editedAt: Date,
    deletedAt: Date,
    deletedBy: String
});

// Index for efficient querying
moderatorChatSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModeratorChat', moderatorChatSchema);
