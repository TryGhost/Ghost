import {GhostFactory} from './factories/ghost-factory';
import {TinybirdFactory} from './factories/tinybird-factory';
import {getGhostDatabaseManager} from './factories/ghost-database-manager';
import type {DataFactory} from './types';

// Factory builder that creates a data factory instance
export class DataFactoryBuilder {
    private ghostFactory?: GhostFactory;
    private tinybirdFactory?: TinybirdFactory;
    
    async build(options?: {waitForGhostBoot?: boolean}): Promise<DataFactory> {
        const databaseManager = getGhostDatabaseManager();
        await databaseManager.ensureReady();
        
        // Optionally wait for Ghost to be fully booted
        if (options?.waitForGhostBoot) {
            const booted = await databaseManager.waitForGhostBoot();
            if (!booted) {
                throw new Error('Ghost failed to boot within timeout period');
            }
        }
        
        // Create Ghost factory first
        this.ghostFactory = new GhostFactory(databaseManager.getDb());
        await this.ghostFactory.setup();
        
        // Try to get site UUID from Ghost settings
        const siteUuid = await databaseManager.getSiteUuid();
        
        // Only create TinybirdFactory if we have a valid site UUID
        if (siteUuid) {
            this.tinybirdFactory = new TinybirdFactory(siteUuid);
            await this.tinybirdFactory.setup();
        }
        
        // Return data factory with all methods bound
        return {
            // Ghost methods
            createPost: this.ghostFactory.createPost.bind(this.ghostFactory),
            
            // Tinybird methods - with error handling if not initialized
            createPageHit: async (pageHitOptions) => {
                if (!this.tinybirdFactory) {
                    throw new Error('TinybirdFactory not initialized. Ghost site_uuid not found in settings. Is Ghost properly booted?');
                }
                return this.tinybirdFactory.createPageHit(pageHitOptions);
            },
            createPageHits: async (count, pageHitOptions) => {
                if (!this.tinybirdFactory) {
                    throw new Error('TinybirdFactory not initialized. Ghost site_uuid not found in settings. Is Ghost properly booted?');
                }
                return this.tinybirdFactory.createPageHits(count, pageHitOptions);
            },
            
            // Internal cleanup method (not exposed in public interface)
            destroy: async () => {
                if (this.ghostFactory) {
                    await this.ghostFactory.destroy();
                }
                if (this.tinybirdFactory) {
                    await this.tinybirdFactory.destroy();
                }
            }
        } as DataFactory & {destroy(): Promise<void>};
    }
}

// Helper function to create a data factory instance (internal use)
async function createDataFactory(options?: {waitForGhostBoot?: boolean}): Promise<DataFactory & {destroy(): Promise<void>}> {
    const builder = new DataFactoryBuilder();
    return await builder.build(options) as DataFactory & {destroy(): Promise<void>};
}

// Main factory function for tests
export async function withDataFactory<T>(
    fn: (factory: DataFactory) => Promise<T>,
    options?: {waitForGhostBoot?: boolean}
): Promise<T> {
    const factory = await createDataFactory(options);
    try {
        return await fn(factory);
    } finally {
        await factory.destroy();
    }
}

// Re-export the interface for external use
export type {DataFactory} from './types';