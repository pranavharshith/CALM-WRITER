const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  reason: { type: String, enum: ['hate', 'spam', 'harm'], required: true },
  details: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', ReportSchema);

