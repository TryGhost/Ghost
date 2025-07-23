import {test as base} from '@playwright/test';
import {DataFactory} from './data-factory';
import {GhostPlugin} from './plugins/ghost/ghost-plugin';
import {TinybirdPlugin} from './plugins/tinybird/tinybird-plugin';

/**
 * Extended Playwright test context with data factory integration.
 * Provides automatic cleanup through a single factory instance.
 * 
 * Usage:
 * - test({factory}) - Full factory access
 * - test({ghost, tinybird}) - Direct plugin access
 * - test({ghost}) - Just Ghost plugin
 * - test({tinybird}) - Just Tinybird plugin
 */
export const test = base.extend<{
    factory: DataFactory;
    ghost: GhostPlugin;
    tinybird: TinybirdPlugin;
}>({
    factory: async ({}, use) => {
        const factory = new DataFactory();
        await factory.initialize();
        await use(factory);
        await factory.cleanup();
    },
    
    ghost: async ({factory}, use) => {
        await use(factory.ghost);
    },
    
    tinybird: async ({factory}, use) => {
        await use(factory.tinybird);
    }
});

// Re-export expect for convenience
export {expect} from '@playwright/test';