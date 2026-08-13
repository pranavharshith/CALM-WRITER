const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  internalId: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true },
  displayName: { type: String },

  // Password authentication
  passwordHash: { type: String }, // Hashed password
  passwordHistory: [{ type: String }], // Previous password hashes for reuse prevention (max 5)

  role: { type: String, enum: ['user', 'trusted_user', 'moderator', 'admin'], default: 'user' },
  joinedAt: { type: Date, default: Date.now },

  // OTP for password recovery only (hashed)
  otpHash: { type: String },
  otpExpiresAt: { type: Date },

  // Email Verification
  isEmailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },

  // Moderator tracking
  moderatorJoinedAt: { type: Date },
  moderatorPromotedBy: { type: String },

  // Trusted User tracking
  trustedUserPromotedAt: { type: Date },
  canTagContent: { type: Boolean, default: false },
  canCreateHubs: { type: Boolean, default: false }, // approved hub creator

  // Timeout system
  timeoutUntil: { type: Date },
  timeoutReason: { type: String },
  timeoutIssuedBy: { type: String },
  strikes: { type: Number, default: 0 },

  // Account lockout system
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: { type: Date },

  // User Preferences (Calm Mode - enabled by default)
  preferences: {
    calmMode: { type: Boolean, default: true },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    autoScroll: { type: Boolean, default: false },
    autoScrollSpeed: { type: Number, default: 50 },
    preferredLanguage: { type: String, default: 'en' }
  },

  // Profile Picture
  profilePicture: {
    url: { type: String },
    fileName: { type: String },
    uploadedAt: { type: Date }
  },

  //Separate cooldown tracking
  lastStoryPublishedAt: { type: Date },
  lastContinuationAt: { type: Date },

  // Token Version for Global Logout
  tokenVersion: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Add indexes for frequently queried fields
UserSchema.index({ email: 1 });
UserSchema.index({ internalId: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ timeoutUntil: 1 });
UserSchema.index({ accountLockedUntil: 1 });

// Method to set password with history tracking
UserSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(password, salt);

  // Add current password to history (keep last 5)
  if (this.passwordHash) {
    if (!this.passwordHistory) {
      this.passwordHistory = [];
    }
    this.passwordHistory.push(this.passwordHash);
    // Keep only last 5 passwords
    if (this.passwordHistory.length > 5) {
      this.passwordHistory = this.passwordHistory.slice(-5);
    }
  }

  this.passwordHash = newHash;
};

// Method to check password
UserSchema.methods.checkPassword = async function (password) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(password, this.passwordHash);
};

// Method to set OTP (hashed)
UserSchema.methods.setOTP = async function (otp) {
  const salt = await bcrypt.genSalt(10);
  this.otpHash = await bcrypt.hash(otp, salt);
  this.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
};

// Method to verify OTP with timing attack protection
UserSchema.methods.verifyOTP = async function (otp) {
  if (!this.otpHash || !this.otpExpiresAt) {
    // Always perform a bcrypt comparison to prevent timing attacks
    await bcrypt.compare('000000', '$2a$10$invalidhash');
    return false;
  }

  if (this.otpExpiresAt < new Date()) {
    // Always perform a bcrypt comparison to prevent timing attacks
    await bcrypt.compare('000000', this.otpHash);
    return false;
  }

  // Perform constant-time comparison
  return await bcrypt.compare(otp, this.otpHash);
};

// Method to clear OTP
UserSchema.methods.clearOTP = function () {
  this.otpHash = undefined;
  this.otpExpiresAt = undefined;
};

module.exports = mongoose.model('User', UserSchema);
