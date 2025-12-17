const mongoose = require('mongoose');

const FeaturedStorySchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
  likeCount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('FeaturedStory', FeaturedStorySchema);