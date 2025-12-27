const mongoose = require('mongoose');

const ModActionSchema = new mongoose.Schema({
  moderatorInternalId: { type: String, required: true },
  actionType: { 
    type: String, 
    enum: ['remove_story', 'remove_node', 'lock_thread', 'hide_response', 'pin_comment'], 
    required: true 
  },
  targetStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },
  targetNodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryNode', default: null },
  reason: { type: String, required: true }, // Why this action was taken
  relatedReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
  createdAt: { type: Date, default: Date.now },
  // For pinned comments
  pinnedUntil: { type: Date, default: null }, // Auto-expire after 7-10 days
}, {
  timestamps: true
});

module.exports = mongoose.model('ModAction', ModActionSchema);
