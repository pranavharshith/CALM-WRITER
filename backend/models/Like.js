const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Ensure one like per user per story
LikeSchema.index({ userInternalId: 1, storyId: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);