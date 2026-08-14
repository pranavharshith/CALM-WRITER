const mongoose = require('mongoose');

const UserAchievementSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true, index: true },
  badgeId: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now }
}, { timestamps: true });

UserAchievementSchema.index({ userInternalId: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', UserAchievementSchema);
