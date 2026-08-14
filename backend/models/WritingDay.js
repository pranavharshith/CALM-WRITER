const mongoose = require('mongoose');

const WritingDaySchema = new mongoose.Schema({
  userInternalId: { type: String, required: true, index: true },
  date: { type: String, required: true }, // UTC YYYY-MM-DD
  wordCount: { type: Number, default: 0, min: 0 },
  storyCount: { type: Number, default: 0, min: 0 },
  goalMet: { type: Boolean, default: false }
}, { timestamps: true });

WritingDaySchema.index({ userInternalId: 1, date: 1 }, { unique: true });
WritingDaySchema.index({ userInternalId: 1, date: -1 });

module.exports = mongoose.model('WritingDay', WritingDaySchema);
