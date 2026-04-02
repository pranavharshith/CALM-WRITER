const mongoose = require('mongoose');
const { logger } = require('./logger');

/**
 * Execute multiple database operations in a transaction
 * Ensures atomicity - all operations succeed or all rollback
 * 
 * @param {Function} callback - Async function that performs operations
 * @returns {Promise} - Result of the callback
 * 
 * @example
 * const result = await executeTransaction(async (session) => {
 *   const user = await User.findByIdAndUpdate(userId, { balance: 100 }, { session });
 *   const transaction = await Transaction.create([{ userId, amount: 100 }], { session });
 *   return { user, transaction };
 * });
 */
async function executeTransaction(callback) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    logger.info('Transaction committed successfully');
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Transaction aborted due to error:', error.message);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Execute a transaction with automatic retry on failure
 * Useful for handling transient errors
 * 
 * @param {Function} callback - Async function that performs operations
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise} - Result of the callback
 */
async function executeTransactionWithRetry(callback, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeTransaction(callback);
    } catch (error) {
      lastError = error;
      logger.warn(`Transaction attempt ${attempt} failed, retrying...`, {
        error: error.message,
        attempt,
        maxRetries
      });

      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }

  logger.error(`Transaction failed after ${maxRetries} attempts`, {
    error: lastError.message
  });
  throw lastError;
}

module.exports = {
  executeTransaction,
  executeTransactionWithRetry
};
