/**
 * Security headers middleware
 * Adds important security headers to all responses
 */

/**
 * Middleware to add security headers
 */
function securityHeadersMiddleware(req, res, next) {
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy - don't send referrer to external sites
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy - restrict browser features
    res.setHeader('Permissions-Policy', [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()'
    ].join(', '));
    
    // Content Security Policy - prevent inline scripts and restrict resource loading
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React needs unsafe-eval in dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    
    // Strict Transport Security - force HTTPS in production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Remove server identification header
    res.removeHeader('Server');
    res.setHeader('Server', 'CalmStories');
    
    next();
}

module.exports = {
    securityHeadersMiddleware
};
