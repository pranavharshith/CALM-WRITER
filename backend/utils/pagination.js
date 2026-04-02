// Pagination helper with maximum limit enforcement
// Prevents users from requesting unlimited items which could cause memory exhaustion

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_REQUESTS_PER_HOUR = 1000; // Per-user limit

// Track user requests (in production, use Redis)
const userRequestCounts = new Map();

/**
 * Check if user has exceeded hourly request limit
 * @param {string} userId - User internal ID
 * @returns {boolean} - True if limit exceeded
 */
function hasExceededRequestLimit(userId) {
    if (!userId) return false; // Anonymous users not tracked
    
    const now = Date.now();
    const userKey = `${userId}:${Math.floor(now / 3600000)}`; // Hour-based key
    
    const count = userRequestCounts.get(userKey) || 0;
    if (count >= MAX_REQUESTS_PER_HOUR) {
        return true;
    }
    
    userRequestCounts.set(userKey, count + 1);
    
    // Cleanup old entries (keep only last 2 hours)
    for (const [key] of userRequestCounts) {
        const keyHour = parseInt(key.split(':')[1]);
        const currentHour = Math.floor(now / 3600000);
        if (currentHour - keyHour > 2) {
            userRequestCounts.delete(key);
        }
    }
    
    return false;
}

/**
 * Parse and validate pagination parameters from request query
 * @param {Object} query - Express request query object
 * @param {string} userId - User internal ID (optional)
 * @returns {Object} - Validated { limit, skip } object or error
 */
function getPaginationParams(query, userId = null) {
    // Check per-user request limit
    if (userId && hasExceededRequestLimit(userId)) {
        return {
            error: 'Too many requests. Please slow down.',
            code: 'RATE_LIMIT_EXCEEDED'
        };
    }

    let limit = parseInt(query.limit) || DEFAULT_LIMIT;
    let page = parseInt(query.page) || 1;

    // Enforce maximum limit
    if (limit > MAX_LIMIT) {
        limit = MAX_LIMIT;
    }

    // Ensure positive values
    if (limit < 1) limit = DEFAULT_LIMIT;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    return { limit, skip, page };
}

/**
 * Create pagination metadata for response
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination metadata
 */
function getPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);

    return {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}

module.exports = {
    getPaginationParams,
    getPaginationMeta,
    DEFAULT_LIMIT,
    MAX_LIMIT
};
