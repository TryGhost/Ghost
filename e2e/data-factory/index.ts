// Export the main data factory and composable methods
export {
    setupTestFactory,
    createPost,
    createPublishedPost,
    createPageHit,
    createPageHits,
    getFactories,
    type Factories
} from './data-factory';

// Export types for convenience
export type {PostOptions, PostResult} from './types';
export type {PageHitOptions, PageHitResult} from './factories/tinybird-factory';

// Export individual components for advanced use cases
export {Factory, FactoryPlugin} from './base-factory';
export {GhostFactory} from './factories/ghost-factory';
export {TinybirdFactory} from './factories/tinybird-factory';