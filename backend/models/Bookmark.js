const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true }, // User who bookmarked
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Ensure one bookmark per user per story
BookmarkSchema.index({ userInternalId: 1, storyId: 1 }, { unique: true });

// Index for efficient querying by user
BookmarkSchema.index({ userInternalId: 1, createdAt: -1 });

module.exports = mongoose.model('Bookmark', BookmarkSchema);
