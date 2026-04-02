/**
 * Consistent like button colors across the app
 * Used for all like buttons to maintain visual consistency
 */

export const LIKE_COLORS = {
  // Liked state - red/orange combo
  liked: {
    primary: '#de4020ff',    // Main red
    secondary: '#f63c17ff',  // Bright orange-red
    tertiary: '#d84022ff',   // Dark red
    text: '#de4020ff'        // Text color when liked
  },
  // Not liked state - grey
  notLiked: {
    primary: '#b2bec3',      // Grey
    secondary: '#b2bec3',    // Grey
    tertiary: '#b2bec3',     // Grey
    text: '#778899'          // Text color when not liked
  }
};

// Helper function to get like button colors
export function getLikeColors(isLiked) {
  return isLiked ? LIKE_COLORS.liked : LIKE_COLORS.notLiked;
}
