// MinIO connection validation
// Call this function on server startup to ensure MinIO is available

const { minioClient, BUCKET_NAME } = require('./minioStorage');

async function validateMinIOConnection() {
    try {
        console.log('Validating MinIO connection...');

        // Check if we can connect to MinIO
        const buckets = await minioClient.listBuckets();
        console.log(`✓ MinIO connected successfully (${buckets.length} buckets found)`);

        // Check if our bucket exists
        const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
        if (bucketExists) {
            console.log(`✓ Bucket '${BUCKET_NAME}' exists`);
        } else {
            console.warn(`⚠️  Bucket '${BUCKET_NAME}' does not exist - will be created on first upload`);
        }

        return true;
    } catch (error) {
        console.error('❌ FATAL: MinIO connection failed:', error.message);
        console.error('   Image uploads will not work. Please check MinIO configuration.');
        console.error('   Ensure MinIO is running and credentials in .env are correct.');

        // In production, we should fail startup if MinIO is unavailable
        if (process.env.NODE_ENV === 'production') {
            console.error('   Exiting due to MinIO connection failure in production.');
            process.exit(1);
        } else {
            console.warn('   Continuing in development mode, but image uploads will fail.');
            return false;
        }
    }
}

module.exports = { validateMinIOConnection };
