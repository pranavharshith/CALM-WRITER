const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Check if Redis is configured
const useRedis = process.env.REDIS_URL || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let store;
let redisClient = null;

if (useRedis) {
    try {
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            // Use Upstash Redis REST API
            const { Redis } = require('@upstash/redis');
            redisClient = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN,
            });

            store = new RedisStore({
                client: redisClient,
                prefix: 'rl:',
            });

            console.log('✓ Using Upstash Redis for distributed rate limiting');
        } else if (process.env.REDIS_URL) {
            // Use standard Redis
            const { createClient } = require('redis');
            redisClient = createClient({ url: process.env.REDIS_URL });

            redisClient.on('error', (err) => {
                console.error('Redis rate limiter error:', err);
            });

            redisClient.connect().catch(console.error);

            store = new RedisStore({
                client: redisClient,
                prefix: 'rl:',
            });

            console.log('✓ Using Redis for distributed rate limiting');
        }
    } catch (error) {
        console.error('Failed to initialize Redis:', error.message);
        console.warn('⚠ Falling back to in-memory rate limiting');
    }
} else {
    console.warn('⚠ Using in-memory rate limiting (not suitable for production clusters)');
    if (process.env.NODE_ENV === 'production') {
        console.warn('⚠ RECOMMENDATION: Set REDIS_URL or UPSTASH_REDIS_REST_URL for distributed rate limiting in production');
    }
}

// Cleanup function for graceful shutdown
function cleanupRedis() {
    if (redisClient) {
        if (redisClient.quit) {
            redisClient.quit().catch(err => console.error('Error closing Redis connection:', err));
        }
        redisClient = null;
        console.log('✓ Redis rate limiter connection closed');
    }
}

// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: store,
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health' || req.path === '/'
});

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // Don't count successful logins
    message: { success: false, error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: store,
});

// Story endpoint limiter - 200 requests per hour (allows browsing, only POST is limited)
const storyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 200, // Increased to allow feed browsing
    message: { success: false, error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: store,
});

// Report submission limiter - 20 reports per hour
const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Too many reports submitted. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: store,
});

// Password reset limiter - 3 requests per hour
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 password reset attempts per hour
    message: { success: false, error: 'Too many password reset attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: store,
});

// Account-based rate limiter for failed login attempts
// This tracks by user email/username to prevent brute force
const loginAttemptLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 failed attempts per hour per account
    skipSuccessfulRequests: true,
    message: {
        success: false,
        error: 'Too many failed login attempts for this account. Please try again later or reset your password.',
        accountLocked: true
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: store,
    // Use email/username as key instead of IP
    keyGenerator: (req) => {
        return req.body.usernameOrEmail || req.body.email || ipKeyGenerator(req.ip);
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    storyLimiter,
    reportLimiter,
    passwordResetLimiter,
    loginAttemptLimiter,
    cleanupRedis
};
