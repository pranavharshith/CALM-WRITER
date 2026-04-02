/**
 * Comprehensive environment variable validation
 * Runs on server startup to ensure all required configs are present
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate that a required environment variable is set
 */
function validateRequired(varName, description) {
    const value = process.env[varName];
    if (!value) {
        console.error(`FATAL: ${description}`);
        console.error(`   Environment variable '${varName}' is not set`);
        return false;
    }
    console.log(`[OK] ${description}`);
    return true;
}

/**
 * Validate that an optional environment variable is set
 */
function validateOptional(varName, description, defaultValue) {
    const value = process.env[varName];
    if (!value) {
        console.warn(`[WARN] ${description} (using default: ${defaultValue})`);
        return true;
    }
    console.log(`[OK] ${description}`);
    return true;
}

/**
 * Validate URL format
 */
function validateURL(url, description) {
    try {
        new URL(url);
        console.log(`[OK] ${description}`);
        return true;
    } catch (error) {
        console.error(`FATAL: Invalid URL for ${description}: ${url}`);
        return false;
    }
}

/**
 * Validate JWT duration format (e.g., "7d", "24h")
 */
function validateDurationFormat(duration, description) {
    if (!duration) return true; // Optional
    
    const validFormats = /^(\d+)(ms|s|m|h|d|w|y)$/;
    if (!validFormats.test(duration)) {
        console.error(`FATAL: Invalid duration format for ${description}: ${duration}`);
        console.error(`   Valid formats: 1ms, 30s, 15m, 24h, 7d, 52w, 1y`);
        return false;
    }
    console.log(`[OK] ${description} (${duration})`);
    return true;
}

/**
 * Validate port number
 */
function validatePort(port, description) {
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.error(`FATAL: Invalid port for ${description}: ${port}`);
        return false;
    }
    console.log(`[OK] ${description} (${portNum})`);
    return true;
}

/**
 * Main validation function
 */
function validateEnvironment() {
    console.log('\nValidating environment configuration...\n');
    
    let isValid = true;
    const errors = [];

    // === CRITICAL VARIABLES (must be set) ===
    console.log('Critical Configuration:');
    
    if (!validateRequired('NODE_ENV', 'Node environment')) {
        errors.push('NODE_ENV not set');
        isValid = false;
    }
    
    if (!validateRequired('JWT_SECRET', 'JWT secret key')) {
        errors.push('JWT_SECRET not set');
        isValid = false;
    }
    
    if (!validateRequired('JWT_REFRESH_SECRET', 'JWT refresh secret key')) {
        errors.push('JWT_REFRESH_SECRET not set');
        isValid = false;
    }
    
    // Accept either MONGO_URL or MONGODB_URI
    const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
    if (!mongoUrl) {
        console.error('FATAL: MongoDB connection URI');
        console.error('   Environment variable \'MONGO_URL\' or \'MONGODB_URI\' is not set');
        errors.push('MONGO_URL or MONGODB_URI not set');
        isValid = false;
    } else {
        console.log('[OK] MongoDB connection URI');
    }

    // === OPTIONAL VARIABLES (with defaults) ===
    console.log('\nOptional Configuration:');
    
    validateOptional('PORT', 'Server port', '4000');
    validateOptional('JWT_EXPIRES_IN', 'JWT expiration time', '7d');
    validateOptional('JWT_REFRESH_EXPIRES_IN', 'JWT refresh expiration time', '30d');
    
    // === JWT DURATION VALIDATION ===
    console.log('\nJWT Configuration:');
    
    if (!validateDurationFormat(process.env.JWT_EXPIRES_IN, 'JWT expiration')) {
        isValid = false;
    }
    
    if (!validateDurationFormat(process.env.JWT_REFRESH_EXPIRES_IN, 'JWT refresh expiration')) {
        isValid = false;
    }

    // === PORT VALIDATION ===
    console.log('\nServer Configuration:');
    
    if (!validatePort(process.env.PORT || 4000, 'Server port')) {
        isValid = false;
    }

    // === FRONTEND URL VALIDATION ===
    console.log('\nCORS Configuration:');
    
    if (process.env.FRONTEND_URL) {
        const urls = process.env.FRONTEND_URL.split(',').map(u => u.trim());
        let frontendUrlValid = true;
        
        for (const url of urls) {
            if (!validateURL(url, `Frontend URL: ${url}`)) {
                frontendUrlValid = false;
                isValid = false;
            }
            
            // ENFORCE HTTPS in production
            if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
                console.error(`FATAL: Frontend URL must use HTTPS in production: ${url}`);
                isValid = false;
            }
            
            // Warn if using localhost in production
            if (process.env.NODE_ENV === 'production' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
                console.error(`FATAL: Localhost URL not allowed in production: ${url}`);
                isValid = false;
            }
        }
    } else {
        if (process.env.NODE_ENV === 'production') {
            console.error('FATAL: FRONTEND_URL must be set in production');
            isValid = false;
        } else {
            console.warn('[WARN] FRONTEND_URL not set (using defaults for development)');
        }
    }

    // === MINIO CONFIGURATION ===
    console.log('\nMinIO Configuration:');
    
    const minioVars = ['MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
    const minioConfigured = minioVars.every(v => process.env[v]);
    
    if (minioConfigured) {
        console.log('[OK] MinIO fully configured');
        
        if (!validatePort(process.env.MINIO_PORT, 'MinIO port')) {
            isValid = false;
        }

        // Validate MINIO_USE_SSL is boolean-like
        if (process.env.MINIO_USE_SSL && !['true', 'false'].includes(process.env.MINIO_USE_SSL)) {
            console.error('FATAL: MINIO_USE_SSL must be "true" or "false"');
            isValid = false;
        } else {
            console.log('[OK] MinIO SSL configuration');
        }
    } else {
        console.warn('[WARN] MinIO not fully configured - image uploads will be unavailable');
        console.warn('   Required: MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY');
    }

    // === EMAIL CONFIGURATION ===
    console.log('\nEmail Configuration:');
    
    const emailVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const emailConfigured = emailVars.every(v => process.env[v]);
    
    if (emailConfigured) {
        console.log('[OK] Email service configured');
        
        if (!validatePort(process.env.SMTP_PORT, 'SMTP port')) {
            isValid = false;
        }
    }

    // === REDIS CONFIGURATION ===
    console.log('\nRedis Configuration:');
    
    const hasRedis = process.env.REDIS_URL || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    
    if (process.env.REDIS_URL) {
        if (!validateURL(process.env.REDIS_URL, 'Redis URL')) {
            isValid = false;
        }
    } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.log('[OK] Upstash Redis configured');
    } else {
        console.warn('⚠ Redis not configured - rate limiting may not work across multiple instances');
    }

    // === SUMMARY ===
    console.log('\n' + '='.repeat(50));
    
    if (isValid && errors.length === 0) {
        console.log('All critical environment variables are configured');
        console.log('='.repeat(50) + '\n');
        return true;
    } else {
        console.error('Environment validation failed');
        if (errors.length > 0) {
            console.error('\nCritical errors:');
            errors.forEach(err => console.error(`  - ${err}`));
        }
        console.log('='.repeat(50) + '\n');
        return false;
    }
}

module.exports = {
    validateEnvironment,
    validateRequired,
    validateOptional,
    validateURL,
    validateDurationFormat,
    validatePort
};
