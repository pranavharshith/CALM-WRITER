const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Story = require('../../models/Story');
const { requireAuth } = require('../../middleware/auth');
const { upload, validateMagicBytes, optimizeImage } = require('../../middleware/uploadMiddleware');

async function sanitizeUploadedImage(file) {
  if (!file?.buffer) {
    const err = new Error('No image provided');
    err.status = 400;
    throw err;
  }
  if (!validateMagicBytes(file.buffer, file.mimetype)) {
    const err = new Error('File content does not match the declared type');
    err.status = 400;
    throw err;
  }
  try {
    return await optimizeImage(file.buffer);
  } catch (error) {
    const err = new Error('Invalid or unsupported image');
    err.status = 400;
    throw err;
  }
}
const { uploadFile, deleteFile } = require('../../utils/minioStorage');
const { verifyCSRFTokenMiddleware } = require('../../middleware/csrfProtection');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Rate limiter for file uploads - 10 uploads per hour per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, error: 'Too many uploads. Maximum 10 uploads per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.internalId || ipKeyGenerator(req.ip),
  skip: (req) => !req.internalId // Skip if not authenticated
});

// POST /uploads/profile-picture - Upload profile picture
router.post('/profile-picture', requireAuth, verifyCSRFTokenMiddleware, uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    let optimized;
    try {
      optimized = await sanitizeUploadedImage(req.file);
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }

    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.profilePicture?.fileName) {
      await deleteFile(user.profilePicture.fileName);
    }

    const { fileName, url } = await uploadFile(optimized, `${req.internalId}-${Date.now()}.webp`, 'image/webp');

    user.profilePicture = {
      url,
      fileName: `profile-pictures/${fileName}`,
      uploadedAt: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded',
      profilePicture: {
        url: user.profilePicture.url,
        uploadedAt: user.profilePicture.uploadedAt
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
  }
});

// DELETE /uploads/profile-picture - Delete profile picture
router.delete('/profile-picture', requireAuth, verifyCSRFTokenMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ internalId: req.internalId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.profilePicture?.fileName) {
      await deleteFile(user.profilePicture.fileName);
      user.profilePicture = undefined;
      await user.save();
    }

    res.json({ success: true, message: 'Profile picture deleted' });
  } catch (error) {
    console.error('Profile picture deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete profile picture' });
  }
});

// POST /uploads/story/:storyId/cover - Upload story cover
router.post('/story/:storyId/cover', requireAuth, verifyCSRFTokenMiddleware, uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const story = await Story.findById(req.params.storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    if (story.internalAuthorId !== req.internalId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Validate cover dimensions
    const width = parseInt(req.body.width);
    const height = parseInt(req.body.height);
    
    if (isNaN(width) || isNaN(height) || width < 100 || width > 2000 || height < 100 || height > 2000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid cover dimensions. Width and height must be between 100-2000px.' 
      });
    }

    let optimized;
    try {
      optimized = await sanitizeUploadedImage(req.file);
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }

    if (story.coverImage?.fileName) {
      await deleteFile(story.coverImage.fileName);
    }

    const { fileName, url } = await uploadFile(optimized, `${req.params.storyId}-${Date.now()}.webp`, 'image/webp');

    story.coverImage = {
      url,
      fileName: `story-covers/${fileName}`,
      uploadedAt: new Date(),
      width,
      height
    };

    await story.save();

    res.json({
      success: true,
      message: 'Story cover uploaded',
      coverImage: {
        url: story.coverImage.url,
        uploadedAt: story.coverImage.uploadedAt
      }
    });
  } catch (error) {
    console.error('Story cover upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload story cover' });
  }
});

// DELETE /uploads/story/:storyId/cover - Delete story cover
router.delete('/story/:storyId/cover', requireAuth, verifyCSRFTokenMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    if (story.internalAuthorId !== req.internalId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (story.coverImage?.fileName) {
      await deleteFile(story.coverImage.fileName);
      story.coverImage = undefined;
      await story.save();
    }

    res.json({ success: true, message: 'Story cover deleted' });
  } catch (error) {
    console.error('Story cover deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete story cover' });
  }
});

module.exports = router;
