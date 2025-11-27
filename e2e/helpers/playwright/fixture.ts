import * as fs from 'fs';
import * as path from 'path';
import baseDebug from '@tryghost/debug';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {GhostInstance, getEnvironmentManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {User} from '@/data-factory';
import {createContextWithRoute} from '@/helpers/playwright/context-with-route';

const debug = baseDebug('e2e:ghost-fixture');

export interface GhostConfig {
    memberWelcomeEmailSendInstantly?: string;
    memberWelcomeEmailTestInbox?: string;
    hostSettings__billing__enabled?: string;
    hostSettings__billing__url?: string;
    hostSettings__forceUpgrade?: string;
}

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    labs?: Record<string, boolean>;
    config?: GhostConfig;
    role?: 'owner' | 'administrator' | 'editor' | 'author' | 'contributor';
    stripeConnected?: boolean;
    ghostAccountOwner: User;
    pageWithAuthenticatedUser: {
        page: Page;
        context: BrowserContext;
    };
}

async function setupNewAuthenticatedPage(browser: Browser, backendURL: string, role: string = 'owner') {
    debug('Setting up authenticated page for Ghost instance:', backendURL, 'with role:', role);

    const context = await createContextWithRoute(browser, backendURL, {
        role
    });
    
    const page = await context.newPage();

    return {page, context};
}

/**
 * Playwright fixture that provides a unique Ghost instance for each test
 * Each instance gets its own database, runs on a unique port, and includes authentication
 *
 * Automatically detects if dev environment (yarn dev) is running:
 * - Dev mode: Uses worker-scoped containers with per-test database cloning (faster)
 * - Standalone mode: Uses per-test containers (traditional behavior)
 *
 * Optionally allows setting labs flags via test.use({labs: {featureName: true}})
 * and Stripe connection via test.use({stripeConnected: true})
   and Ghost config via config settings: 
 *  test.use({config: {
 *      memberWelcomeEmailSendInstantly: 'true',
 *      memberWelcomeEmailTestInbox: `test+welcome-email@ghost.org`
 *  }})
 */
export const test = base.extend<GhostInstanceFixture>({
    // Define options that can be set per test or describe block
    config: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    role: ['owner', {option: true}],
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

    ghostAccountOwner: async ({}, use) => {
        const owner: User = {
            name: 'Test Owner',
            email: 'owner@ghost.org',
            password: 'test@123@test',
            blogTitle: 'Test Blog'
        };
        await use(owner);
    },

    // Intermediate fixture that sets up the page using saved authentication state
    pageWithAuthenticatedUser: async ({browser, baseURL, role}, use) => {
        if (!baseURL) {
            throw new Error('baseURL is not defined');
        }

        const pageWithAuthenticatedUser = await setupNewAuthenticatedPage(browser, baseURL, role);
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
