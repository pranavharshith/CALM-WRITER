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
}, {
  timestamps: true
});

// Soft 800 word limit enforced in API, not by schema

module.exports = mongoose.model('Story', StorySchema);

