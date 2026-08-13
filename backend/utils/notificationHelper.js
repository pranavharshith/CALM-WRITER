const Notification = require('../models/Notification');

/**
 * Create a notification for a user.
 * Auto-ignores self-notifications unless explicitly allowed.
 * @param {Object} opts
 * @param {string} opts.userInternalId - Recipient
 * @param {string} opts.type - 'follow' | 'like' | 'thread_response' | 'story_continuation' | 'edit_request' | 'edit_approved' | 'hub_approved'
 * @param {string} [opts.fromUserId]
 * @param {string} [opts.fromUsername]
 * @param {string} [opts.storyId]
 * @param {string} [opts.storyTitle]
 * @param {string} [opts.message]
 * @param {boolean} [opts.allowSelf=false]
 */
async function createNotification(opts) {
  try {
    const {
      userInternalId,
      type,
      fromUserId,
      fromUsername,
      storyId,
      storyTitle,
      message,
      allowSelf = false
    } = opts;

    if (!userInternalId) return null;

    // Never notify yourself (unless explicitly requested, e.g. system notices)
    if (!allowSelf && fromUserId && String(fromUserId) === String(userInternalId)) {
      return null;
    }

    const notification = new Notification({
      userInternalId,
      type,
      fromUserId,
      fromUsername,
      storyId,
      storyTitle,
      message: message || ''
    });

    await notification.save();
    return notification;
  } catch (error) {
    // Notifications must never break the primary action
    console.error('Notification creation error:', error.message);
    return null;
  }
}

module.exports = { createNotification };