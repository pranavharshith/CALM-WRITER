const mongoose = require('mongoose');

const ReadSessionSchema = new mongoose.Schema({
  userInternalId: { type: String, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  percentRead: { type: Number }, // 0-100
  timeSpent: { type: Number }, // ms
});

module.exports = mongoose.model('ReadSession', ReadSessionSchema);

