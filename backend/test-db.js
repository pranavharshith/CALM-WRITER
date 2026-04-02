const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/calmstories';

async function check() {
    await mongoose.connect(MONGO_URL);
    const users = await User.find({}, 'username email isEmailVerified timeoutUntil failedLoginAttempts accountLockedUntil');
    console.log('Users in DB:');
    console.log(users);
    process.exit(0);
}

check().catch(console.error);
