/**
 * Response standardization utilities
 * Ensures all API responses follow a consistent format
 */

/**
 * Standard success response format
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @returns {object} Standardized response
 */
function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data
  };
}

/**
 * Standard error response format
 * @param {string} error - Error message
 * @param {string} code - Error code (optional)
 * @param {number} statusCode - HTTP status code (optional)
 * @returns {object} Standardized error response
 */
function errorResponse(error, code = 'ERROR', statusCode = 400) {
  return {
    success: false,
    error,
    code,
    statusCode
  };
}

/**
 * Standard paginated response format
 * @param {array} items - Array of items
 * @param {object} pagination - Pagination metadata
 * @param {string} message - Optional message
 * @returns {object} Standardized paginated response
 */
function paginatedResponse(items, pagination, message = 'Success') {
  return {
    success: true,
    message,
    data: items,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev
    }
  };
}

/**
 * Middleware to standardize error responses
 * Wraps res.json to ensure consistent format
 */
function standardizeErrorResponse(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    // If already has success field, pass through
    if (data && typeof data === 'object' && 'success' in data) {
      return originalJson(data);
    }

    // If it looks like an error response, standardize it
    if (data && data.error) {
      const standardized = errorResponse(
        data.error,
        data.code || 'ERROR',
        res.statusCode
      );
      return originalJson(standardized);
    }

    // Otherwise, wrap in success response
    const standardized = successResponse(data);
    return originalJson(standardized);
  };

  next();
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  standardizeErrorResponse
};
