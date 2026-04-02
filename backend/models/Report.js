const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },
  storyNodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryNode', default: null },
  reason: { type: String, enum: ['spam', 'hate', 'harassment', 'explicit_harm'], required: true },
  details: { type: String, maxlength: 5000 }, // Limit details to prevent DoS
  status: { type: String, enum: ['pending', 'reviewed', 'actioned', 'dismissed'], default: 'pending' },
  reviewedBy: { type: String }, // moderator internalId
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Validation: At least one of storyId or storyNodeId must be provided
ReportSchema.pre('save', function(next) {
  if (!this.storyId && !this.storyNodeId) {
    next(new Error('Either storyId or storyNodeId must be provided'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Report', ReportSchema);

