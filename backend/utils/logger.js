const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// Define transports with log rotation
const transports = [
    // Console transport
    new winston.transports.Console(),

    // Error log file with rotation (rotate daily, keep 14 days)
    new winston.transports.DailyRotateFile({
        filename: path.join(__dirname, '../logs/error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxDays: '14d',
        maxSize: '20m'
    }),

    // Combined log file with rotation (rotate daily, keep 7 days)
    new winston.transports.DailyRotateFile({
        filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxDays: '7d',
        maxSize: '20m'
    }),

    // Security events log file with rotation (rotate daily, keep 30 days)
    new winston.transports.DailyRotateFile({
        filename: path.join(__dirname, '../logs/security-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'warn',
        maxDays: '30d',
        maxSize: '20m'
    }),
];

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
});

// Security event logger with redaction
function logSecurityEvent(event, details) {
    // Redact sensitive data
    const redactedDetails = redactSensitiveData(details);
    logger.warn(`SECURITY: ${event}`, { ...redactedDetails, timestamp: new Date().toISOString() });
}

// Authentication event logger with redaction
function logAuthEvent(event, userId, success, details = {}) {
    const level = success ? 'info' : 'warn';
    const redactedDetails = redactSensitiveData(details);
    logger.log(level, `AUTH: ${event} - User: ${userId} - Success: ${success}`, redactedDetails);
}

// Admin action logger with redaction
function logAdminAction(action, adminId, targetId, details = {}) {
    const redactedDetails = redactSensitiveData(details);
    logger.info(`ADMIN: ${action} - Admin: ${adminId} - Target: ${targetId}`, redactedDetails);
}

// Redact sensitive data from logs
function redactSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const redacted = JSON.parse(JSON.stringify(obj)); // Deep copy
    const sensitiveFields = [
        'email', 'password', 'token', 'otp', 'refreshToken', 'accessToken',
        'internalId', 'storyId', 'nodeId', 'userId', 'userInternalId',
        'passwordHash', 'otpHash', 'creditCard', 'ssn', 'apiKey'
    ];
    
    function redactRecursive(obj) {
        for (const key in obj) {
            if (sensitiveFields.includes(key.toLowerCase())) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                redactRecursive(obj[key]);
            }
        }
    }
    
    redactRecursive(redacted);
    return redacted;
}

module.exports = {
    logger,
    logSecurityEvent,
    logAuthEvent,
    logAdminAction
};
