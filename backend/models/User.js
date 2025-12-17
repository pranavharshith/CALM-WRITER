const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  internalId: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true }, // Community username
  displayName: { type: String }, // Optional display name
  joinedAt: { type: Date, default: Date.now },
  otp: { type: String }, // last sent OTP (mock/demo mode)
  otpExpiresAt: { type: Date },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);

