/**
 * Helper functions for story queries to ensure soft-deleted stories are excluded
 */

/**
 * Get base query filter to exclude soft-deleted stories
 * @returns {object} MongoDB query filter
 */
function getActiveStoriesFilter() {
  return {
    deletedAt: null,
    hidden: false,
    $or: [
      { hubId: null },
      { hubApprovalStatus: 'approved' },
    ],
  };
}

/**
 * Get base query filter for moderators (includes hidden stories)
 * @returns {object} MongoDB query filter
 */
function getModeratorStoriesFilter() {
  return {
    deletedAt: null // Only exclude soft-deleted stories
  };
}

/**
 * Get base query filter for admins (includes everything)
 * @returns {object} MongoDB query filter
 */
function getAllStoriesFilter() {
  return {}; // No filter - admins see everything
}

module.exports = {
  getActiveStoriesFilter,
  getModeratorStoriesFilter,
  getAllStoriesFilter
};
