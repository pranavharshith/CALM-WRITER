const mongoose = require('mongoose');

const CollaborativeHubSchema = new mongoose.Schema({
    // Basic Info
    hubId: { type: String, required: true, unique: true }, // e.g., "sci_fi_writers_2024"
    name: { type: String, required: true }, // "Sci-Fi Writers Collective"
    description: { type: String, maxLength: 500 },
    creatorInternalId: { type: String, required: true }, // Hub founder

    // Theme & Classification
    theme: {
        type: String,
        enum: ['general', 'scifi', 'fantasy', 'poetry', 'mystery', 'horror', 'romance', 'nonfiction', 'other'],
        default: 'general'
    },
    tags: [{ type: String }], // e.g., ["space", "dystopia", "ai"]

    // Visibility & Access
    visibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    // public: discoverable, anyone can request to join
    // private: invite-only, not searchable
    // unlisted: join via link only

    joinPolicy: {
        type: String,
        enum: ['open', 'approval', 'invite_only'],
        default: 'approval'
    },
    // open: auto-join for eligible users
    // approval: creator/mods must approve requests
    // invite_only: can only join via direct invite

    // Membership
    members: [{
        userInternalId: { type: String, required: true },
        role: {
            type: String,
            enum: ['creator', 'moderator', 'member'],
            default: 'member'
        },
        joinedAt: { type: Date, default: Date.now },
        invitedBy: { type: String }, // who invited them
        contributionCount: { type: Number, default: 0 }, // stories/nodes contributed
        lastContributionAt: { type: Date }, // last story/chat contribution for cooldown
        isActive: { type: Boolean, default: true } // can be suspended by hub mods
    }],

    maxMembers: { type: Number, default: 50, max: 200 }, // configurable limit

    // Content
    rootStories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }], // Hub's collaborative stories

    // Activity & Stats
    totalStories: { type: Number, default: 0 },
    totalNodes: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },

    // Settings
    allowThreads: { type: Boolean, default: true }, // enable continuations/responses
    requireApproval: { type: Boolean, default: false }, // stories need approval before publishing
    wordLimitPerContribution: { type: Number, default: 800 },
    cooldownBetweenContributions: { type: Number, default: 3600000 }, // 1 hour in ms

    // Group Chat
    chatEnabled: { type: Boolean, default: true },
    lastChatMessageAt: { type: Date },

    // Moderation
    locked: { type: Boolean, default: false }, // admin can lock hub
    archived: { type: Boolean, default: false }, // creator can archive
    archivedAt: { type: Date },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes
CollaborativeHubSchema.index({ hubId: 1 });
CollaborativeHubSchema.index({ theme: 1, visibility: 1 });
CollaborativeHubSchema.index({ 'members.userInternalId': 1 });
CollaborativeHubSchema.index({ creatorInternalId: 1 });
CollaborativeHubSchema.index({ archived: 1, locked: 1 });

module.exports = mongoose.model('CollaborativeHub', CollaborativeHubSchema);
