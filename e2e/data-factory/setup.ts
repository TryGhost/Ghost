import {GhostFactory} from './ghost/ghost-factory';
import {TinybirdFactory} from './tinybird/tinybird-factory';
import {getGhostDatabaseManager} from './ghost/database-manager';

// Factory instances storage
export interface Factories {
    ghost: GhostFactory;
    tinybird?: TinybirdFactory;
}

// Direct factory initialization
export async function createDataFactory(options?: {waitForGhostBoot?: boolean}): Promise<Factories> {
    const databaseManager = getGhostDatabaseManager();
    await databaseManager.ensureReady();
    
    // Optionally wait for Ghost to be fully booted
    if (options?.waitForGhostBoot) {
        const booted = await databaseManager.waitForGhostBoot();
        if (!booted) {
            throw new Error('Ghost failed to boot within timeout period');
        }
    }
    
    // Create Ghost factory
    const ghostFactory = new GhostFactory(databaseManager.getDb());
    await ghostFactory.setup();
    
    // Try to get site UUID from Ghost settings
    const siteUuid = await databaseManager.getSiteUuid();
    
    // Only create TinybirdFactory if we have a valid site UUID
    let tinybirdFactory: TinybirdFactory | undefined;
    if (siteUuid) {
        tinybirdFactory = new TinybirdFactory(siteUuid);
        await tinybirdFactory.setup();
    }
    
    // Return factories directly
    return {
        ghost: ghostFactory,
        tinybird: tinybirdFactory
    };
}

// Global factory instances
let globalFactories: Factories;

/**
 * Setup the test factory - call this once per test suite or let the direct methods handle it
 */
export async function setupTestFactory(options?: {waitForGhostBoot?: boolean}): Promise<Factories> {
    if (!globalFactories) {
        globalFactories = await createDataFactory(options);
    }
    return globalFactories;
}