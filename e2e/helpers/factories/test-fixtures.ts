import {test as base} from '@playwright/test';

import {FactoryManager} from './data-management/factory-manager';
import {createFactories, FactoryList} from './data-management/factory-list';

const factoryManager = new FactoryManager(createFactories());

/**
 * Extended Playwright test context with data factory integration and automatic cleanup, with manager.
 * Usage: test.describe('test example', async (factories) => { ... }
 */
export const test = base.extend<{
    factories: FactoryList;
    factoryManager: FactoryManager;
    stats: Record<string, number>
}>({
    factories: async ({}, use) => {
        await use(factoryManager.factories);
        await factoryManager.cleanup();
    },

    factoryManager: async ({}, use) => {
        await use(factoryManager);
    }
});

test.beforeAll(async () => {
    await factoryManager.setup();
});

test.afterAll(async () => {
    await factoryManager.destroy();
});

// Re-export expect for convenience
export {expect} from '@playwright/test';
