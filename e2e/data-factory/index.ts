// Export the main data factory and composable methods
export {
    setupTestFactory,
    createPost,
    createPublishedPost,
    createPageHit,
    createPageHits,
    getFactories,
    clearCreatedPosts,
    clearAllPageHits,
    type Factories
} from './data-factory';

// Export types for convenience
export type {PostOptions, PostResult, PageHitOptions, PageHitResult} from './types';

// Export individual components for advanced use cases
export {Factory, FactoryPlugin} from './base-factory';
export {GhostFactory} from './factories/ghost-factory';
export {TinybirdFactory} from './factories/tinybird-factory';