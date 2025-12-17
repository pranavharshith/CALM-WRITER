const Story = require('../models/Story');
const FeaturedStory = require('../models/FeaturedStory');

async function calculateWeeklyFeatured() {
  try {
    console.log('Running weekly featured story calculation...');
    
    // Get date range for last week
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Find story with most likes from last week
    const topStory = await Story.findOne({
      createdAt: { $gte: weekStart, $lte: now },
      likes: { $gt: 0 }
    }).sort({ likes: -1, createdAt: -1 });
    
    if (!topStory) {
      console.log('No stories with likes found for this week');
      return;
    }
    
    // Clear previous featured story
    await Story.updateMany({ isFeatured: true }, { isFeatured: false });
    
    // Set new featured story
    topStory.isFeatured = true;
    topStory.featuredWeek = now;
    await topStory.save();
    
    // Save to featured history
    const featuredRecord = new FeaturedStory({
      storyId: topStory._id,
      weekStart,
      weekEnd: now,
      likeCount: topStory.likes
    });
    await featuredRecord.save();
    
    console.log(`Featured story set: ${topStory.title} with ${topStory.likes} likes`);
  } catch (error) {
    console.error('Error calculating weekly featured story:', error);
  }
}

// Run immediately if called directly
if (require.main === module) {
  calculateWeeklyFeatured().then(() => process.exit(0));
}

module.exports = { calculateWeeklyFeatured };