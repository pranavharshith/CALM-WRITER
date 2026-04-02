require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function clearTimeout() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Replace with your username or internalId
    const username = process.argv[2] || 'YOUR_USERNAME';
    
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`User "${username}" not found`);
      process.exit(1);
    }
    
    console.log('Before:');
    console.log('  Username:', user.username);
    console.log('  Timeout Until:', user.timeoutUntil);
    console.log('  Timeout Reason:', user.timeoutReason);
    
    // Clear timeout
    user.timeoutUntil = null;
    user.timeoutReason = null;
    user.timeoutIssuedBy = null;
    await user.save();
    
    console.log('\nAfter:');
    console.log('  Timeout Until:', user.timeoutUntil);
    console.log('  ✓ Timeout cleared successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearTimeout();
