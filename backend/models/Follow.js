const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
  followerInternalId: { type: String, required: true }, // who follows
  followingInternalId: { type: String, required: true }, // who is being followed
}, {
  timestamps: true
});

// Ensure one follow per pair
FollowSchema.index({ followerInternalId: 1, followingInternalId: 1 }, { unique: true });

// Useful indexes
FollowSchema.index({ followerInternalId: 1 });
FollowSchema.index({ followingInternalId: 1 });

module.exports = mongoose.model('Follow', FollowSchema);
