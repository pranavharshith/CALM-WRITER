/**
 * Thin alias for middleware/auth.js admin/moderator guards.
 */

const { requireAdmin, requireModerator } = require('./auth');

module.exports = {
    requireAdmin,
    requireModerator
};
