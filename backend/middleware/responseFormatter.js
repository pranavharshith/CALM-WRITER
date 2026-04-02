/**
 * Response formatter middleware to standardize all API responses
 */

/**
 * Standardize error responses
 */
function standardizeErrorResponse(req, res, next) {
  // Override res.json to standardize error responses
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    // If it's an error response without success flag, add it
    if (data && data.error && !('success' in data)) {
      data.success = false;
    }
    // If it's a success response without success flag, add it
    if (data && !data.error && !('success' in data)) {
      data.success = true;
    }
    return originalJson(data);
  };

  next();
}

module.exports = {
  standardizeErrorResponse
};
