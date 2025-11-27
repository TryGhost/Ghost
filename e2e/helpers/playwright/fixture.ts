import baseDebug from '@tryghost/debug';
import {AnalyticsOverviewPage} from '@/admin-pages';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {GhostInstance, getEnvironmentManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createContextWithRoute} from '@/helpers/playwright/context-with-route';
import {User} from '@/data-factory';
import * as fs from 'fs';
import * as path from 'path';

const debug = baseDebug('e2e:ghost-fixture');

const AUTH_STATE_DIR = path.join(process.cwd(), 'e2e', 'data', 'state', 'auth');
const USERS_STATE_FILE = path.join(process.cwd(), 'e2e', 'data', 'state', 'users.json');

export interface GhostConfig {
    memberWelcomeEmailSendInstantly: string;
    memberWelcomeEmailTestInbox: string;
}

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    labs?: Record<string, boolean>;
    config?: GhostConfig;
    role?: 'owner' | 'administrator' | 'editor' | 'author' | 'contributor';
    ghostAccountOwner: User;
    pageWithAuthenticatedUser: {
        page: Page;
        context: BrowserContext;
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

async function setupNewAuthenticatedPage(browser: Browser, backendURL: string, role: string = 'owner') {
    debug('Setting up authenticated page for Ghost instance:', backendURL, 'with role:', role);

    const context = await createContextWithRoute(browser, backendURL, {
        role
    });
    
    const page = await context.newPage();
    debug('Authenticated page created using saved storageState with host aliasing');

    return {page, context};
}

/**
 * Playwright fixture that provides a unique Ghost instance for each test
 * Each instance gets its own database, runs on a unique port, and includes authentication
 *
 * Automatically detects if dev environment (yarn dev:forward) is running:
 * - Dev mode: Uses worker-scoped containers with per-test database cloning (faster)
 * - Standalone mode: Uses per-test containers (traditional behavior)
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
    // Options that can be set per test or describe block
    config: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    role: ['owner', {option: true}],

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

    // Load owner user credentials from saved state (backward compatibility)
    ghostAccountOwner: async ({}, use) => {
        if (!fs.existsSync(USERS_STATE_FILE)) {
            throw new Error(`User credentials file not found: ${USERS_STATE_FILE}. Run global setup first.`);
        }

        const credentials = JSON.parse(fs.readFileSync(USERS_STATE_FILE, 'utf-8'));
        const owner: User = {
            name: credentials.owner.name,
            email: credentials.owner.email,
            password: credentials.owner.password,
            blogTitle: credentials.owner.blogTitle
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
