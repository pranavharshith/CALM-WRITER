const crypto = require('crypto');

/**
 * CSRF token generation and validation middleware
 * Implements double-submit cookie pattern with token validation
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a new CSRF token
 */
function generateCSRFToken() {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and set CSRF token
 * Should be applied to GET requests that render forms
 */
function generateCSRFTokenMiddleware(req, res, next) {
    // Check if token already exists in cookie
    const existingToken = req.cookies[CSRF_COOKIE_NAME];

    if (existingToken) {
        // Reuse existing token
        req.csrfToken = existingToken;
    } else {
        // Generate new token only if one doesn't exist
        req.csrfToken = generateCSRFToken();
    }

    // Always re-set the cookie to ensure httpOnly=false is applied.
    // (If a stale cookie with httpOnly=true exists, we must overwrite it —
    // otherwise JS can never read it and CSRF breaks.)
    res.cookie(CSRF_COOKIE_NAME, req.csrfToken, {
        // NOTE: CSRF cookies must NOT be httpOnly — the double-submit cookie
        // pattern requires JS to read the cookie and send it as a header.
        // Only session/auth cookies should be httpOnly.
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    next();
}

/**
 * Middleware to verify CSRF token on state-changing requests
 * Should be applied to POST, PUT, DELETE, PATCH requests
 */
function verifyCSRFTokenMiddleware(req, res, next) {
    // Skip CSRF check for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Get token from header
    const tokenFromHeader = req.headers[CSRF_HEADER_NAME];

    // Get token from cookie
    const tokenFromCookie = req.cookies[CSRF_COOKIE_NAME];

    // Both tokens must exist
    if (!tokenFromHeader || !tokenFromCookie) {
        return res.status(403).json({
            error: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING'
        });
    }

    // Tokens must match (double-submit cookie pattern)
    if (tokenFromHeader !== tokenFromCookie) {
        return res.status(403).json({
            error: 'CSRF token validation failed',
            code: 'CSRF_TOKEN_INVALID'
        });
    }

    // Token is valid, proceed
    next();
}

/**
 * Middleware to attach CSRF token to request for use in responses
 */
function attachCSRFTokenMiddleware(req, res, next) {
    if (!req.csrfToken) {
        req.csrfToken = generateCSRFToken();
    }
    next();
}

module.exports = {
    generateCSRFToken,
    generateCSRFTokenMiddleware,
    verifyCSRFTokenMiddleware,
    attachCSRFTokenMiddleware,
    CSRF_TOKEN_LENGTH,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME
};
