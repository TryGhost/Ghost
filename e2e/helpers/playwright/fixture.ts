import baseDebug from '@tryghost/debug';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {GhostInstance, getEnvironmentManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {faker} from '@faker-js/faker';
import {loginToGetAuthenticatedSession} from '@/helpers/playwright/flows/sign-in';
import {setupUser} from '@/helpers/utils';

const debug = baseDebug('e2e:ghost-fixture');
export interface User {
    name: string;
    email: string;
    password: string;
}

export interface GhostConfig {
    hostSettings__billing__enabled?: string;
    hostSettings__billing__url?: string;
    hostSettings__forceUpgrade?: string;
}

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    labs?: Record<string, boolean>;
    config?: GhostConfig;
    stripeConnected?: boolean;
    ghostAccountOwner: User;
    pageWithAuthenticatedUser: {
        page: Page;
        context: BrowserContext;
        ghostAccountOwner: User
    };
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
 * Uses the unified E2E environment manager:
 * - Dev mode (default): Worker-scoped containers with per-test database cloning
 * - Build mode: Same isolation model, but Ghost runs from a prebuilt image
 *
 * Optionally allows setting labs flags via test.use({labs: {featureName: true}})
 * and Stripe connection via test.use({stripeConnected: true})
 */
export const test = base.extend<GhostInstanceFixture>({
    // Define options that can be set per test or describe block
    config: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    stripeConnected: [false, {option: true}],

    // Each test gets its own Ghost instance with isolated database
    ghostInstance: async ({config}, use, testInfo: TestInfo) => {
        debug('Setting up Ghost instance for test:', testInfo.title);
        const environmentManager = await getEnvironmentManager();
        const ghostInstance = await environmentManager.perTestSetup({config});

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

    // Extract the page from pageWithAuthenticatedUser and apply labs/stripe settings
    page: async ({pageWithAuthenticatedUser, labs, stripeConnected}, use) => {
        const page = pageWithAuthenticatedUser.page;
        const settingsService = new SettingsService(page.request);

        if (stripeConnected) {
            debug('Setting up Stripe connection for test');
            await settingsService.setStripeConnected();
        }

        const labsFlagsSpecified = labs && Object.keys(labs).length > 0;
        if (labsFlagsSpecified) {
            debug('Updating labs settings:', labs);
            await settingsService.updateLabsSettings(labs);
        }

        const needsReload = stripeConnected || labsFlagsSpecified;
        if (needsReload) {
            await page.reload({waitUntil: 'load'});
            debug('Settings applied and page reloaded');
        }

        await use(page);
    }
});

export {expect} from '@playwright/test';
