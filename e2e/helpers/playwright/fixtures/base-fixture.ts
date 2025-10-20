import {test as base, TestInfo} from '@playwright/test';
import {EnvironmentManager, GhostInstance} from '../../environment';
import baseDebug from '@tryghost/debug';
import {appConfig, setupUser} from '../../utils';

const debug = baseDebug('e2e:ghost-fixture');

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    createUser: Promise<void>
}

/**
 * Base Playwright extension, with fixtures that provides a unique Ghost instance for each test
 * Each instance gets its own database and runs on a unique port
 *
 * This fixture provides unauthenticated access - it only creates ghost instance, with ghost account and user
 * For authenticated tests, use `authenticated-base-fixture.ts` instead
 */
export const test = base.extend<GhostInstanceFixture>({
    ghostInstance: async ({ }, use, testInfo: TestInfo) => {
        debug('Setting up Ghost instance for test:', testInfo.title);
        const environmentManager = new EnvironmentManager();
        const ghostInstance = await environmentManager.setupGhostInstance();
        debug('Ghost instance ready for test:', {testTitle: testInfo.title, ...ghostInstance});

        await use(ghostInstance);

        debug('Tearing down Ghost instance for test:', testInfo.title);
        await environmentManager.teardownGhostInstance(ghostInstance);
        debug('Teardown completed for test:', testInfo.title);
    },
    createUser: async ({ghostInstance}, use) => {
        const user = setupUser(ghostInstance.baseUrl, {email: appConfig.auth.email, password: appConfig.auth.password});
        await use(user);
    },
    baseURL: async ({ghostInstance, createUser}, use) => {
        await use(ghostInstance.baseUrl);
        await createUser;
    }

});

export {expect} from '@playwright/test';
