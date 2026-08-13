const express = require('express');
const mongoose = require('mongoose');
const Story = require('../../models/Story');
const User = require('../../models/User');
const Like = require('../../models/Like');
const Follow = require('../../models/Follow');
const ReadSession = require('../../models/ReadSession');
const { requireAuth, optionalAuth } = require('../../middleware/auth-consolidated');
const { checkAndUpdateStoryPublishCooldown } = require('../../utils/cooldownManager');
const { sanitizeStoryMiddleware } = require('../../middleware/inputSanitization');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { logAuthEvent } = require('../../utils/logger');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKeyGenerator(req.ip)
});

module.exports = {
  express, mongoose, Story, User, Like, Follow, ReadSession,
  requireAuth, optionalAuth, checkAndUpdateStoryPublishCooldown,
  sanitizeStoryMiddleware, getPaginationParams, getPaginationMeta,
  logAuthEvent, publicLimiter,
};
