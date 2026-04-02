const User = require('../models/User');
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const CollaborativeHub = require('../models/CollaborativeHub');
const Bookmark = require('../models/Bookmark');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const ReadSession = require('../models/ReadSession');
const Like = require('../models/Like');

// Create all necessary database indexes for performance
async function createDatabaseIndexes() {
    try {
        console.log('Creating database indexes...');

        // User indexes
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ username: 1 }, { unique: true, sparse: true });
        await User.collection.createIndex({ internalId: 1 }, { unique: true });
        await User.collection.createIndex({ role: 1 });
        await User.collection.createIndex({ timeoutUntil: 1 });

        // Story indexes
        await Story.collection.createIndex({ internalAuthorId: 1 });
        await Story.collection.createIndex({ createdAt: -1 });
        await Story.collection.createIndex({ likes: -1 });
        await Story.collection.createIndex({ hidden: 1 });
        await Story.collection.createIndex({ isFeatured: 1 });
        await Story.collection.createIndex({ hubId: 1 });
        await Story.collection.createIndex({ promptId: 1 });
        // Compound index for feed queries
        await Story.collection.createIndex({ hidden: 1, createdAt: -1 });
        // Text search index
        await Story.collection.createIndex({ title: 'text', text: 'text' });

        // StoryNode indexes
        await StoryNode.collection.createIndex({ rootStoryId: 1 });
        await StoryNode.collection.createIndex({ parentStoryId: 1 });
        await StoryNode.collection.createIndex({ authorInternalId: 1 });
        await StoryNode.collection.createIndex({ type: 1 });
        await StoryNode.collection.createIndex({ hidden: 1 });
        await StoryNode.collection.createIndex({ createdAt: -1 });

        // CollaborativeHub indexes
        await CollaborativeHub.collection.createIndex({ hubId: 1 }, { unique: true });
        await CollaborativeHub.collection.createIndex({ creatorInternalId: 1 });
        await CollaborativeHub.collection.createIndex({ theme: 1 });
        await CollaborativeHub.collection.createIndex({ visibility: 1 });
        await CollaborativeHub.collection.createIndex({ archived: 1 });
        await CollaborativeHub.collection.createIndex({ 'members.userInternalId': 1 });
        await CollaborativeHub.collection.createIndex({ lastActivityAt: -1 });

        // Bookmark indexes
        await Bookmark.collection.createIndex({ userInternalId: 1 });
        await Bookmark.collection.createIndex({ storyId: 1 });
        await Bookmark.collection.createIndex({ userInternalId: 1, storyId: 1 }, { unique: true });
        await Bookmark.collection.createIndex({ createdAt: -1 });

        // Follow indexes
        await Follow.collection.createIndex({ followerInternalId: 1 });
        await Follow.collection.createIndex({ followedUsername: 1 });
        await Follow.collection.createIndex({
            followerInternalId: 1,
            followedUsername: 1
        }, { unique: true });

        // Notification indexes
        await Notification.collection.createIndex({ userId: 1, createdAt: -1 });
        await Notification.collection.createIndex({ userId: 1, read: 1 });

        // Read session indexes
        await ReadSession.collection.createIndex({ storyId: 1 });
        await ReadSession.collection.createIndex({ userId: 1 });
        await ReadSession.collection.createIndex({ storyId: 1, userId: 1 });

        // Report indexes
        await Report.collection.createIndex({ status: 1, createdAt: -1 });
        await Report.collection.createIndex({ reportedBy: 1 });

        // Like indexes - CRITICAL for data integrity
        await Like.collection.createIndex({ userInternalId: 1, storyId: 1 }, { unique: true });
        await Like.collection.createIndex({ storyId: 1 });
        await Like.collection.createIndex({ userInternalId: 1 });
        await Like.collection.createIndex({ createdAt: -1 });

        console.log('✓ Database indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
        // Don't throw - indexes might already exist
    }
}

module.exports = { createDatabaseIndexes };
