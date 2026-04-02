const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // recipient internalId
    type: {
        type: String,
        required: true,
        enum: ['follow', 'like', 'story_published', 'edit_request', 'edit_approved']
    },
    fromUserId: { type: String }, // who triggered the notification
    fromUsername: { type: String },
    storyId: { type: String }, // related story if applicable
    storyTitle: { type: String },
    message: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
