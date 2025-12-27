const mongoose = require('mongoose');
require('dotenv').config();

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
    
    // Drop all collections
    const collections = await mongoose.connection.db.collections();
    
    for (let collection of collections) {
      await collection.drop();
      console.log(`Dropped collection: ${collection.collectionName}`);
    }
    
    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
