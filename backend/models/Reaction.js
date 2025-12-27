const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  // For thread reactions - can react to original story or continuation chapters
  storyNodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryNode', default: null },
  type: { type: String, enum: [
    'stayed_with_me',
    'felt_seen',
    'learned_something'
  ], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Reaction', ReactionSchema);

