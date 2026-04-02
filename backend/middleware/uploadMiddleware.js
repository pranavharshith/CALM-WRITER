const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');

// File upload configuration with size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BUFFER_SIZE = 50 * 1024 * 1024; // 50MB for processing
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Magic bytes for file type validation
const MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/gif': [0x47, 0x49, 0x46]
};

/**
 * Validate file magic bytes to prevent MIME type spoofing
 */
function validateMagicBytes(buffer, mimeType) {
  const expectedBytes = MAGIC_BYTES[mimeType];
  if (!expectedBytes) return false;
  
  for (let i = 0; i < expectedBytes.length; i++) {
    if (buffer[i] !== expectedBytes[i]) {
      return false;
    }
  }
  
  return true;
}

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // Only allow one file at a time
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`));
        }
        
        // Validate magic bytes
        if (req.file && req.file.buffer) {
            if (!validateMagicBytes(req.file.buffer, file.mimetype)) {
                return cb(new Error('File content does not match MIME type'));
            }
        }
        
        cb(null, true);
    }
});

/**
 * Optimize image using sharp
 * - Validate buffer size before processing
 * - Resize to max dimensions
 * - Convert to WebP for better compression
 * - Strip metadata for privacy
 */
async function optimizeImage(buffer, maxWidth = 1200, maxHeight = 1200) {
    try {
        // Validate buffer size to prevent DoS
        if (buffer.length > MAX_BUFFER_SIZE) {
            throw new Error(`Buffer size exceeds maximum allowed size of ${MAX_BUFFER_SIZE} bytes`);
        }

        const optimized = await sharp(buffer)
            .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 85 })
            .toBuffer();

        return optimized;
    } catch (error) {
        throw new Error('Failed to optimize image: ' + error.message);
    }
}

/**
 * Get image dimensions
 */
async function getImageDimensions(buffer) {
    try {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width,
            height: metadata.height
        };
    } catch (error) {
        throw new Error('Failed to read image metadata: ' + error.message);
    }
}

/**
 * Generate unique filename for upload
 */
function generateUploadFilename(originalName) {
    const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
    const randomId = crypto.randomBytes(8).toString('hex');
    return `${randomId}${ext}`;
}

module.exports = {
    upload,
    optimizeImage,
    getImageDimensions,
    generateUploadFilename,
    validateMagicBytes,
    MAX_FILE_SIZE,
    MAX_BUFFER_SIZE,
    ALLOWED_IMAGE_TYPES
};
