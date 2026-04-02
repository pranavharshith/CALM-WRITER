/**
 * Migration script to populate Story.likedBy arrays from Like collection
 * This fixes the issue where old stories don't show their likes
 * 
 * Run with: node backend/scripts/migrateOldLikes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Story = require('../models/Story');
const Like = require('../models/Like');

dotenv.config();

async function migrateOldLikes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    console.log('\nStarting migration of old likes...');

    // Get all stories
    const stories = await Story.find({}).lean();
    console.log(`Found ${stories.length} stories to check`);

    let updated = 0;
    let skipped = 0;

    for (const story of stories) {
      // Get all likes for this story
      const likes = await Like.find({ storyId: story._id }).lean();

      if (likes.length === 0) {
        skipped++;
        continue;
      }

      // Extract user IDs from likes
      const likedByUsers = likes.map(like => like.userInternalId);

      // Check if likedBy array is empty or incomplete
      const currentLikedBy = story.likedBy || [];
      const needsUpdate = likedByUsers.length !== currentLikedBy.length ||
        !likedByUsers.every(id => currentLikedBy.includes(id));

      if (needsUpdate) {
        // Update story with correct likedBy array and like count
        await Story.findByIdAndUpdate(story._id, {
          likedBy: likedByUsers,
          likes: likedByUsers.length
        });

        updated++;
        console.log(`✓ Updated story ${story._id}: ${likedByUsers.length} likes`);
      } else {
        skipped++;
      }
    }

    console.log(`\n✓ Migration complete!`);
    console.log(`  - Updated: ${updated} stories`);
    console.log(`  - Skipped: ${skipped} stories (already correct)`);

    // Verify data consistency
    console.log('\nVerifying data consistency...');
    const inconsistencies = await Story.find({
      $expr: { $ne: [{ $size: '$likedBy' }, '$likes'] }
    });

    if (inconsistencies.length > 0) {
      console.warn(`⚠ Found ${inconsistencies.length} stories with inconsistent like counts`);
      for (const story of inconsistencies) {
        console.warn(`  Story ${story._id}: likedBy.length=${story.likedBy.length}, likes=${story.likes}`);
      }
    } else {
      console.log('✓ All stories have consistent like counts');
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateOldLikes();
