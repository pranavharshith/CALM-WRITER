/**
 * DEPRECATED: Use auth-consolidated.js instead
 * This file is kept for backward compatibility only
 */

const { requireAdmin, requireModerator } = require('./auth-consolidated');

module.exports = {
    requireAdmin,
    requireModerator
};
