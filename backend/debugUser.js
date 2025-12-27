const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');
    
    const User = require('./models/User');
    const users = await User.find({});
    
    console.log(`Found ${users.length} users:\n`);
    users.forEach(user => {
      console.log('---');
      console.log('Email:', user.email);
      console.log('Username:', user.username || 'NOT SET');
      console.log('Role:', user.role || 'NOT SET');
      console.log('InternalId:', user.internalId);
      console.log('---\n');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
