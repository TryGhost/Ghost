import {test as base, TestInfo} from '@playwright/test';
import {EnvironmentManager, GhostInstance} from '../environment/EnvironmentManager';
import {LoginPage, AnalyticsOverviewPage} from '../pages/admin';
import {appConfig, setupUser} from '../utils';
import baseDebug from 'debug';

const debug = baseDebug('e2e:ghost-fixture');

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    environmentManager: EnvironmentManager;
}

/**
 * Playwright fixture that provides a unique Ghost instance for each test
 * Each instance gets its own database, runs on a unique port, and includes authentication
 */
export const test = base.extend<GhostInstanceFixture>({
    ghostInstance: async ({ }, use, testInfo: TestInfo) => {
        debug('Setting up Ghost instance for test:', testInfo.title);

        const environmentManager = new EnvironmentManager();

        // Check if global environment is ready
        if (!environmentManager.isEnvironmentReady()) {
            const status = environmentManager.getEnvironmentStatus();
            throw new Error(
                `Global environment not ready. Status: ${JSON.stringify(status)}. ` +
                'Make sure global setup has completed successfully.'
            );
        }

        // Generate unique test ID from test info
        const testId = testInfo.testId;
        const workerId = testInfo.workerIndex;

        // Setup Ghost instance for this test
        const ghostInstance = await environmentManager.setupGhostInstance(workerId, testId);

        debug('Ghost instance ready for test:', {
            testTitle: testInfo.title,
            workerId,
            baseUrl: ghostInstance.baseUrl,
            database: ghostInstance.database
        });

        // Provide the instance to the test
        await use(ghostInstance);

        // Cleanup after test completes
        debug('Tearing down Ghost instance for test:', testInfo.title);
        await environmentManager.teardownGhostInstance(ghostInstance);
    },

    // Override page fixture to provide authenticated page
    page: async ({browser, ghostInstance}, use) => {
        debug('Setting up authenticated page for Ghost instance:', ghostInstance.baseUrl);

        // Create user in this Ghost instance
        await setupUser(ghostInstance.baseUrl, {
            email: appConfig.auth.email,
            password: appConfig.auth.password
        });

        // Create browser context with correct baseURL and extra HTTP headers
        const context = await browser.newContext({
            baseURL: ghostInstance.baseUrl,
            extraHTTPHeaders: {
                Origin: ghostInstance.baseUrl
            }
        });
        const page = await context.newPage();

        // Login to get authenticated session
        const loginPage = new LoginPage(page);
        await loginPage.waitForLoginPageAfterUserCreated();
        await loginPage.signIn(appConfig.auth.email, appConfig.auth.password);

        // Wait for successful login and navigate to admin to establish proper origin
        const analyticsPage = new AnalyticsOverviewPage(page);
        await analyticsPage.header.waitFor({state: 'visible'});
        debug('Authentication completed for Ghost instance');

        await use(page);
        await context.close();
    },

    environmentManager: async ({ }, use) => {
        const environmentManager = new EnvironmentManager();
        await use(environmentManager);
    }
});

export {expect} from '@playwright/test';
