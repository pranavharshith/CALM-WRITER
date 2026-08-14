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
 * @param {string} [opts.hubId]
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
      hubId,
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
      hubId,
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

function activeMembers(hub) {
  return (hub?.members || []).filter((m) => m.isActive !== false);
}

async function notifyHubStaff(hub, opts) {
  const jobs = activeMembers(hub)
    .filter((m) => m.role === 'creator' || m.role === 'moderator')
    .map((m) => createNotification({ ...opts, userInternalId: m.userInternalId }));
  return Promise.all(jobs);
}

async function notifyHubMembers(hub, opts, { exclude = [], limit = 40 } = {}) {
  const skip = new Set(exclude.map(String));
  const jobs = [];
  for (const m of activeMembers(hub)) {
    if (skip.has(String(m.userInternalId))) continue;
    jobs.push(createNotification({ ...opts, userInternalId: m.userInternalId }));
    if (jobs.length >= limit) break;
  }
  return Promise.all(jobs);
}

module.exports = { createNotification, notifyHubStaff, notifyHubMembers };