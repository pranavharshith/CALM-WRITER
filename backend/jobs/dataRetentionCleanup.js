const Story = require('../models/Story');
const TokenBlacklist = require('../models/TokenBlacklist');
const { logger } = require('../utils/logger');

/**
 * Data retention cleanup job
 * Removes permanently deleted stories and expired tokens
 * Runs daily to maintain database health
 */
async function cleanupExpiredData() {
  try {
    const now = new Date();
    
    // Delete soft-deleted stories older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const deletedStoriesResult = await Story.deleteMany({
      deletedAt: { $lt: thirtyDaysAgo, $ne: null }
    });

    if (deletedStoriesResult.deletedCount > 0) {
      logger.info('Data Retention Cleanup', {
        action: 'deleted_soft_deleted_stories',
        count: deletedStoriesResult.deletedCount,
        timestamp: now.toISOString()
      });
    }

    // Delete expired tokens (handled by TTL index, but cleanup for safety)
    const expiredTokensResult = await TokenBlacklist.deleteMany({
      expiresAt: { $lt: now }
    });

    if (expiredTokensResult.deletedCount > 0) {
      logger.info('Data Retention Cleanup', {
        action: 'deleted_expired_tokens',
        count: expiredTokensResult.deletedCount,
        timestamp: now.toISOString()
      });
    }

    logger.info('Data Retention Cleanup', {
      action: 'cleanup_completed',
      deletedStories: deletedStoriesResult.deletedCount,
      deletedTokens: expiredTokensResult.deletedCount,
      timestamp: now.toISOString()
    });

    return {
      success: true,
      deletedStories: deletedStoriesResult.deletedCount,
      deletedTokens: expiredTokensResult.deletedCount
    };
  } catch (error) {
    logger.error('Data Retention Cleanup Error', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  cleanupExpiredData
};
