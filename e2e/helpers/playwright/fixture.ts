import baseDebug from '@tryghost/debug';
import {AnalyticsOverviewPage} from '../pages/admin';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {EnvironmentManager, GhostInstance} from '../environment';
import {SettingsService} from '../services/settings/SettingsService';
import {faker} from '@faker-js/faker';
import {loginToGetAuthenticatedSession} from '../../helpers/playwright/flows/login';
import {setupUser} from '../utils';

const debug = baseDebug('e2e:ghost-fixture');
export interface User {
    name: string;
    email: string;
    password: string;
}

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    labs?: Record<string, boolean>;
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
 * Optionally allows setting labs flags via test.use({labs: {featureName: true}})
 */
export const test = base.extend<GhostInstanceFixture>({
    // Define labs as an option that can be set per test or describe block
    labs: [undefined, {option: true}],
    ghostInstance: async ({ }, use, testInfo: TestInfo) => {
        debug('Setting up Ghost instance for test:', testInfo.title);
        const environmentManager = new EnvironmentManager();
        const ghostInstance = await environmentManager.perTestSetup();
        debug('Ghost instance ready for test:', {
            testTitle: testInfo.title,
            ...ghostInstance
        });
        await use(ghostInstance);
        debug('Tearing down Ghost instance for test:', testInfo.title);
        await environmentManager.perTestTeardown(ghostInstance);
        debug('Teardown completed for test:', testInfo.title);
    },
    baseURL: async ({ghostInstance}, use) => {
        await use(ghostInstance.baseUrl);
    },
    // Intermediate fixture that sets up the page and returns all setup data
    pageWithAuthenticatedUser: async ({browser, baseURL}, use) => {
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

        const pageWithAuthenticatedUser = await setupNewAuthenticatedPage(browser, baseURL, ghostAccountOwner);
        await use(pageWithAuthenticatedUser);
        await pageWithAuthenticatedUser.context.close();
    },
    // Extract the created user from pageWithAuthenticatedUser
    ghostAccountOwner: async ({pageWithAuthenticatedUser}, use) => {
        await use(pageWithAuthenticatedUser.ghostAccountOwner);
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
