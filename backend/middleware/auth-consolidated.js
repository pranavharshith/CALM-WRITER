const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secrets from environment
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Validate secrets on module load
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

if (!JWT_REFRESH_SECRET) {
    console.error('FATAL: JWT_REFRESH_SECRET is not defined in environment variables');
    process.exit(1);
}

/**
 * Generate access token (short-lived)
 */
/**
 * Generate access token (short-lived)
 */
function generateAccessToken(user) {
    return jwt.sign(
        {
            internalId: user.internalId,
            username: user.username,
            email: user.email,
            role: user.role,
            tokenVersion: user.tokenVersion || 0 // Include token version
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Generate refresh token (long-lived)
 */
function generateRefreshToken(user) {
    return jwt.sign(
        {
            internalId: user.internalId,
            tokenVersion: user.tokenVersion || 0 // Include token version
        },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
}

/**
 * Middleware: Require valid JWT authentication
 * Use this for protected endpoints that require a logged-in user
 */
async function requireAuth(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No authentication token provided'
            });
        }

        const token = authHeader.substring(7);

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        // Check if token is blacklisted
        const TokenBlacklist = require('../models/TokenBlacklist');
        const blacklisted = await TokenBlacklist.findOne({ token });
        if (blacklisted) {
            return res.status(401).json({
                success: false,
                error: 'Token has been revoked',
                code: 'TOKEN_REVOKED'
            });
        }

        // Verify user exists in database
        const user = await User.findOne({ internalId: decoded.internalId });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check token version (Global Logout)
        if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({
                success: false,
                error: 'Session expired (logged out from another device)',
                code: 'TOKEN_REVOKED'
            });
        }

        // Check if user is timed out (enforce on every request, not just login)
        if (user.timeoutUntil && user.timeoutUntil > new Date()) {
            const { logSecurityEvent } = require('../utils/logger');
            logSecurityEvent('TIMEOUT_ENFORCED', {
                userId: user.internalId,
                timeoutUntil: user.timeoutUntil,
                path: req.path,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Account temporarily suspended',
                timeoutUntil: user.timeoutUntil,
                timeoutReason: user.timeoutReason,
                code: 'ACCOUNT_SUSPENDED'
            });
        }

        // Attach user info to request
        req.internalId = decoded.internalId;
        req.authenticatedUser = user;
        req.user = decoded;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
}

/**
 * Middleware: Optional authentication
 * Attaches user info if valid token is present, but doesn't fail if missing
 * Use this for endpoints that work for both authenticated and anonymous users
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findOne({ internalId: decoded.internalId });

                if (user && (!user.timeoutUntil || user.timeoutUntil <= new Date())) {
                    // Check token version (Optional auth should also respect logout)
                    if (decoded.tokenVersion === undefined || user.tokenVersion === decoded.tokenVersion) {
                        req.internalId = decoded.internalId;
                        req.authenticatedUser = user;
                        req.user = decoded;
                    }
                }
            } catch (err) {
                // Invalid/expired token - continue as anonymous
            }
        }

        next();
    } catch (error) {
        // Don't fail on optional auth errors
        next();
    }
}

/**
 * Verify refresh token and return decoded payload
 */
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
        throw new Error('Invalid or expired refresh token');
    }
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth middleware
 */
async function requireAdmin(req, res, next) {
    try {
        // Ensure user is authenticated first
        if (!req.authenticatedUser) {
            return requireAuth(req, res, () => requireAdmin(req, res, next));
        }

        // Verify user still exists and is active
        const user = await User.findOne({ internalId: req.authenticatedUser.internalId });
        if (!user) {
            const { logSecurityEvent } = require('../utils/logger');
            logSecurityEvent('ADMIN_ACCESS_DENIED_USER_DELETED', {
                userId: req.authenticatedUser.internalId,
                path: req.path,
                ip: req.ip
            });
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if user has admin role
        if (user.role !== 'admin') {
            const { logSecurityEvent } = require('../utils/logger');
            logSecurityEvent('ADMIN_ACCESS_DENIED', {
                userId: user.internalId,
                path: req.path,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        // Update req.authenticatedUser with fresh data
        req.authenticatedUser = user;

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
}

/**
 * Middleware to require moderator or admin role
 * Must be used after requireAuth middleware
 */
async function requireModerator(req, res, next) {
    try {
        // Ensure user is authenticated first
        if (!req.authenticatedUser) {
            return requireAuth(req, res, () => requireModerator(req, res, next));
        }

        // Verify user still exists and is active
        const user = await User.findOne({ internalId: req.authenticatedUser.internalId });
        if (!user) {
            const { logSecurityEvent } = require('../utils/logger');
            logSecurityEvent('MODERATOR_ACCESS_DENIED_USER_DELETED', {
                userId: req.authenticatedUser.internalId,
                path: req.path,
                ip: req.ip
            });
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        const allowedRoles = ['moderator', 'admin'];

        if (!allowedRoles.includes(user.role)) {
            const { logSecurityEvent } = require('../utils/logger');
            logSecurityEvent('MODERATOR_ACCESS_DENIED', {
                userId: user.internalId,
                path: req.path,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Moderator access required'
            });
        }

        // Update req.authenticatedUser with fresh data
        req.authenticatedUser = user;

        next();
    } catch (error) {
        console.error('Moderator auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
}

module.exports = {
    requireAuth,
    optionalAuth,
    requireAdmin,
    requireModerator,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    JWT_SECRET,
    JWT_REFRESH_SECRET
};
