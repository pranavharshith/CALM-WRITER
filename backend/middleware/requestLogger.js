const { logger } = require('../utils/logger');

/**
 * HTTP request logging middleware for audit trail
 * Only logs important requests: errors, auth, moderation, admin
 */
function requestLogger(req, res, next) {
  // Capture response status
  const originalSend = res.send;
  res.send = function(data) {
    const status = res.statusCode;
    const path = req.path;
    
    // Only log if:
    // 1. Status is error (4xx, 5xx)
    // 2. Path is auth, admin, moderation, or security-related
    // 3. Method is POST/PUT/DELETE (state-changing operations)
    const isErrorStatus = status >= 400;
    const isImportantPath = /\/(auth|admin|moderation|reports|users|hubs|edit-requests)/.test(path);
    const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    
    if (isErrorStatus || (isImportantPath && isStateChanging)) {
      logger.info('HTTP Request', {
        method: req.method,
        path: path,
        status: status,
        userInternalId: req.internalId || 'anonymous',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  requestLogger
};
