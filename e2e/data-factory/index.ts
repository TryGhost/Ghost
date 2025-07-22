// Main factory setup and types
export {setupTestFactory, type Factories} from './setup';

// Convenience functions for direct usage
export {
    createPost,
    createPublishedPost,
    createDraftPost,
    createScheduledPost,
    createPageHit,
    createPageHits,
    getFactories,
    clearCreatedPosts,
    clearAllPageHits
} from './convenience';

// Export types for convenience
export type {PostOptions, PostResult, PageHitOptions, PageHitResult} from './types';

// Export individual components for advanced use cases
export {Factory, FactoryPlugin} from './base-factory';
export {GhostFactory} from './ghost/ghost-factory';
export {TinybirdFactory} from './tinybird/tinybird-factory';