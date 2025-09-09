import {test as base, TestInfo} from '@playwright/test';
import {EnvironmentManager, GhostInstance} from '../environment/EnvironmentManager';
import {LoginPage, AnalyticsOverviewPage} from '../pages/admin';
import {appConfig, setupUser} from '../utils';
import debug from 'debug';

const log = debug('e2e:ghost-fixture');

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
        log('Setting up Ghost instance for test:', testInfo.title);

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
        const testId = generateTestId(testInfo);
        const workerId = testInfo.workerIndex;

        // Setup Ghost instance for this test
        const ghostInstance = await environmentManager.setupGhostInstance(workerId, testId);

        log('Ghost instance ready for test:', {
            testTitle: testInfo.title,
            workerId,
            baseUrl: ghostInstance.baseUrl,
            database: ghostInstance.database
        });

        // Provide the instance to the test
        await use(ghostInstance);

        // Cleanup after test completes
        log('Tearing down Ghost instance for test:', testInfo.title);
        await environmentManager.teardownGhostInstance(ghostInstance);
    },

    // Override page fixture to provide authenticated page
    page: async ({browser, ghostInstance}, use) => {
        log('Setting up authenticated page for Ghost instance:', ghostInstance.baseUrl);

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
        log('Authentication completed for Ghost instance');

        await use(page);
        await context.close();
    },

    environmentManager: async ({ }, use) => {
        const environmentManager = new EnvironmentManager();
        await use(environmentManager);
    }
});

/**
 * Generate a unique, filesystem-safe test ID from test info
 */
function generateTestId(testInfo: TestInfo): string {
    // Combine test file path and title to create unique ID
    const fileName = testInfo.file.split('/').pop()?.replace(/\.test\.(ts|js)$/, '') || 'unknown';
    const testTitle = testInfo.title;

    // Create a safe identifier
    const combined = `${fileName}_${testTitle}`;
    const safeId = combined
        .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_') // Collapse multiple underscores
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .slice(0, 50); // Limit length

    // Add timestamp to ensure uniqueness across test runs
    const timestamp = Date.now().toString(36);

    return `${safeId}_${timestamp}`;
}

// Re-export expect from Playwright for convenience
export {expect} from '@playwright/test';
