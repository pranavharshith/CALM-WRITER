const User = require('../models/User');

// Role hierarchy
const ROLES = {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin'
};

const ROLE_HIERARCHY = {
    user: 0,
    moderator: 1,
    admin: 2
};

// Check if user has required role or higher
function hasRole(userRole, requiredRole) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Middleware to require specific role
function requireRole(requiredRole) {
    return async (req, res, next) => {
        try {
            // Get user from JWT middleware (should be called before this)
            const user = req.authenticatedUser;

            if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Check role
            if (!hasRole(user.role, requiredRole)) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: requiredRole,
                    current: user.role
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ error: 'Authorization failed' });
        }
    };
}

// Specific role middleware
const requireAdmin = requireRole(ROLES.ADMIN);
const requireModerator = requireRole(ROLES.MODERATOR);

// Check if user is admin (for backward compatibility)
async function isAdmin(req, res, next) {
    try {
        const user = req.authenticatedUser;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (user.role !== ROLES.ADMIN) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.user = user;
        req.internalId = user.internalId;
        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Authorization failed' });
    }
}

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    hasRole,
    requireRole,
    requireAdmin,
    requireModerator,
    isAdmin
};
