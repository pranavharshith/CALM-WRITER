const cron = require('node-cron');
const { logger } = require('./logger');

// Valid timezones (IANA timezone database)
const VALID_TIMEZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Hong_Kong', 'Asia/Singapore', 'Australia/Sydney', 'Australia/Melbourne',
    'Pacific/Auckland', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
    'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Seoul'
];

// Get and validate timezone
const TIMEZONE = process.env.TIMEZONE || 'UTC';
if (!VALID_TIMEZONES.includes(TIMEZONE)) {
    logger.warn(`Invalid timezone: ${TIMEZONE}. Using UTC instead.`);
}

// Import job functions
const { calculateWeeklyFeatured } = require('../jobs/weeklyFeatured');
const { cleanAbandonedDrafts } = require('../jobs/cleanDrafts');
const { cleanExpiredOTPs } = require('../jobs/cleanExpiredOTPs');
const { cleanupExpiredData } = require('../jobs/dataRetentionCleanup');

/**
 * Initialize all scheduled jobs
 */
function initializeScheduledJobs() {
    logger.info('Initializing scheduled jobs...');
    logger.info(`Using timezone: ${TIMEZONE}`);

    // Weekly Featured Story - Every Monday at 00:00
    cron.schedule('0 0 * * 1', async () => {
        logger.info('Running weekly featured story selection...');
        try {
            await calculateWeeklyFeatured();
            logger.info('✓ Weekly featured story selected');
        } catch (error) {
            logger.error('Failed to select weekly featured story:', error);
            // Retry logic could be added here
        }
    }, {
        timezone: TIMEZONE
    });

    // Clean old drafts - Every day at 02:00
    cron.schedule('0 2 * * *', async () => {
        logger.info('Running draft cleanup job...');
        try {
            await cleanAbandonedDrafts();
            logger.info('✓ Old drafts cleaned');
        } catch (error) {
            logger.error('Failed to clean old drafts:', error);
            // Retry logic could be added here
        }
    }, {
        timezone: TIMEZONE
    });

    // Clean expired OTPs - Every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        logger.info('Running OTP cleanup job...');
        try {
            await cleanExpiredOTPs();
            logger.info('✓ Expired OTPs cleaned');
        } catch (error) {
            logger.error('Failed to clean expired OTPs:', error);
        }
    }, {
        timezone: TIMEZONE
    });

    // Data retention cleanup - Every day at 03:00
    cron.schedule('0 3 * * *', async () => {
        logger.info('Running data retention cleanup job...');
        try {
            await cleanupExpiredData();
            logger.info('✓ Data retention cleanup completed');
        } catch (error) {
            logger.error('Failed to run data retention cleanup:', error);
        }
    }, {
        timezone: TIMEZONE
    });

    // Database health check - Every hour
    cron.schedule('0 * * * *', async () => {
        const mongoose = require('mongoose');
        const status = mongoose.connection.readyState;
        logger.info(`Database health check: ${status === 1 ? 'Connected' : 'Disconnected'}`);
    });

    logger.info('✓ Scheduled jobs initialized');
}

module.exports = { initializeScheduledJobs };
