require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkTimeout() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Replace with your username or internalId
    const user = await User.findOne({ username: 'YOUR_USERNAME' });
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('User:', user.username);
    console.log('Timeout Until:', user.timeoutUntil);
    console.log('Timeout Reason:', user.timeoutReason);
    console.log('Timeout Issued By:', user.timeoutIssuedBy);
    console.log('Current Time:', new Date());
    
    if (user.timeoutUntil && user.timeoutUntil > new Date()) {
      const timeRemaining = user.timeoutUntil - new Date();
      const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
      console.log(`\nTimeout active for ${hoursRemaining} more hours`);
    } else {
      console.log('\nNo active timeout');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTimeout();
