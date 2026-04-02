const Minio = require('minio');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// MinIO configuration - validate required env vars
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT = process.env.MINIO_PORT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;

if (!MINIO_ENDPOINT || !MINIO_PORT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
    console.warn('⚠ MinIO environment variables not fully configured. Image uploads will be unavailable.');
    console.warn('⚠ Required: MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY');
}

const minioClient = new Minio.Client({
    endPoint: MINIO_ENDPOINT || 'localhost',
    port: parseInt(MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'calmstories';

// MinIO availability status
let minioAvailable = false;
let lastHealthCheck = null;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
let healthCheckInterval = null;

/**
 * Check if MinIO is available and healthy
 */
async function checkMinIOHealth() {
    try {
        await minioClient.listBuckets();
        minioAvailable = true;
        lastHealthCheck = new Date();
        return true;
    } catch (error) {
        minioAvailable = false;
        lastHealthCheck = new Date();
        console.error('MinIO health check failed:', error.message);
        return false;
    }
}

/**
 * Get MinIO availability status
 */
function isMinIOAvailable() {
    // If health check is stale, return false
    if (!lastHealthCheck || (Date.now() - lastHealthCheck.getTime()) > HEALTH_CHECK_INTERVAL) {
        return false;
    }
    return minioAvailable;
}

/**
 * Initialize bucket - create if doesn't exist
 * GRACEFUL DEGRADATION: Returns false if MinIO unavailable, doesn't crash server
 */
async function initializeBucket() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            console.log(`✓ MinIO bucket '${BUCKET_NAME}' created successfully`);
        } else {
            console.log(`✓ MinIO bucket '${BUCKET_NAME}' already exists`);
        }

        // Set bucket to public read for profile pictures
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
                },
            ],
        };

        await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
        console.log(`✓ MinIO bucket policy set to public read`);

        minioAvailable = true;
        lastHealthCheck = new Date();

        // Start periodic health check only after successful initialization
        startHealthCheck();

        return true;
    } catch (error) {
        console.error('⚠ MinIO initialization failed:', error.message);
        console.warn('⚠ Server will start without image upload functionality');
        console.warn('⚠ To enable image uploads, ensure MinIO is running and restart the server');
        minioAvailable = false;
        lastHealthCheck = new Date();
        return false;
    }
}

/**
 * Start periodic health check
 */
function startHealthCheck() {
    // Clear any existing interval
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }

    healthCheckInterval = setInterval(async () => {
        await checkMinIOHealth();
    }, HEALTH_CHECK_INTERVAL);
}

/**
 * Upload file to MinIO
 * GRACEFUL DEGRADATION: Returns error if MinIO unavailable
 */
async function uploadFile(fileBuffer, originalName, contentType = 'application/octet-stream') {
    // Check MinIO availability
    if (!isMinIOAvailable()) {
        const isHealthy = await checkMinIOHealth();
        if (!isHealthy) {
            throw new Error('Image upload service is currently unavailable. Please try again later.');
        }
    }

    try {
        const ext = path.extname(originalName);
        const fileName = `${uuidv4()}${ext}`;
        const metaData = {
            'Content-Type': contentType,
            'X-Original-Name': originalName,
        };

        await minioClient.putObject(BUCKET_NAME, fileName, fileBuffer, fileBuffer.length, metaData);

        // Generate public URL with proper protocol
        const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
        const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const port = process.env.MINIO_PORT || 9000;
        const url = `${protocol}://${endpoint}:${port}/${BUCKET_NAME}/${fileName}`;

        return { fileName, url };
    } catch (error) {
        console.error('MinIO upload error:', error);
        throw new Error('Failed to upload file to storage');
    }
}

/**
 * Delete file from MinIO
 * GRACEFUL DEGRADATION: Logs error but doesn't crash if MinIO unavailable
 */
async function deleteFile(fileName) {
    if (!isMinIOAvailable()) {
        console.warn('MinIO unavailable, cannot delete file:', fileName);
        return false;
    }

    try {
        await minioClient.removeObject(BUCKET_NAME, fileName);
        return true;
    } catch (error) {
        console.error('MinIO delete error:', error);
        return false;
    }
}

/**
 * Get file URL (public access)
 */
function getFileUrl(fileName) {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || 9000;
    return `${protocol}://${endpoint}:${port}/${BUCKET_NAME}/${fileName}`;
}

// Export cleanup function for graceful shutdown
function cleanup() {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
        console.log('✓ MinIO health check interval cleared');
    }
}

module.exports = {
    initializeBucket,
    uploadFile,
    deleteFile,
    getFileUrl,
    isMinIOAvailable,
    checkMinIOHealth,
    cleanup
};
