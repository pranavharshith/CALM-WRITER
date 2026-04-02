const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/calmstories';

async function verifyUser() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        // Find the user (assuming it's the one you're trying to log in with)
        // You can change this to a specific email if needed, or update ALL users
        const result = await User.updateMany(
            {},
            { $set: { isEmailVerified: true } }
        );

        console.log(`Updated ${result.modifiedCount} users to be verified.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

verifyUser();
