const express = require('express');
const Story = require('../../models/Story');
const StoryNode = require('../../models/StoryNode');
const Report = require('../../models/Report');
const ModAction = require('../../models/ModAction');
const User = require('../../models/User');
const ModeratorChat = require('../../models/ModeratorChat');
const TimeoutAppeal = require('../../models/TimeoutAppeal');
const { requireAuth } = require('../../middleware/auth-consolidated');
const { requireModerator, requireAdmin } = require('../../middleware/adminAuth');
const { sanitizeMessageMiddleware } = require('../../middleware/inputSanitization');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const moderationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many moderation actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKeyGenerator(req.ip),
  skip: (req) => !req.internalId
});

module.exports = {
  express, Story, StoryNode, Report, ModAction, User, ModeratorChat, TimeoutAppeal,
  requireAuth, requireModerator, requireAdmin, sanitizeMessageMiddleware,
  rateLimit, ipKeyGenerator, moderationLimiter,
};
