const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },
  storyNodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryNode', default: null },
  reason: { type: String, enum: ['spam', 'hate', 'harassment', 'explicit_harm'], required: true },
  details: { type: String },
  status: { type: String, enum: ['pending', 'reviewed', 'actioned', 'dismissed'], default: 'pending' },
  reviewedBy: { type: String }, // moderator internalId
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', ReportSchema);

