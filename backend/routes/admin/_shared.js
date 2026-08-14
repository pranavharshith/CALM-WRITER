const express = require('express');
const Report = require('../../models/Report');
const Story = require('../../models/Story');
const StoryNode = require('../../models/StoryNode');
const User = require('../../models/User');
const Bookmark = require('../../models/Bookmark');
const Like = require('../../models/Like');
const ReadSession = require('../../models/ReadSession');
const ModeratorApplication = require('../../models/ModeratorApplication');
const { requireAdmin, requireAuth } = require('../../middleware/auth');
const { reportLimiter } = require('../../middleware/rateLimiter');
const { logAdminAction } = require('../../utils/logger');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Too many admin requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKeyGenerator(req.ip),
  skip: (req) => !req.internalId
});

module.exports = {
  express, Report, Story, StoryNode, User, Bookmark, Like, ReadSession, ModeratorApplication,
  requireAdmin, requireAuth, reportLimiter, logAdminAction, rateLimit, ipKeyGenerator, adminLimiter,
};
