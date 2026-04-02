/**
 * Security validation middleware to prevent common attacks
 */

/**
 * Escape regex special characters to prevent regex injection
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for use in regex
 */
function escapeRegex(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate and sanitize search query to prevent regex injection
 * @param {string} query - Search query from user
 * @returns {object} Safe regex object or null if invalid
 */
function validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
        return null;
    }

    // Limit query length to prevent DoS
    if (query.length > 500) {
        return null;
    }

    // Escape special regex characters
    const escaped = escapeRegex(query.trim());
    
    try {
        // Create regex with escaped string
        return new RegExp(escaped, 'i');
    } catch (error) {
        console.error('Invalid search query:', error);
        return null;
    }
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} Validated pagination object
 */
function validatePagination(page, limit) {
    let validPage = parseInt(page) || 1;
    let validLimit = parseInt(limit) || 10;

    // Enforce bounds
    if (validPage < 1) validPage = 1;
    if (validPage > 10000) validPage = 10000;
    if (validLimit < 1) validLimit = 1;
    if (validLimit > 100) validLimit = 100;

    return {
        page: validPage,
        limit: validLimit,
        skip: (validPage - 1) * validLimit
    };
}

/**
 * Middleware to validate search queries
 */
function validateSearchMiddleware(req, res, next) {
    if (req.query.search) {
        const regex = validateSearchQuery(req.query.search);
        if (!regex) {
            return res.status(400).json({ error: 'Invalid search query' });
        }
        req.searchRegex = regex;
    }
    next();
}

/**
 * Middleware to validate pagination
 */
function validatePaginationMiddleware(req, res, next) {
    const pagination = validatePagination(req.query.page, req.query.limit);
    req.pagination = pagination;
    next();
}

module.exports = {
    escapeRegex,
    validateSearchQuery,
    validatePagination,
    validateSearchMiddleware,
    validatePaginationMiddleware
};
