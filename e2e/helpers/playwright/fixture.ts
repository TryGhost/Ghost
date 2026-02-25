import baseDebug from '@tryghost/debug';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {FakeStripeServer, StripeTestService, WebhookClient} from '@/helpers/services/stripe';
import {GhostInstance, getEnvironmentManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {faker} from '@faker-js/faker';
import {loginToGetAuthenticatedSession} from '@/helpers/playwright/flows/sign-in';
import {setupUser} from '@/helpers/utils';

const debug = baseDebug('e2e:ghost-fixture');
const STRIPE_FAKE_SERVER_PORT = 40000 + parseInt(process.env.TEST_PARALLEL_INDEX || '0', 10);
const STRIPE_SECRET_KEY = 'sk_test_e2eTestKey';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_e2eTestKey';

export interface User {
    name: string;
    email: string;
    password: string;
}

export interface GhostConfig {
    memberWelcomeEmailTestInbox?: string;
    hostSettings__billing__enabled?: string;
    hostSettings__billing__url?: string;
    hostSettings__forceUpgrade?: string;
}

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    labs?: Record<string, boolean>;
    config?: GhostConfig;
    stripeEnabled?: boolean;
    stripeServer?: FakeStripeServer;
    stripe?: StripeTestService;
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
 * Automatically detects if dev environment (yarn dev) is running:
 * - Dev mode: Uses worker-scoped containers with per-test database cloning (faster)
 * - Standalone mode: Uses per-test containers (traditional behavior)
 *
 * Optionally allows setting labs flags via test.use({labs: {featureName: true}})
 * and Stripe connection via test.use({stripeEnabled: true})
 * and Ghost config via test.use({config: {memberWelcomeEmailTestInbox: 'test@ghost.org'}})
 */
export const test = base.extend<GhostInstanceFixture>({
    // Define options that can be set per test or describe block
    config: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    stripeEnabled: [false, {option: true}],

    stripeServer: async ({stripeEnabled}, use) => {
        if (!stripeEnabled) {
            await use(undefined);
            return;
        }

        const server = new FakeStripeServer(STRIPE_FAKE_SERVER_PORT);
        await server.start();
        debug('Fake Stripe server started on port', STRIPE_FAKE_SERVER_PORT);

        await use(server);

        await server.stop();
        debug('Fake Stripe server stopped');
    },

    // Each test gets its own Ghost instance with isolated database.
    ghostInstance: async ({config, stripeEnabled, stripeServer}, use, testInfo: TestInfo) => {
        debug('Setting up Ghost instance for test:', testInfo.title);
        const stripeConfig = stripeEnabled ? {
            STRIPE_API_HOST: 'host.docker.internal',
            STRIPE_API_PORT: String(STRIPE_FAKE_SERVER_PORT),
            STRIPE_API_PROTOCOL: 'http'
        } : {};
        const mergedConfig = {...(config || {}), ...stripeConfig};
        const environmentManager = await getEnvironmentManager();
        const ghostInstance = await environmentManager.perTestSetup({
            config: mergedConfig,
            stripe: stripeServer ? {
                secretKey: STRIPE_SECRET_KEY,
                publishableKey: STRIPE_PUBLISHABLE_KEY
            } : undefined
        });

        debug('Ghost instance ready for test:', {
            testTitle: testInfo.title,
            ...ghostInstance
        });
        await use(ghostInstance);

        debug('Tearing down Ghost instance for test:', testInfo.title);
        await environmentManager.perTestTeardown(ghostInstance);
        debug('Teardown completed for test:', testInfo.title);
    },

    stripe: async ({stripeEnabled, baseURL, stripeServer}, use) => {
        if (!stripeEnabled || !baseURL || !stripeServer) {
            await use(undefined);
            return;
        }

        const webhookClient = new WebhookClient(baseURL);
        const service = new StripeTestService(stripeServer, webhookClient);
        await use(service);
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
    page: async ({pageWithAuthenticatedUser, labs}, use) => {
        const page = pageWithAuthenticatedUser.page;

        const labsFlagsSpecified = labs && Object.keys(labs).length > 0;
        if (labsFlagsSpecified) {
            const settingsService = new SettingsService(page.request);
            debug('Updating labs settings:', labs);
            await settingsService.updateLabsSettings(labs);
        }

        const needsReload = labsFlagsSpecified;
        if (needsReload) {
            await page.reload({waitUntil: 'load'});
            debug('Settings applied and page reloaded');
        }

        await use(page);
    }
});

export {expect} from '@playwright/test';
