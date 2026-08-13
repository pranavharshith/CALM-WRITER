const express = require('express');
const User = require('../../models/User');
const crypto = require('crypto');
const { passwordResetLimiter, authLimiter } = require('../../middleware/rateLimiter');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth } = require('../../middleware/auth-consolidated');
const { passwordValidationMiddleware } = require('../../middleware/passwordValidation');
const { logAuthEvent, logSecurityEvent } = require('../../utils/logger');
const TokenBlacklist = require('../../models/TokenBlacklist');
const { CSRF_COOKIE_NAME } = require('../../middleware/csrfProtection');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many CSRF token requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  skip: (req) => req.path === '/auth/csrf-token' && req.method === 'GET'
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many refresh attempts. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip)
});

const GENERIC_AUTH_ERROR = 'Invalid credentials';

const REFRESH_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

function setRefreshTokenCookie(res, token) {
  res.cookie('refreshToken', token, {
    ...REFRESH_COOKIE,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', REFRESH_COOKIE);
}

module.exports = {
  express, User, crypto, passwordResetLimiter, authLimiter,
  generateAccessToken, generateRefreshToken, verifyRefreshToken, requireAuth,
  passwordValidationMiddleware, logAuthEvent, logSecurityEvent,
  TokenBlacklist, CSRF_COOKIE_NAME, rateLimit, ipKeyGenerator,
  csrfLimiter, refreshLimiter, GENERIC_AUTH_ERROR, setRefreshTokenCookie, clearRefreshTokenCookie,
};
