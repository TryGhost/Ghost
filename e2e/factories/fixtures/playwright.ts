import {test as base} from '@playwright/test';

import {FactoryManager} from '../data-management/factory-manager';
import {factories, FactoryList} from '../data-management/factory-list';

const factoryManager = new FactoryManager(factories);

/**
 * Extended Playwright test context with data factory integration.
 * Provides automatic cleanup.
 *
 * Usage:
 * - test({factories}) - Full factory access
 */
export const test = base.extend<{
    factories: FactoryList;
    factoryManager: FactoryManager;
    stats: Record<string, number>
}>({
    factories: async ({}, use) => {
        await factoryManager.setup();
        await use(factoryManager.factories);
    },

    factoryManager: async ({}, use) => {
        await use(factoryManager);
    }
});

test.beforeAll(async () => {
    await factoryManager.setup();
});

test.afterAll(async () => {
    await factoryManager.cleanup();
});

// Re-export expect for convenience
export {expect} from '@playwright/test';
