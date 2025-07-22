// Re-export everything from the modular files
export {
    setupTestFactory,
    type Factories
} from './setup';

export {
    createPost,
    createPublishedPost,
    createPageHit,
    createPageHits,
    getFactories,
    clearCreatedPosts,
    clearAllPageHits
} from './exports';

// Re-export types for convenience
export type {PostOptions, PostResult, PageHitOptions, PageHitResult} from './types';