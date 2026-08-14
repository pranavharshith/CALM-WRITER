export const THEME_LABELS = {
    general: 'General',
    scifi: 'Sci-Fi',
    fantasy: 'Fantasy',
    poetry: 'Poetry',
    mystery: 'Mystery',
    horror: 'Horror',
    romance: 'Romance',
    nonfiction: 'Non-Fiction',
    other: 'Other',
};

export function themeLabel(theme) {
    return THEME_LABELS[theme] || theme || 'General';
}
