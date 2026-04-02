/**
 * Wrapper for async route handlers to catch errors
 * Prevents unhandled promise rejections
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Wrapper for async operations with retry logic
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Delay between retries in milliseconds
 * @returns {Promise} - Result of operation
 */
async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Wrapper for operations with timeout
 * @param {Function} operation - Async operation
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} - Result of operation
 */
async function withTimeout(operation, timeoutMs = 30000) {
  return Promise.race([
    operation(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

module.exports = {
  asyncHandler,
  retryOperation,
  withTimeout
};
