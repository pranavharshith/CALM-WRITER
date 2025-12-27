const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  internalId: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true },
  displayName: { type: String },
  role: { type: String, enum: ['user', 'trusted_user', 'moderator', 'admin'], default: 'user' },
  joinedAt: { type: Date, default: Date.now },
  otp: { type: String },
  otpExpiresAt: { type: Date },

  // Moderator tracking
  moderatorJoinedAt: { type: Date },
  moderatorPromotedBy: { type: String },

  // Trusted User tracking
  trustedUserPromotedAt: { type: Date },
  canTagContent: { type: Boolean, default: false },

  // Timeout system
  timeoutUntil: { type: Date },
  timeoutReason: { type: String },
  timeoutIssuedBy: { type: String },
  strikes: { type: Number, default: 0 },

  // User Preferences (Calm Mode - enabled by default)
  preferences: {
    calmMode: { type: Boolean, default: true },
    fontSize: { type: String, enum: ['normal', 'large', 'dyslexia'], default: 'normal' },
    autoScroll: { type: Boolean, default: false },
    autoScrollSpeed: { type: Number, default: 50 }
  },

  // CRITICAL FIX: Separate cooldown tracking
  lastStoryPublishedAt: { type: Date }, // For story cooldown (12h regular, 4h trusted, none admin)
  lastContinuationAt: { type: Date }, // For continuation/response cooldown (30 min all users)
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
