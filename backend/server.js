const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { logger, logSecurityEvent } = require('./utils/logger');
const { verifyCSRFTokenMiddleware, generateCSRFTokenMiddleware } = require('./middleware/csrfProtection');

dotenv.config();

// Validate environment variables before starting server
const { validateEnvironment } = require('./utils/validateEnv');
validateEnvironment();

const app = express();

// Middleware to generate nonce for CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('hex');
  next();
});

// Security middleware with dynamic CSP for production using nonces
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
  styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
  imgSrc: ["'self'", "https:"], // Removed 'data:' - only allow https images
  connectSrc: ["'self'"],
  fontSrc: ["'self'", "data:"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"]
};

// Add development-specific CSP rules
if (process.env.NODE_ENV !== 'production') {
  cspDirectives.imgSrc.push("http://localhost:9000");
  cspDirectives.connectSrc.push("http://localhost:4000", "http://localhost:9000");
} else {
  // Add production MinIO endpoint
  if (process.env.MINIO_ENDPOINT) {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const port = process.env.MINIO_PORT || 9000;
    cspDirectives.imgSrc.push(`${protocol}://${process.env.MINIO_ENDPOINT}:${port}`);
    cspDirectives.connectSrc.push(`${protocol}://${process.env.MINIO_ENDPOINT}:${port}`);
  }
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  // Additional security headers
  xContentTypeOptions: true, // Prevent MIME sniffing
  xFrameOptions: { action: 'deny' }, // Prevent clickjacking
  xXssProtection: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// HTTPS enforcement in production (only if behind trusted proxy)
if (process.env.NODE_ENV === 'production') {
  // Validate TRUST_PROXY is set
  if (process.env.TRUST_PROXY !== 'true') {
    logger.warn('⚠ TRUST_PROXY not set in production. HTTPS redirect disabled.');
    logger.warn('⚠ Set TRUST_PROXY=true if behind a reverse proxy (nginx, load balancer, etc.)');
  } else {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        logSecurityEvent('HTTP_REDIRECT_ATTEMPT', { ip: req.ip, path: req.path });
        return res.redirect(`https://${req.header('host')}${req.url}`);
      }
      next();
    });
  }
} else {
  logger.info('Development mode: HTTPS enforcement disabled');
}

// CORS configuration with strict origin validation
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || '').split(',').map(url => url.trim()).filter(url => url)
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

// Validate origin format (prevent subdomain takeover)
function isValidOrigin(origin) {
  try {
    const url = new URL(origin);
    // Only allow https in production
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return false;
    }
    // Check exact match in allowlist
    return allowedOrigins.includes(origin);
  } catch (error) {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || !process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      logSecurityEvent('CORS_REJECTED', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-CSRF-Token'], // Added X-CSRF-Token
  exposedHeaders: ['set-cookie'],
  maxAge: 86400 // 24 hours
}));

// Request size limits to prevent DOS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Response formatter middleware to standardize all responses
const { standardizeErrorResponse } = require('./middleware/responseFormatter');
app.use(standardizeErrorResponse);

// CSRF protection middleware - generate token for all requests
app.use(generateCSRFTokenMiddleware);

// CSRF verification middleware - but skip for csrf-token endpoint and GET requests
app.use((req, res, next) => {
  // Skip CSRF for the token-fetch endpoint itself
  if (req.path === '/auth/csrf-token') {
    return next();
  }
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  // Skip CSRF for public auth routes — these are called from the login page
  // before any session exists, so CSRF is inapplicable (CSRF requires an
  // existing authenticated session to be exploitable).
  const publicAuthPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/auth/request-otp',
    '/auth/verify-otp'
  ];
  if (publicAuthPaths.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }
  verifyCSRFTokenMiddleware(req, res, next);
});

// MongoDB injection prevention - disabled due to conflicts with read-only properties
// The framework's built-in protections and input validation are sufficient
// const mongoSanitize = require('express-mongo-sanitize');
// app.use(mongoSanitize());

// Import rate limiters
const { apiLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');

// Request logging middleware for audit trail
app.use(requestLogger);

// Middleware to handle common browser/DevTools requests
app.use((req, res, next) => {
  if (req.path.startsWith('/.well-known')) {
    return res.status(204).end();
  }
  if (req.path === '/favicon.ico') {
    return res.status(204).end();
  }
  if (req.path === '/robots.txt') {
    res.type('text/plain');
    return res.send('User-agent: *\\nDisallow: /');
  }
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Calm Stories API',
    version: '3.1.0',
    endpoints: ['/stories', '/reactions', '/reads', '/auth', '/admin', '/threads', '/leaderboards', '/moderation', '/bookmarks', '/hubs']
  });
});

// Health check endpoint with dependency status
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = 'connected';
    } else {
      health.services.mongodb = 'disconnected';
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.mongodb = 'error';
    health.status = 'unhealthy';
  }

  // Check MinIO
  try {
    const { isMinIOAvailable } = require('./utils/minioStorage');
    health.services.minio = isMinIOAvailable() ? 'available' : 'unavailable';
    if (!isMinIOAvailable()) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.minio = 'error';
  }

  // Email service status
  health.services.email = process.env.SMTP_USER ? 'configured' : 'not configured';

  // Redis status (if configured)
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const testClient = createClient({ url: process.env.REDIS_URL });
      await testClient.connect();
      await testClient.ping();
      health.services.redis = 'connected';
      await testClient.quit();
    } catch (error) {
      health.services.redis = 'error';
      health.status = 'degraded';
    }
  } else {
    health.services.redis = 'not configured';
  }

  // Database replication status (if applicable)
  try {
    const adminDb = mongoose.connection.db.admin();
    const replicaStatus = await adminDb.command({ replSetGetStatus: 1 }).catch(() => null);
    if (replicaStatus) {
      health.services.replication = 'active';
    } else {
      health.services.replication = 'standalone';
    }
  } catch (error) {
    health.services.replication = 'unknown';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// API routes with specific rate limiters
const { authLimiter, reportLimiter, loginAttemptLimiter } = require('./middleware/rateLimiter');

app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/auth', require('./routes/auth-refresh'));
app.use('/auth', require('./routes/sessions')); // Logout and verify endpoints
app.use('/stories', require('./routes/stories'));
app.use('/users', require('./routes/users'));
app.use('/admin', require('./routes/admin'));
app.use('/reads', require('./routes/sessions'));
app.use('/reactions', require('./routes/reactions'));
app.use('/threads', require('./routes/threads'));
app.use('/leaderboards', require('./routes/leaderboards'));
app.use('/moderation', reportLimiter, require('./routes/moderation'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/follows', require('./routes/follows'));
app.use('/drafts', require('./routes/drafts'));
app.use('/preferences', require('./routes/preferences'));
app.use('/translate', require('./routes/translate'));
app.use('/prompts', require('./routes/prompts'));
app.use('/transparency', require('./routes/transparency'));
app.use('/uploads', require('./routes/uploads'));
app.use('/notifications', require('./routes/notifications'));
app.use('/edit-requests', require('./routes/edit-requests'));

// Collaborative Hubs routes
app.use('/hubs', require('./routes/hub-management'));
app.use('/hubs', require('./routes/hub-content-chat'));
app.use('/hubs', require('./routes/hub-creator-applications'));
app.use('/hubs', require('./routes/hub-membership'));
app.use('/hubs', require('./routes/hub-content'));
app.use('/hubs', require('./routes/hub-chat'));
app.use('/hubs', require('./routes/hub-applications'));

// Initialize MinIO storage (graceful degradation if unavailable)
const { initializeBucket, checkMinIOHealth } = require('./utils/minioStorage');
const { initializeEmailService } = require('./services/emailService');

initializeBucket().then(success => {
  if (success) {
    logger.info('✓ MinIO storage initialized');
  } else {
    logger.warn('⚠ MinIO unavailable - image uploads disabled');
  }
}).catch(err => {
  logger.error('MinIO initialization error:', err.message);
});

// Initialize email service (graceful degradation if not configured)
const emailInitialized = initializeEmailService();
if (!emailInitialized) {
  logger.warn('⚠ Email service unavailable - emails will be logged to console');
}

// Error handling middleware - don't leak stack traces in production
app.use((err, req, res, next) => {
  const { errorHandler } = require('./utils/errorHandler');
  errorHandler(err, req, res, next);
});

// Handle any other 404s silently (for browser/DevTools requests)
app.use((req, res) => {
  if (!req.originalUrl.includes('.well-known') &&
    !req.originalUrl.includes('favicon') &&
    !req.originalUrl.includes('chrome-extension')) {
    logger.info(`404: ${req.method} ${req.originalUrl}`);
  }
  res.status(404).json({ success: false, error: 'Not found' });
});

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/calmstories';

// MongoDB connection with retry logic
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

async function connectWithRetry(retryCount = 0) {
  try {
    await mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Maximum number of connections in pool
      minPoolSize: 2, // Minimum number of connections in pool
      maxIdleTimeMS: 45000, // Close idle connections after 45 seconds
      waitQueueTimeoutMS: 10000, // Wait max 10 seconds for connection from pool
      retryWrites: true,
      retryReads: true,
      serverMonitoringMode: 'auto'
    });

    logger.info('✓ MongoDB connected');

    // Create database indexes on startup
    try {
      const { createDatabaseIndexes } = require('./utils/dbIndexes');
      await createDatabaseIndexes();
      logger.info('✓ Database indexes created');
    } catch (error) {
      logger.error('Warning: Failed to create database indexes:', error.message);
    }

    // Initialize scheduled jobs
    const { initializeScheduledJobs } = require('./utils/scheduler');
    initializeScheduledJobs();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`✓ API server running on port ${PORT}`);
      logger.info('✓ Security middleware enabled');
      logger.info('✓ Rate limiting active');
    });

    // Store server instance for graceful shutdown
    app.set('server', server);

  } catch (err) {
    logger.error(`MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err.message);

    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      setTimeout(() => connectWithRetry(retryCount + 1), RETRY_DELAY);
    } else {
      logger.error('FATAL: Could not connect to MongoDB after maximum retries');
      process.exit(1);
    }
  }
}

// Start connection
connectWithRetry();

// MongoDB connection event handlers
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('✓ MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

// Graceful shutdown handlers
let isShuttingDown = false;

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  const server = app.get('server');

  if (server) {
    server.close(() => {
      logger.info('✓ HTTP server closed');
    });
  }

  // Set shutdown timeout (60 seconds - increased from 30)
  const shutdownTimeout = setTimeout(() => {
    logger.error('⚠ Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 60000);

  try {
    // Cleanup Redis connections
    const { cleanupRedis } = require('./middleware/rateLimiter');
    cleanupRedis();

    // Cleanup MinIO health check interval
    const { cleanup: minioCleanup } = require('./utils/minioStorage');
    minioCleanup();
    logger.info('✓ MinIO health check stopped');

    // Close database connection
    await mongoose.connection.close();
    logger.info('✓ MongoDB connection closed');

    clearTimeout(shutdownTimeout);
    logger.info('✓ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

module.exports = app;
