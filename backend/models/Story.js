const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  internalAuthorId: { type: String, required: true }, // references User.internalId
  title: { type: String }, // Optional title, auto-generated from first line if empty
  text: { type: String, required: true },
  likes: { type: Number, default: 0, min: 0 }, // Like count with minimum validation
  likedBy: [{ type: String }], // Array of user internal IDs who liked this
  isFeatured: { type: Boolean, default: false }, // Currently featured story
  featuredWeek: { type: Date }, // When it was featured
  createdAt: { type: Date, default: Date.now },
  wordCount: { type: Number, min: 0 }, // Minimum validation
  locked: { type: Boolean, default: true }, // cannot edit/delete by author
  // Thread management
  threadLocked: { type: Boolean, default: false }, // Moderator can lock thread
  hidden: { type: Boolean, default: false }, // Moderator can hide story
  hiddenReason: { type: String }, // Why it was hidden

  // Grace period for edits
  publishedAt: { type: Date, default: Date.now }, // When first published
  lastEditedAt: { type: Date }, // Last edit timestamp
  editCount: { type: Number, default: 0, min: 0 }, // Number of edits (max 3)

  // Moderator delete permissions (CRITICAL FIX #2)
  deleteVotes: [{
    moderatorId: String,
    votedAt: { type: Date, default: Date.now },
    reason: String
  }],
  spamScore: { type: Number, default: 0, min: 0 }, // Automated spam detection score
  markedForDeletion: { type: Boolean, default: false }, // Flagged for deletion

  // Daily Prompts
  promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPrompt' },

  // Collaborative Hubs
  hubId: { type: String, default: null }, // null for regular stories
  isHubCollaborative: { type: Boolean, default: false },
  hubContributors: [{ type: String }], // all member IDs who contributed
  hubApprovalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }, // for hubs with requireApproval
  hubApprovedBy: { type: String }, // hub mod who approved

  // Story tags (author on publish / grace; trusted users may retag)
  tags: {
    type: [{ type: String, lowercase: true, trim: true, match: /^[a-z0-9-]{2,24}$/ }],
    default: [],
    validate: {
      validator(v) { return !v || v.length <= 5; },
      message: 'A story can carry at most 5 tags'
    }
  },

  // Cover Image (optional)
  coverImage: {
    url: { type: String },
    fileName: { type: String },
    uploadedAt: { type: Date },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  showCoverImage: { type: Boolean, default: true },

  // Soft delete support
  deletedAt: { type: Date, default: null }, // Null = not deleted, Date = soft deleted
  deletedBy: { type: String }, // Who deleted it (moderator or author)
  deletionReason: { type: String } // Why it was deleted
}, {
  timestamps: true
});

// Add indexes for frequently queried fields
StorySchema.index({ internalAuthorId: 1, createdAt: -1 });
StorySchema.index({ createdAt: -1 });
StorySchema.index({ likes: -1 });
StorySchema.index({ hubId: 1, hubApprovalStatus: 1 });
StorySchema.index({ hidden: 1, createdAt: -1 });
StorySchema.index({ isFeatured: 1 });
StorySchema.index({ likedBy: 1 });
StorySchema.index({ tags: 1, createdAt: -1 });

/**
 * Atomic like operation - prevents race conditions
 * @param {string} userInternalId - User who is liking
 * @returns {object} - Result with success status and updated like count
 */
StorySchema.statics.atomicLike = async function (storyId, userInternalId) {
  try {
    const result = await this.findByIdAndUpdate(
      storyId,
      {
        $addToSet: { likedBy: userInternalId }, // Add only if not already present
        $inc: { likes: 1 } // Increment atomically
      },
      { new: true }
    );

    if (!result) {
      return { success: false, error: 'Story not found' };
    }

    // Check if user was actually added (not already liked)
    const wasAdded = result.likedBy.includes(userInternalId);

    return {
      success: true,
      liked: wasAdded,
      likeCount: result.likes
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Atomic unlike operation - prevents race conditions
 * @param {string} userInternalId - User who is unliking
 * @returns {object} - Result with success status and updated like count
 */
StorySchema.statics.atomicUnlike = async function (storyId, userInternalId) {
  try {
    const result = await this.findByIdAndUpdate(
      storyId,
      {
        $pull: { likedBy: userInternalId }, // Remove from array
        $inc: { likes: -1 } // Decrement atomically
      },
      { new: true }
    );

    if (!result) {
      return { success: false, error: 'Story not found' };
    }

    return {
      success: true,
      unliked: true,
      likeCount: Math.max(0, result.likes) // Ensure non-negative
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Validation: Ensure numeric fields are non-negative
StorySchema.pre('save', function () {
  if (this.likes < 0) this.likes = 0;
  if (this.wordCount < 0) this.wordCount = 0;
  if (this.editCount < 0) this.editCount = 0;
  if (this.spamScore < 0) this.spamScore = 0;
});

// Post-update hook to ensure likes never go negative
StorySchema.post('findByIdAndUpdate', async function (doc) {
  if (doc && doc.likes < 0) {
    doc.likes = 0;
    await doc.save();
  }
});

// Soft 800 word limit enforced in API, not by schema

module.exports = mongoose.model('Story', StorySchema);

