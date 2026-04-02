// CALM-WRITER Color Palette
// Intentional, calm colors that elevate the brand beyond standard web defaults

export const colors = {
    // Primary Background
    background: '#fefefd',
    cardBackground: '#fff',

    // Text
    text: {
        primary: '#2d3436',      // Softer black
        secondary: '#636e72',    // Muted gray
        tertiary: '#b2bec3',     // Light gray
    },

    // Calm Accent Colors - replacing standard blue/red
    accent: {
        sage: '#7d9d74',         // Sage Green - primary actions, success
        sageLight: '#a8c5a0',
        sageDark: '#5c7852',

        dustyRose: '#c7968c',    // Dusty Rose - like/love actions
        dustyRoseLight: '#e5ccc6',
        dustyRoseDark: '#a67769',

        deepNavy: '#3d5a80',     // Deep Navy - links, secondary actions
        deepNavyLight: '#5c7da8',
        deepNavyDark: '#2a4058',

        amber: '#d4a574',        // Warm Amber - bookmarks, highlights
        amberLight: '#e8c9a0',
        amberDark: '#b5895f',

        slate: '#778899',        // Slate - neutral actions
        slateLight: '#a9b6c5',
        slateDark: '#5a6a7a',
    },

    // Semantic Colors
    success: '#7d9d74',        // Sage green
    warning: '#d4a574',        // Amber
    error: '#c7968c',          // Dusty rose (softer than red)
    info: '#3d5a80',           // Deep navy

    // Interactive States
    hover: '#f8f8f8',
    active: '#f0f0f0',
    disabled: '#e0e0e0',

    // Borders
    border: {
        light: '#e8e8e8',
        default: '#d0d0d0',
        dark: '#b0b0b0',
    },

    // Shadows (for use in box-shadow)
    shadow: {
        light: 'rgba(0, 0, 0, 0.05)',
        default: 'rgba(0, 0, 0, 0.08)',
        hover: 'rgba(0, 0, 0, 0.12)',
    }
};

// Helper function to create consistent button styles
export const buttonStyles = {
    primary: {
        background: colors.accent.sage,
        color: '#fff',
        border: 'none',
        hoverBackground: colors.accent.sageDark,
    },
    secondary: {
        background: 'transparent',
        color: colors.accent.deepNavy,
        border: `1px solid ${colors.border.default}`,
        hoverBackground: colors.hover,
    },
    ghost: {
        background: 'transparent',
        color: colors.text.secondary,
        border: 'none',
        hoverBackground: colors.hover,
    },
    danger: {
        background: colors.error,
        color: '#fff',
        border: 'none',
        hoverBackground: colors.accent.dustyRoseDark,
    },
};

export default colors;
