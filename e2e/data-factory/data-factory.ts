import knex from 'knex';
import {GhostFactory} from './factories/ghost-factory';
import type {DataFactory} from './types';

// Factory builder that creates a data factory instance
export class DataFactoryBuilder {
    private ghostFactory?: GhostFactory;
    // Add more factory instances as needed
    // private tinybirdFactory?: TinybirdFactory;
    
    async build(): Promise<DataFactory> {
        // Initialize Ghost database connection
        const ghostDb = knex({
            client: 'mysql2',
            connection: {
                host: process.env.database__connection__host || 'localhost',
                port: parseInt(process.env.database__connection__port || '3306'),
                user: process.env.database__connection__user || 'root',
                password: process.env.database__connection__password || 'root',
                database: process.env.database__connection__database || 'ghost',
                charset: 'utf8mb4'
            },
            pool: {min: 0, max: 5}
        });
        
        // Create factory instances
        this.ghostFactory = new GhostFactory(ghostDb);
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