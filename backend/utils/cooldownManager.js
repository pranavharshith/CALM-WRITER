const User = require('../models/User');

/**
 * Atomically check and update story publishing cooldown
 * Uses MongoDB atomic operations to prevent race conditions
 */
async function checkAndUpdateStoryPublishCooldown(userInternalId, cooldownHours = 12) {
  try {
    const now = new Date();
    const cooldownTime = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);

    // Atomic operation: check cooldown and update in one operation
    const result = await User.findOneAndUpdate(
      {
        internalId: userInternalId,
        $or: [
          { lastStoryPublishedAt: { $exists: false } },
          { lastStoryPublishedAt: { $lt: cooldownTime } }
        ]
      },
      {
        $set: { lastStoryPublishedAt: now }
      },
      { new: true }
    );

    if (!result) {
      // User exists but cooldown not expired
      const user = await User.findOne({ internalId: userInternalId });
      if (user && user.lastStoryPublishedAt) {
        const timeRemaining = user.lastStoryPublishedAt.getTime() + (cooldownHours * 60 * 60 * 1000) - now.getTime();
        return {
          allowed: false,
          timeRemaining: Math.ceil(timeRemaining / 1000), // seconds
          message: `Please wait ${Math.ceil(timeRemaining / (60 * 60 * 1000))} hours before publishing another story`
        };
      }
    }

    return {
      allowed: true,
      message: 'Story published successfully'
    };
  } catch (error) {
    console.error('Cooldown check error:', error);
    throw error;
  }
}

/**
 * Atomically check and update continuation cooldown
 * Uses MongoDB atomic operations to prevent race conditions
 */
async function checkAndUpdateContinuationCooldown(userInternalId, cooldownMinutes = 30) {
  try {
    const now = new Date();
    const cooldownTime = new Date(now.getTime() - cooldownMinutes * 60 * 1000);

    // Atomic operation: check cooldown and update in one operation
    const result = await User.findOneAndUpdate(
      {
        internalId: userInternalId,
        $or: [
          { lastContinuationAt: { $exists: false } },
          { lastContinuationAt: { $lt: cooldownTime } }
        ]
      },
      {
        $set: { lastContinuationAt: now }
      },
      { new: true }
    );

    if (!result) {
      // User exists but cooldown not expired
      const user = await User.findOne({ internalId: userInternalId });
      if (user && user.lastContinuationAt) {
        const timeRemaining = user.lastContinuationAt.getTime() + (cooldownMinutes * 60 * 1000) - now.getTime();
        return {
          allowed: false,
          timeRemaining: Math.ceil(timeRemaining / 1000), // seconds
          message: `Please wait ${Math.ceil(timeRemaining / (60 * 1000))} minutes before continuing another story`
        };
      }
    }

    return {
      allowed: true,
      message: 'Continuation added successfully'
    };
  } catch (error) {
    console.error('Cooldown check error:', error);
    throw error;
  }
}

module.exports = {
  checkAndUpdateStoryPublishCooldown,
  checkAndUpdateContinuationCooldown
};
