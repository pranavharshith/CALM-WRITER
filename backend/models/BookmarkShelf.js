const mongoose = require('mongoose');

const BookmarkShelfSchema = new mongoose.Schema({
  ownerInternalId: { type: String, required: true },
  name: { type: String, required: true, minlength: 2, maxlength: 40 },
  slug: { type: String, required: true, match: /^[a-z0-9-]+$/ },
  description: { type: String, default: '', maxlength: 200 },
  visibility: { type: String, enum: ['private', 'public'], default: 'private' },
  storyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
  coverStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null }
}, {
  timestamps: true
});

BookmarkShelfSchema.index({ ownerInternalId: 1, slug: 1 }, { unique: true });
BookmarkShelfSchema.index({ ownerInternalId: 1, updatedAt: -1 });
BookmarkShelfSchema.index({ visibility: 1, ownerInternalId: 1 });

module.exports = mongoose.model('BookmarkShelf', BookmarkShelfSchema);
