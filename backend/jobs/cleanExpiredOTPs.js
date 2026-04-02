const User = require('../models/User');
const { logger } = require('../utils/logger');

/**
 * Clean up expired OTPs from database
 */
async function cleanExpiredOTPs() {
  try {
    const now = new Date();
    
    const result = await User.updateMany(
      {
        otpExpiresAt: { $lt: now },
        otpHash: { $exists: true }
      },
      {
        $unset: {
          otpHash: 1,
          otpExpiresAt: 1
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Cleaned up ${result.modifiedCount} expired OTPs`);
    }
  } catch (error) {
    logger.error('Error cleaning expired OTPs:', error);
  }
}

module.exports = { cleanExpiredOTPs };
