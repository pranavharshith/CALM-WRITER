const mongoose = require('mongoose');

const StoryNodeSchema = new mongoose.Schema({
  parentStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null }, // null for original stories
  rootStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true }, // always points to original
  authorInternalId: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['ORIGINAL', 'CONTINUATION', 'RESPONSE'], 
    required: true 
  },
  locked: { type: Boolean, default: true }, // cannot edit after submission
  createdAt: { type: Date, default: Date.now },
  wordCount: { type: Number },
  // For responses only
  parentNodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryNode', default: null },
  // Moderation
  hidden: { type: Boolean, default: false }, // Moderator can hide response
  hiddenReason: { type: String },
}, {
  timestamps: true
});

// Index for efficient thread queries
StoryNodeSchema.index({ rootStoryId: 1, type: 1, createdAt: 1 });
StoryNodeSchema.index({ parentStoryId: 1 });

module.exports = mongoose.model('StoryNode', StoryNodeSchema);
