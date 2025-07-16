import {GhostFactory} from './factories/ghost-factory';
import {getGhostDatabaseManager} from './factories/ghost-database-manager';
import type {DataFactory} from './types';

// Factory builder that creates a data factory instance
export class DataFactoryBuilder {
    private ghostFactory?: GhostFactory;
    // Add more factory instances as needed
    // private tinybirdFactory?: TinybirdFactory;
    
    async build(): Promise<DataFactory> {
        const databaseManager = getGhostDatabaseManager();
        await databaseManager.ensureReady();
        
        // Create factory instances
        this.ghostFactory = new GhostFactory(databaseManager.getDb());
        await this.ghostFactory.setup();
        
        // Return data factory with all methods bound
        return {
            // Ghost methods
            createPost: this.ghostFactory.createPost.bind(this.ghostFactory),
            
            // Internal cleanup method (not exposed in public interface)
            destroy: async () => {
                if (this.ghostFactory) {
                    await this.ghostFactory.destroy();
                }
                // Add cleanup for other factories here
            }
        } as DataFactory & {destroy(): Promise<void>};
    }
}

// Helper function to create a data factory instance (internal use)
async function createDataFactory(): Promise<DataFactory & {destroy(): Promise<void>}> {
    const builder = new DataFactoryBuilder();
    return await builder.build() as DataFactory & {destroy(): Promise<void>};
}

// Main factory function for tests
export async function withDataFactory<T>(
    fn: (factory: DataFactory) => Promise<T>
): Promise<T> {
    const factory = await createDataFactory();
    try {
        return await fn(factory);
    } finally {
        await factory.destroy();
    }
}

// Re-export the interface for external use
export type {DataFactory} from './types';