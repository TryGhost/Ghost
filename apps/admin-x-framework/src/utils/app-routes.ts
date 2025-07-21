// Posts analytics routes
// These work for both internal navigation (within Posts app) and cross-app navigation
export const POSTS_ANALYTICS_ROUTES = {
    OVERVIEW: (postId: string) => `/analytics/${postId}`,
    WEB: (postId: string) => `/analytics/${postId}/web`,
    NEWSLETTER: (postId: string) => `/analytics/${postId}/newsletter`,
    GROWTH: (postId: string) => `/analytics/${postId}/growth`
} as const;

// Stats routes
export const STATS_ROUTES = {
    OVERVIEW: '/analytics',
    WEB: '/analytics/web/',
    LOCATIONS: '/analytics/locations/',
    GROWTH: '/analytics/growth/',
    NEWSLETTERS: '/analytics/newsletters/'
} as const;

// Helper to build full cross-app navigation paths
// When navigating from Stats to Posts, prepend /posts
export const buildCrossAppPostsRoute = (route: string) => {
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    return `/posts${normalizedRoute}`;
};

// Test routes - These are the hash-based routes used in Ember admin for tests
export const TEST_ROUTES = {
    // Stats test routes
    STATS: {
        OVERVIEW: '/ghost/#/analytics',
        WEB: '/ghost/#/analytics/web',
        LOCATIONS: '/ghost/#/analytics/locations',
        GROWTH: '/ghost/#/analytics/growth',
        NEWSLETTERS: '/ghost/#/analytics/newsletters'
    },
    // Posts analytics test routes  
    POSTS_ANALYTICS: {
        OVERVIEW: (postId: string) => `/ghost/#/posts/analytics/${postId}`,
        WEB: (postId: string) => `/ghost/#/posts/analytics/${postId}/web`,
        NEWSLETTER: (postId: string) => `/ghost/#/posts/analytics/${postId}/newsletter`,
        GROWTH: (postId: string) => `/ghost/#/posts/analytics/${postId}/growth`
    }
} as const;