/**
 * Standardized error response handler
 */

const { logger } = require('./logger');

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Format error response
 */
function formatErrorResponse(error, isDevelopment = false) {
  const response = {
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: error.timestamp || new Date().toISOString()
  };

  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const statusCode = err.statusCode || 500;

  logger.error('Error:', {
    message: err.message,
    code: err.code,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json(formatErrorResponse(err, isDevelopment));
}

/**
 * Async handler wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  formatErrorResponse,
  errorHandler,
  asyncHandler
};
