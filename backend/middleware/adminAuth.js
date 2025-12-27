// Admin middleware - only allows pranav.dot.h@gmail.com
const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
    try {
        const internalId = req.headers['x-internal-id'];

        if (!internalId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findOne({ internalId });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user is admin AND is pranav.dot.h@gmail.com
        if (user.role !== 'admin' || user.email !== 'pranav.dot.h@gmail.com') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.user = user;
        req.internalId = internalId;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = { requireAdmin };
