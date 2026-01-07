// Shared content type definitions
export const CONTENT_TYPES = {
    POSTS: 'posts',
    PAGES: 'pages',
    POSTS_AND_PAGES: 'posts_and_pages',
    SOURCES: 'sources'
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

// Helper functions for content titles and descriptions
export const getContentTitle = (selectedContentType: ContentType) => {
    switch (selectedContentType) {
    case CONTENT_TYPES.POSTS:
        return 'Top posts';
    case CONTENT_TYPES.PAGES:
        return 'Top pages';
    case CONTENT_TYPES.SOURCES:
        return 'Top sources';
    default:
        return 'Top content';
    }
};

export const getContentDescription = (selectedContentType: ContentType, rangeValue: number, getPeriodText: (range: number) => string) => {
    switch (selectedContentType) {
    case CONTENT_TYPES.POSTS:
        return `Your highest viewed posts ${getPeriodText(rangeValue)}`;
    case CONTENT_TYPES.PAGES:
        return `Your highest viewed pages ${getPeriodText(rangeValue)}`;
    case CONTENT_TYPES.POSTS_AND_PAGES:
        return `Your highest viewed posts or pages ${getPeriodText(rangeValue)}`;
    case CONTENT_TYPES.SOURCES:
        return `How readers found your site ${getPeriodText(rangeValue)}`;
    default:
        return `Your highest viewed posts or pages ${getPeriodText(rangeValue)}`;
    }
};

export const getGrowthContentDescription = (selectedContentType: ContentType, rangeValue: number, getPeriodText: (range: number) => string) => {
    switch (selectedContentType) {
    case CONTENT_TYPES.POSTS:
        return `Which posts drove the most growth ${getPeriodText(rangeValue)}`;
    case CONTENT_TYPES.PAGES:
        return `Which pages drove the most growth ${getPeriodText(rangeValue)}`;
    case CONTENT_TYPES.POSTS_AND_PAGES:
        return `Which posts or pages drove the most growth ${getPeriodText(rangeValue)}`;
    case CONTENT_TYPES.SOURCES:
        return `How readers found your site ${getPeriodText(rangeValue)}`;
    default:
        return `Which posts drove the most growth ${getPeriodText(rangeValue)}`;
    }
}; 