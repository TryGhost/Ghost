import {Page, test as base, TestInfo, Browser} from '@playwright/test';
import {EnvironmentManager, GhostInstance} from '../environment/EnvironmentManager';
import {LoginPage, AnalyticsOverviewPage} from '../pages/admin';
import {SettingsService} from '../services/settings/SettingsService';
import {appConfig, setupUser} from '../utils';
import baseDebug from '@tryghost/debug';

const debug = baseDebug('e2e:ghost-fixture');

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    labs?: Record<string, boolean>;
}

async function loginToGetAuthenticatedSession(page: Page) {
    const loginPage = new LoginPage(page);
    await loginPage.waitForLoginPageAfterUserCreated();
    await loginPage.signIn(appConfig.auth.email, appConfig.auth.password);
    const analyticsPage = new AnalyticsOverviewPage(page);
    await analyticsPage.header.waitFor({state: 'visible'});
    debug('Authentication completed for Ghost instance');
}

async function setupLabSettings(page: Page, labsFlags: Record<string, boolean>) {
    const analyticsPage = new AnalyticsOverviewPage(page);
    await analyticsPage.goto();

    debug('Updating labs settings:', labsFlags);
    const settingsService = new SettingsService(page.request);
    await settingsService.updateSettings(labsFlags);

    // Reload the page to ensure the new labs settings take effect in the UI
    await page.reload();
    await analyticsPage.header.waitFor({state: 'visible'});
    debug('Labs settings applied and page reloaded');
}

async function setupNewAuthenticatedPage(browser: Browser, baseURL: string) {
    debug('Setting up authenticated page for Ghost instance:', baseURL);

    // Create user in this Ghost instance
    await setupUser(baseURL, {email: appConfig.auth.email, password: appConfig.auth.password});

    // Create browser context with correct baseURL and extra HTTP headers
    const context = await browser.newContext({
        baseURL: baseURL,
        extraHTTPHeaders: {
            Origin: baseURL
        }
    });
    const page = await context.newPage();

    await loginToGetAuthenticatedSession(page);

    return {page, context};
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
        const ghostInstance = await environmentManager.setupGhostInstance();
        debug('Ghost instance ready for test:', {
            testTitle: testInfo.title,
            ...ghostInstance
        });
        await use(ghostInstance);
        debug('Tearing down Ghost instance for test:', testInfo.title);
        await environmentManager.teardownGhostInstance(ghostInstance);
        debug('Teardown completed for test:', testInfo.title);
    },
    baseURL: async ({ghostInstance}, use) => {
        await use(ghostInstance.baseUrl);
    },
    page: async ({browser, baseURL, labs}, use) => {
        if (!baseURL) {
            throw new Error('baseURL is not defined');
        }

        const {page, context} = await setupNewAuthenticatedPage(browser, baseURL);

        const labsFlagsSpecified = labs && Object.keys(labs).length > 0;
        if (labsFlagsSpecified) {
            await setupLabSettings(page, labs);
        }

        await use(page);
        await context.close();
    }
});

export {expect} from '@playwright/test';
