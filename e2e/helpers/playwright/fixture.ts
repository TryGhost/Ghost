import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {AnalyticsOverviewPage} from '@/admin-pages';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {EnvironmentManager, GhostInstance, LogManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {faker} from '@faker-js/faker';
import {loginToGetAuthenticatedSession} from '@/helpers/playwright/flows/login';
import {setupUser} from '@/helpers/utils';

const debug = baseDebug('e2e:ghost-fixture');

function shouldCaptureLogs(): boolean {
    return process.env.E2E_CAPTURE_LOGS !== 'false';
}

export interface User {
    name: string;
    email: string;
    password: string;
}

export interface GhostConfig {
    memberWelcomeEmailSendInstantly: string;
    memberWelcomeEmailTestInbox: string;
}

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    labs?: Record<string, boolean>;
    config?: GhostConfig;
    ghostAccountOwner: User;
    pageWithAuthenticatedUser: {
        page: Page;
        context: BrowserContext;
        ghostAccountOwner: User
    };
}

async function setupLabSettings(page: Page, labsFlags: Record<string, boolean>) {
    const analyticsPage = new AnalyticsOverviewPage(page);
    await analyticsPage.goto();

    debug('Updating labs settings:', labsFlags);
    const settingsService = new SettingsService(page.request);
    await settingsService.updateLabsSettings(labsFlags);

    // Reload the page to ensure the new labs settings take effect in the UI
    await page.reload();
    await analyticsPage.header.waitFor({state: 'visible'});
    debug('Labs settings applied and page reloaded');
}

async function setupNewAuthenticatedPage(browser: Browser, baseURL: string, ghostAccountOwner: User) {
    debug('Setting up authenticated page for Ghost instance:', baseURL);

    // Create browser context with correct baseURL and extra HTTP headers
    const context = await browser.newContext({
        baseURL: baseURL,
        extraHTTPHeaders: {
            Origin: baseURL
        }
    });
    const page = await context.newPage();

    await loginToGetAuthenticatedSession(page, ghostAccountOwner.email, ghostAccountOwner.password);
    debug('Authentication completed for Ghost instance');

    return {page, context, ghostAccountOwner};
}

/**
 * Playwright fixture that provides a unique Ghost instance for each test
 * Each instance gets its own database, runs on a unique port, and includes authentication
 *
 * Optionally allows setting labs flags via test.use({labs: {featureName: true}})
 * and Ghost config via config settings like:
 *
 *  test.use({config: {
 *      memberWelcomeEmailSendInstantly: 'true',
 *      memberWelcomeEmailTestInbox: `test+welcome-email@ghost.org`
 *  }})
 */
export const test = base.extend<GhostInstanceFixture>({
    // Define labs as an option that can be set per test or describe block
    config: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    ghostInstance: async ({config}, use, testInfo: TestInfo) => {
        debug('Setting up Ghost instance for test:', testInfo.title);
        const environmentManager = new EnvironmentManager();
        const ghostInstance = await environmentManager.perTestSetup({config});
        const instanceStartTime = new Date();
        debug('Ghost instance ready for test:', {
            testTitle: testInfo.title,
            ...ghostInstance
        });
        await use(ghostInstance);

        // On test failure: fetch and output logs before cleanup
        if (testInfo.status === 'failed' && shouldCaptureLogs()) {
            try {
                debug('Test failed, fetching Ghost container logs...');
                const docker = new Docker();
                const container = docker.getContainer(ghostInstance.containerId);
                const logManager = new LogManager();

                const logs = await logManager.fetchLogs(container);
                const formattedLogs = logManager.formatLogs(logs, {
                    testName: testInfo.title,
                    containerId: ghostInstance.containerId,
                    startTime: instanceStartTime
                });

                logManager.outputToConsole(formattedLogs);
                const logFilePath = await logManager.writeLogsToFile(formattedLogs, testInfo.title);
                // eslint-disable-next-line no-console
                console.log(`\n📝 Ghost logs saved to: ${logFilePath}\n`);
            } catch (error) {
                debug('Failed to capture logs:', error);
                // Don't throw - log capture is best effort
            }
        }

        // Only cleanup if test passed - keep container running on failure for debugging
        if (testInfo.status === 'passed') {
            debug('Tearing down Ghost instance for test:', testInfo.title);
            await environmentManager.perTestTeardown(ghostInstance);
            debug('Teardown completed for test:', testInfo.title);
        } else {
            /* eslint-disable no-console */
            console.log(`\n⚠️  Test failed - Ghost container left running for debugging:`);
            console.log(`   Container ID: ${ghostInstance.containerId}`);
            console.log(`   Base URL: ${ghostInstance.baseUrl}`);
            console.log(`   View logs: docker logs ${ghostInstance.containerId}`);
            console.log(`   Access shell: docker exec -it ${ghostInstance.containerId} sh`);
            console.log(`   Remove when done: docker rm -f ${ghostInstance.containerId}\n`);
            /* eslint-enable no-console */
        }
    },
    baseURL: async ({ghostInstance}, use) => {
        await use(ghostInstance.baseUrl);
    },
    // Create user credentials only (no authentication)
    ghostAccountOwner: async ({baseURL}, use) => {
        if (!baseURL) {
            throw new Error('baseURL is not defined');
        }

        // Create user in this Ghost instance
        const ghostAccountOwner: User = {
            name: 'Test User',
            email: `test${faker.string.uuid()}@ghost.org`,
            password: 'test@123@test'
        };
        await setupUser(baseURL, ghostAccountOwner);
        await use(ghostAccountOwner);
    },
    // Intermediate fixture that sets up the page and returns all setup data
    pageWithAuthenticatedUser: async ({browser, baseURL, ghostAccountOwner}, use) => {
        if (!baseURL) {
            throw new Error('baseURL is not defined');
        }

        const pageWithAuthenticatedUser = await setupNewAuthenticatedPage(browser, baseURL, ghostAccountOwner);
        await use(pageWithAuthenticatedUser);
        await pageWithAuthenticatedUser.context.close();
    },
    // Extract the page from pageWithAuthenticatedUser and apply labs settings
    page: async ({pageWithAuthenticatedUser, labs}, use) => {
        const labsFlagsSpecified = labs && Object.keys(labs).length > 0;
        if (labsFlagsSpecified) {
            await setupLabSettings(pageWithAuthenticatedUser.page, labs);
        }

        await use(pageWithAuthenticatedUser.page);
    }
});

export {expect} from '@playwright/test';
