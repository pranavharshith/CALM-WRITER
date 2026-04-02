/**
 * Enhanced password validation with complexity requirements
 */

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * Validate password complexity
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not in common passwords list
 */
function validatePasswordComplexity(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Password is required'] };
    }

    if (password.length < MIN_LENGTH) {
        errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
    }

    if (password.length > MAX_LENGTH) {
        errors.push(`Password must not exceed ${MAX_LENGTH} characters`);
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
        'password', 'password123', '12345678', 'qwerty', 'abc123',
        'password1', '123456789', 'letmein', 'welcome', 'admin123',
        'passw0rd', 'p@ssw0rd', 'pass123', 'test123', 'user123',
        '123123', 'password!', 'pass@word', 'admin', 'root',
        'toor', 'pass', 'test', 'guest', 'info', 'adm', 'mysql',
        'postgres', 'mongodb', 'admin@123', 'password@123', 'qwerty123',
        'asdfgh', 'zxcvbn', 'qazwsx', 'iloveyou', 'sunshine',
        'princess', 'dragon', 'master', 'shadow', 'monkey'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('This password is too common. Please choose a stronger password');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Check if password has been used before (prevent reuse)
 * @param {string} newPassword - New password to check
 * @param {Array} passwordHistory - Array of previous password hashes
 * @returns {Promise<boolean>} - True if password is new, false if reused
 */
async function isPasswordReused(newPassword, passwordHistory = []) {
    if (!passwordHistory || passwordHistory.length === 0) {
        return false; // No history, so not reused
    }

    const bcrypt = require('bcryptjs');
    
    for (const oldHash of passwordHistory) {
        try {
            const isMatch = await bcrypt.compare(newPassword, oldHash);
            if (isMatch) {
                return true; // Password was reused
            }
        } catch (error) {
            console.error('Error checking password history:', error);
        }
    }

    return false; // Password is new
}

/**
 * Express middleware for password validation
 */
function passwordValidationMiddleware(req, res, next) {
    const password = req.body.password || req.body.newPassword;

    if (!password) {
        return next(); // Let route handler deal with missing password
    }

    const validation = validatePasswordComplexity(password);

    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            error: 'Password does not meet complexity requirements',
            details: validation.errors
        });
    }

    next();
}

module.exports = {
    validatePasswordComplexity,
    isPasswordReused,
    passwordValidationMiddleware
};
