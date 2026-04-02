const mongoose = require('mongoose');
require('dotenv').config();

async function checkStories() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');
    
    const Story = require('../models/Story');
    const User = require('../models/User');
    const stories = await Story.find({});
    
    console.log(`Found ${stories.length} stories:\n`);
    
    for (const story of stories) {
      const author = await User.findOne({ internalId: story.internalAuthorId });
      console.log('---');
      console.log('Title:', story.title);
      console.log('Author InternalId:', story.internalAuthorId);
      console.log('Author Username:', author?.username || 'NOT FOUND');
      console.log('Author Email:', author?.email || 'NOT FOUND');
      console.log('Created:', story.createdAt);
      console.log('---\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStories();
