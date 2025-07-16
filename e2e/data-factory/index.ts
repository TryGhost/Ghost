// Export the main data factory
export {withDataFactory} from './data-factory';

// Export types for convenience
export type {DataFactory, PostOptions, PostResult} from './types';

// Export individual components for advanced use cases
export {Factory, FactoryPlugin} from './base-factory';
export {GhostFactory} from './factories/ghost-factory';