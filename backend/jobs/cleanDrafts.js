const Draft = require('../models/Draft');

// Daily cleanup job - runs at 2 AM
async function cleanAbandonedDrafts() {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const result = await Draft.deleteMany({
            wordCount: { $lt: 50 }, // Less than 50 words
            updatedAt: { $lt: ninetyDaysAgo }, // Not touched in 90 days
        });

        console.log(`[Draft Cleanup] Deleted ${result.deletedCount} abandoned drafts`);
        return result.deletedCount;
    } catch (error) {
        console.error('[Draft Cleanup] Error:', error);
        return 0;
    }
}

// Schedule to run daily at 2 AM
function startDraftCleanupJob() {
    const now = new Date();
    const twoAM = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // Tomorrow
        2, 0, 0 // 2:00:00 AM
    );

    const msUntilTwoAM = twoAM - now;

    // Run first cleanup
    setTimeout(() => {
        cleanAbandonedDrafts();
        // Then run every 24 hours
        setInterval(cleanAbandonedDrafts, 24 * 60 * 60 * 1000);
    }, msUntilTwoAM);

    console.log('[Draft Cleanup] Job scheduled for 2 AM daily');
}

module.exports = { cleanAbandonedDrafts, startDraftCleanupJob };
