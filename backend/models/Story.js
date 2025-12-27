const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  internalAuthorId: { type: String, required: true }, // references User.internalId
  title: { type: String }, // Optional title, auto-generated from first line if empty
  text: { type: String, required: true },
  likes: { type: Number, default: 0 }, // Like count
  likedBy: [{ type: String }], // Array of user internal IDs who liked this
  isFeatured: { type: Boolean, default: false }, // Currently featured story
  featuredWeek: { type: Date }, // When it was featured
  createdAt: { type: Date, default: Date.now },
  wordCount: { type: Number },
  locked: { type: Boolean, default: true }, // cannot edit/delete by author
  // Thread management
  threadLocked: { type: Boolean, default: false }, // Moderator can lock thread
  hidden: { type: Boolean, default: false }, // Moderator can hide story
  hiddenReason: { type: String }, // Why it was hidden

  // Grace period for edits
  publishedAt: { type: Date, default: Date.now }, // When first published
  lastEditedAt: { type: Date }, // Last edit timestamp
  editCount: { type: Number, default: 0 }, // Number of edits (max 3)

  // Moderator delete permissions (CRITICAL FIX #2)
  deleteVotes: [{
    moderatorId: String,
    votedAt: { type: Date, default: Date.now },
    reason: String
  }],
  spamScore: { type: Number, default: 0 }, // Automated spam detection score
  markedForDeletion: { type: Boolean, default: false }, // Flagged for deletion

  // Daily Prompts
  promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPrompt' }
}, {
  timestamps: true
});

// Soft 800 word limit enforced in API, not by schema

module.exports = mongoose.model('Story', StorySchema);

