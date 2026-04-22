import baseDebug from '@tryghost/debug';
import {AnalyticsOverviewPage} from '@/helpers/pages';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {FakeMailgunServer, MailgunTestService} from '@/helpers/services/mailgun';
import {FakeStripeServer, StripeTestService, WebhookClient} from '@/helpers/services/stripe';
import {GhostInstance, getEnvironmentManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {faker} from '@faker-js/faker';
import {loginToGetAuthenticatedSession} from '@/helpers/playwright/flows/sign-in';
import {setupUser} from '@/helpers/utils';

const debug = baseDebug('e2e:ghost-fixture');
const STRIPE_SECRET_KEY = 'sk_test_e2eTestKey';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_e2eTestKey';

type ResolvedIsolation = 'per-file' | 'per-test';
type LabsFlags = Record<string, boolean>;

/**
 * The subset of fixture options that defines whether a per-file environment can
 * be reused for the next test in the same file.
 *
 * Any new fixture option that changes persistent Ghost state or boot-time config
 * must make an explicit choice:
 * - include it here so it participates in environment reuse, or
 * - force per-test isolation instead of participating in per-file reuse.
 */
interface EnvironmentIdentity {
    config?: GhostConfig;
    labs?: LabsFlags;
}

interface PerFileInstanceCache {
    suiteKey: string;
    environmentSignature: string;
    instance: GhostInstance;
}

interface PerFileAuthenticatedSessionCache {
    ghostAccountOwner: User;
    storageState: Awaited<ReturnType<BrowserContext['storageState']>>;
}

interface TestEnvironmentContext {
    holder: GhostInstance;
    resolvedIsolation: ResolvedIsolation;
    cycle: () => Promise<void>;
    getResetEnvironmentBlocker: () => string | null;
    markResetEnvironmentBlocker: (fixtureName: string) => void;
}

interface InternalFixtures {
    _testEnvironmentContext: TestEnvironmentContext;
}

interface WorkerFixtures {
    _cleanupPerFileInstance: void;
}

let cachedPerFileInstance: PerFileInstanceCache | null = null;
let cachedPerFileGhostAccountOwner: User | null = null;
let cachedPerFileAuthenticatedSession: PerFileAuthenticatedSessionCache | null = null;

export interface User {
    name: string;
    email: string;
    password: string;
}

export interface GhostConfig {
    hostSettings__billing__enabled?: string;
    hostSettings__billing__url?: string;
    hostSettings__forceUpgrade?: string;
    hostSettings__limits__customIntegrations__disabled?: string;
    hostSettings__limits__customIntegrations__error?: string;
}

export interface GhostInstanceFixture {
    ghostInstance: GhostInstance;
    // Opt a file into per-test isolation without relying on Playwright-wide fullyParallel.
    isolation?: 'per-test';
    resolvedIsolation: ResolvedIsolation;
    // Hook-only escape hatch for per-file mode before stateful fixtures are resolved.
    resetEnvironment: () => Promise<void>;
    // Participates in per-file environment identity.
    labs?: LabsFlags;
    // Participates in per-file environment identity.
    config?: GhostConfig;
    // Forces per-test isolation because Ghost boots against a per-test fake Stripe server.
    stripeEnabled?: boolean;
    stripeServer?: FakeStripeServer;
    stripe?: StripeTestService;
    mailgunEnabled?: boolean;
    mailgunServer?: FakeMailgunServer;
    mailgun?: MailgunTestService;
    emailClient: EmailClient;
    ghostAccountOwner: User;
    pageWithAuthenticatedUser: {
        page: Page;
        context: BrowserContext;
        ghostAccountOwner: User
    };
}

function getStableObjectSignature<T extends object>(values?: T): string {
    return JSON.stringify(
        Object.fromEntries(
            Object.entries(values ?? {})
                .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        )
    );
}

function getEnvironmentSignature(identity: EnvironmentIdentity): string {
    return JSON.stringify({
        config: getStableObjectSignature(identity.config),
        labs: getStableObjectSignature(identity.labs)
    });
}

function getSuiteKey(testInfo: TestInfo): string {
    return `${testInfo.project.name}:${testInfo.file}`;
}

function getResolvedIsolation(testInfo: TestInfo, isolation?: 'per-test'): ResolvedIsolation {
    if (testInfo.config.fullyParallel || isolation === 'per-test') {
        return 'per-test';
    }

    return 'per-file';
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

async function setupAuthenticatedPageFromStorageState(browser: Browser, baseURL: string, authenticatedSession: PerFileAuthenticatedSessionCache) {
    debug('Reusing authenticated storage state for Ghost instance:', baseURL);

    const context = await browser.newContext({
        baseURL: baseURL,
        extraHTTPHeaders: {
            Origin: baseURL
        },
        storageState: authenticatedSession.storageState
    });
    const page = await context.newPage();
    await page.goto('/ghost/#/');

    const analyticsPage = new AnalyticsOverviewPage(page);
    const billingIframe = page.getByTitle('Billing');
    await Promise.race([
        analyticsPage.header.waitFor({state: 'visible'}),
        billingIframe.waitFor({state: 'visible'})
    ]);

    return {
        page,
        context,
        ghostAccountOwner: authenticatedSession.ghostAccountOwner
    };
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
 * and Stripe connection via test.use({stripeEnabled: true})
 */
export const test = base.extend<GhostInstanceFixture & InternalFixtures, WorkerFixtures>({
    _cleanupPerFileInstance: [async ({}, use) => {
        await use();

        if (!cachedPerFileInstance) {
            return;
        }

        const environmentManager = await getEnvironmentManager();
        await environmentManager.perTestTeardown(cachedPerFileInstance.instance);
        cachedPerFileInstance = null;
        cachedPerFileGhostAccountOwner = null;
        cachedPerFileAuthenticatedSession = null;
    }, {
        scope: 'worker',
        auto: true
    }],

    _testEnvironmentContext: async ({config, isolation, labs, stripeEnabled, stripeServer, mailgunEnabled, mailgunServer}, use, testInfo: TestInfo) => {
        const environmentManager = await getEnvironmentManager();
        const requestedIsolation = getResolvedIsolation(testInfo, isolation);
        // Stripe-enabled tests boot Ghost against a per-test fake Stripe server,
        // so they cannot safely participate in per-file environment reuse.
        const resolvedIsolation = stripeEnabled ? 'per-test' : requestedIsolation;
        const suiteKey = getSuiteKey(testInfo);
        const stripeConfig = stripeEnabled && stripeServer ? {
            STRIPE_API_HOST: 'host.docker.internal',
            STRIPE_API_PORT: String(stripeServer.port),
            STRIPE_API_PROTOCOL: 'http'
        } : {};
        const mailgunConfig = mailgunEnabled && mailgunServer ? {
            bulkEmail__mailgun__apiKey: 'fake-mailgun-api-key',
            bulkEmail__mailgun__domain: 'fake.mailgun.test',
            bulkEmail__mailgun__baseUrl: `http://host.docker.internal:${mailgunServer.port}/v3`
        } : {};
        const mergedConfig = {...(config || {}), ...stripeConfig, ...mailgunConfig};
        const stripe = stripeServer ? {
            secretKey: STRIPE_SECRET_KEY,
            publishableKey: STRIPE_PUBLISHABLE_KEY
        } : undefined;
        const environmentIdentity: EnvironmentIdentity = {
            config: mergedConfig,
            labs
        };
        const environmentSignature = getEnvironmentSignature(environmentIdentity);
        const resetEnvironmentGuard = {
            blocker: null as string | null
        };

        if (resolvedIsolation === 'per-test') {
            const perTestInstance = await environmentManager.perTestSetup({
                config: mergedConfig,
                stripe
            });
            const previousPerFileInstance = cachedPerFileInstance?.instance;
            cachedPerFileInstance = null;
            cachedPerFileGhostAccountOwner = null;
            cachedPerFileAuthenticatedSession = null;

            if (previousPerFileInstance) {
                await environmentManager.perTestTeardown(previousPerFileInstance);
            }

            await use({
                holder: perTestInstance,
                resolvedIsolation,
                cycle: async () => {
                    debug('resetEnvironment() is a no-op in per-test isolation mode');
                },
                getResetEnvironmentBlocker: () => resetEnvironmentGuard.blocker,
                markResetEnvironmentBlocker: (fixtureName: string) => {
                    resetEnvironmentGuard.blocker ??= fixtureName;
                }
            });

            await environmentManager.perTestTeardown(perTestInstance);
            return;
        }

        const mustRecyclePerFileInstance = !cachedPerFileInstance ||
            cachedPerFileInstance.suiteKey !== suiteKey ||
            cachedPerFileInstance.environmentSignature !== environmentSignature;

        if (mustRecyclePerFileInstance) {
            const previousPerFileInstance = cachedPerFileInstance?.instance;
            const nextPerFileInstance = await environmentManager.perTestSetup({
                config: mergedConfig,
                stripe
            });
            cachedPerFileInstance = {
                suiteKey,
                environmentSignature,
                instance: nextPerFileInstance
            };
            cachedPerFileGhostAccountOwner = null;
            cachedPerFileAuthenticatedSession = null;

            if (previousPerFileInstance) {
                await environmentManager.perTestTeardown(previousPerFileInstance);
            }
        }

        const activePerFileInstance = cachedPerFileInstance;
        if (!activePerFileInstance) {
            throw new Error('[e2e fixture] Failed to initialize per-file Ghost instance.');
        }

        const holder = {...activePerFileInstance.instance};
        const cycle = async () => {
            const previousInstance = cachedPerFileInstance?.instance;
            const nextInstance = await environmentManager.perTestSetup({
                config: mergedConfig,
                stripe
            });

            if (previousInstance) {
                await environmentManager.perTestTeardown(previousInstance);
            }

            cachedPerFileInstance = {
                suiteKey,
                environmentSignature,
                instance: nextInstance
            };
            cachedPerFileGhostAccountOwner = null;
            cachedPerFileAuthenticatedSession = null;

            Object.assign(holder, nextInstance);
        };

        await use({
            holder,
            resolvedIsolation,
            cycle,
            getResetEnvironmentBlocker: () => resetEnvironmentGuard.blocker,
            markResetEnvironmentBlocker: (fixtureName: string) => {
                resetEnvironmentGuard.blocker ??= fixtureName;
            }
        });
    },

    // Define options that can be set per test or describe block
    config: [undefined, {option: true}],
    isolation: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    stripeEnabled: [false, {option: true}],
    mailgunEnabled: [false, {option: true}],

    stripeServer: async ({stripeEnabled}, use) => {
        if (!stripeEnabled) {
            await use(undefined);
            return;
        }

        const server = new FakeStripeServer();
        await server.start();
        debug('Fake Stripe server started on port', server.port);

        await use(server);

        await server.stop();
        debug('Fake Stripe server stopped');
    },
    
    mailgunServer: async ({mailgunEnabled}, use) => {
        if (!mailgunEnabled) {
            await use(undefined);
            return;
        }

        const server = new FakeMailgunServer();
        await server.start();
        debug('Fake Mailgun server started on port', server.port);

        await use(server);

        await server.stop();
        debug('Fake Mailgun server stopped');
    },

    mailgun: async ({mailgunEnabled, mailgunServer}, use) => {
        if (!mailgunEnabled || !mailgunServer) {
            await use(undefined);
            return;
        }

        const service = new MailgunTestService(mailgunServer);
        await use(service);
    },

    emailClient: async ({}, use) => {
        await use(new MailPit());
    },

    ghostInstance: async ({_testEnvironmentContext}, use, testInfo: TestInfo) => {
        debug('Using Ghost instance for test:', {
            testTitle: testInfo.title,
            resolvedIsolation: _testEnvironmentContext.resolvedIsolation,
            ..._testEnvironmentContext.holder
        });
        await use(_testEnvironmentContext.holder);
    },

    resolvedIsolation: async ({_testEnvironmentContext}, use) => {
        await use(_testEnvironmentContext.resolvedIsolation);
    },

    resetEnvironment: async ({_testEnvironmentContext}, use) => {
        await use(async () => {
            if (_testEnvironmentContext.resolvedIsolation === 'per-test') {
                debug('resetEnvironment() is a no-op in per-test isolation mode');
                return;
            }

            // Only support resetEnvironment() before stateful fixtures such as the
            // baseURL, authenticated user session, or page have been materialized.
            const blocker = _testEnvironmentContext.getResetEnvironmentBlocker();
            if (blocker) {
                throw new Error(
                    `[e2e fixture] resetEnvironment() must be called before resolving ` +
                    `"${blocker}". Use it in a beforeEach hook that only depends on ` +
                    'resetEnvironment and fixtures that remain valid after a recycle.'
                );
            }

            await _testEnvironmentContext.cycle();
        });
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

    baseURL: async ({ghostInstance, _testEnvironmentContext}, use) => {
        _testEnvironmentContext.markResetEnvironmentBlocker('baseURL');
        await use(ghostInstance.baseUrl);
    },

    // Create user credentials only (no authentication)
    ghostAccountOwner: async ({ghostInstance, _testEnvironmentContext}, use) => {
        if (!ghostInstance.baseUrl) {
            throw new Error('baseURL is not defined');
        }

        _testEnvironmentContext.markResetEnvironmentBlocker('ghostAccountOwner');

        if (_testEnvironmentContext.resolvedIsolation === 'per-file' && cachedPerFileGhostAccountOwner) {
            await use(cachedPerFileGhostAccountOwner);
            return;
        }

        // Create user in this Ghost instance
        const ghostAccountOwner: User = {
            name: 'Test User',
            email: `test${faker.string.uuid()}@ghost.org`,
            password: 'test@123@test'
        };
        await setupUser(ghostInstance.baseUrl, ghostAccountOwner);

        if (_testEnvironmentContext.resolvedIsolation === 'per-file') {
            cachedPerFileGhostAccountOwner = ghostAccountOwner;
        }

        await use(ghostAccountOwner);
    },

    // Intermediate fixture that sets up the page and returns all setup data
    pageWithAuthenticatedUser: async ({browser, ghostInstance, ghostAccountOwner, _testEnvironmentContext}, use) => {
        if (!ghostInstance.baseUrl) {
            throw new Error('baseURL is not defined');
        }

        _testEnvironmentContext.markResetEnvironmentBlocker('pageWithAuthenticatedUser');

        const pageWithAuthenticatedUser =
            _testEnvironmentContext.resolvedIsolation === 'per-file' && cachedPerFileAuthenticatedSession
                ? await setupAuthenticatedPageFromStorageState(browser, ghostInstance.baseUrl, cachedPerFileAuthenticatedSession)
                : await setupNewAuthenticatedPage(browser, ghostInstance.baseUrl, ghostAccountOwner);

        if (_testEnvironmentContext.resolvedIsolation === 'per-file' && !cachedPerFileAuthenticatedSession) {
            cachedPerFileAuthenticatedSession = {
                ghostAccountOwner: pageWithAuthenticatedUser.ghostAccountOwner,
                storageState: await pageWithAuthenticatedUser.context.storageState()
            };
        }

        await use(pageWithAuthenticatedUser);
        await pageWithAuthenticatedUser.context.close();
    },

    // Extract the page from pageWithAuthenticatedUser and apply labs/stripe settings
    page: async ({pageWithAuthenticatedUser, labs, _testEnvironmentContext}, use) => {
        _testEnvironmentContext.markResetEnvironmentBlocker('page');

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
