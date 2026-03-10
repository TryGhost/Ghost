import baseDebug from '@tryghost/debug';
import {AnalyticsOverviewPage} from '@/helpers/pages';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {FakeStripeServer, StripeTestService, WebhookClient} from '@/helpers/services/stripe';
import {FileExecutionMode, getFileMode, setFileModeFromCaller} from './mode-registry';
import {GhostInstance, getEnvironmentManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {faker} from '@faker-js/faker';
import {loginToGetAuthenticatedSession} from '@/helpers/playwright/flows/sign-in';
import {setupUser} from '@/helpers/utils';

const debug = baseDebug('e2e:ghost-fixture');
const STRIPE_SECRET_KEY = 'sk_test_e2eTestKey';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_e2eTestKey';

type ResolvedIsolation = 'per-file' | 'per-test';

interface PerFileInstanceCache {
    suiteKey: string;
    configSignature: string;
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
}

interface InternalFixtures {
    _testEnvironmentContext: TestEnvironmentContext;
}

interface WorkerFixtures {
    _cleanupPerFileInstance: void;
}

const MODE_GUARD_ERROR =
    '[e2e fixture] Per-describe execution mode is not supported. ' +
    'Use root-level test.describe.configure({mode: \'parallel\' | \'default\' | \'serial\'}) only.';

let cachedPerFileInstance: PerFileInstanceCache | null = null;
let cachedPerFileGhostAccountOwner: User | null = null;
let cachedPerFileAuthenticatedSession: PerFileAuthenticatedSessionCache | null = null;
let modeGuardsInstalled = false;
let describeDeclarationDepth = 0;

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
    resolvedIsolation: ResolvedIsolation;
    resetEnvironment: () => Promise<void>;
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

function getConfigSignature(config?: GhostConfig): string {
    return JSON.stringify(config ?? {});
}

function getSuiteKey(testInfo: TestInfo): string {
    return `${testInfo.project.name}:${testInfo.file}`;
}

function getResolvedIsolation(testInfo: TestInfo): ResolvedIsolation {
    if (testInfo.config.fullyParallel) {
        return 'per-test';
    }

    const fileMode = getFileMode(testInfo.file);
    return fileMode === 'parallel' ? 'per-test' : 'per-file';
}

function getCallbackArgumentIndex(args: unknown[]): number {
    for (let i = args.length - 1; i >= 0; i -= 1) {
        if (typeof args[i] === 'function') {
            return i;
        }
    }

    return -1;
}

function wrapDescribeDeclaration(describeFn: (...args: unknown[]) => void): (...args: unknown[]) => void {
    return (...args: unknown[]) => {
        const callbackIndex = getCallbackArgumentIndex(args);
        if (callbackIndex === -1) {
            return describeFn(...args);
        }

        const callback = args[callbackIndex] as () => void;
        const wrappedCallback = () => {
            describeDeclarationDepth += 1;
            try {
                return callback();
            } finally {
                describeDeclarationDepth -= 1;
            }
        };

        const wrappedArgs = [...args];
        wrappedArgs[callbackIndex] = wrappedCallback;

        return describeFn(...wrappedArgs);
    };
}

function createUnsupportedDescribeApi(apiName: string): ((...args: unknown[]) => never) & {only: (...args: unknown[]) => never} {
    const unsupportedApi = (() => {
        throw new Error(`[e2e fixture] "${apiName}" is not supported. ${MODE_GUARD_ERROR}`);
    }) as ((...args: unknown[]) => never) & {only: (...args: unknown[]) => never};

    unsupportedApi.only = () => {
        throw new Error(`[e2e fixture] "${apiName}.only" is not supported. ${MODE_GUARD_ERROR}`);
    };

    return unsupportedApi;
}

function installModeGuardsOnce(testType: {describe: Record<string, unknown>}): void {
    if (modeGuardsInstalled) {
        return;
    }

    const describe = testType.describe as Record<string, unknown>;
    const originalDescribe = describe as unknown as (...args: unknown[]) => void;
    const originalConfigure = describe.configure as ((options: {
        mode?: FileExecutionMode;
        retries?: number;
        timeout?: number;
    }) => void) | undefined;

    if (typeof originalConfigure !== 'function') {
        throw new Error('[e2e fixture] Could not install mode guards: test.describe.configure is unavailable.');
    }

    const wrappedDescribe = wrapDescribeDeclaration((...args: unknown[]) => {
        return originalDescribe(...args);
    }) as unknown as Record<string, unknown>;

    for (const describeVariant of ['only', 'skip', 'fixme']) {
        const variant = describe[describeVariant];
        if (typeof variant === 'function') {
            wrappedDescribe[describeVariant] = wrapDescribeDeclaration((...args: unknown[]) => {
                return (variant as (...innerArgs: unknown[]) => void)(...args);
            });
        }
    }

    wrappedDescribe.configure = (options: {
        mode?: FileExecutionMode;
        retries?: number;
        timeout?: number;
    }) => {
        if (options.mode !== undefined) {
            if (describeDeclarationDepth !== 0) {
                throw new Error(`[e2e fixture] Non-root describe mode configuration is not supported. ${MODE_GUARD_ERROR}`);
            }

            const filePath = setFileModeFromCaller(options.mode);
            debug('Registered root-level describe mode', {
                filePath,
                mode: options.mode
            });
        }

        return originalConfigure(options);
    };

    wrappedDescribe.parallel = createUnsupportedDescribeApi('test.describe.parallel');
    wrappedDescribe.serial = createUnsupportedDescribeApi('test.describe.serial');

    (testType as {describe: Record<string, unknown>}).describe = wrappedDescribe;
    modeGuardsInstalled = true;
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

    _testEnvironmentContext: async ({config, stripeEnabled, stripeServer}, use, testInfo: TestInfo) => {
        const environmentManager = await getEnvironmentManager();
        const requestedIsolation = getResolvedIsolation(testInfo);
        const resolvedIsolation = stripeEnabled ? 'per-test' : requestedIsolation;
        const suiteKey = getSuiteKey(testInfo);
        const stripeConfig = stripeEnabled && stripeServer ? {
            STRIPE_API_HOST: 'host.docker.internal',
            STRIPE_API_PORT: String(stripeServer.port),
            STRIPE_API_PROTOCOL: 'http'
        } : {};
        const mergedConfig = {...(config || {}), ...stripeConfig};
        const stripe = stripeServer ? {
            secretKey: STRIPE_SECRET_KEY,
            publishableKey: STRIPE_PUBLISHABLE_KEY
        } : undefined;
        const configSignature = getConfigSignature(mergedConfig);

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
                }
            });

            await environmentManager.perTestTeardown(perTestInstance);
            return;
        }

        const mustRecyclePerFileInstance = !cachedPerFileInstance ||
            cachedPerFileInstance.suiteKey !== suiteKey ||
            cachedPerFileInstance.configSignature !== configSignature;

        if (mustRecyclePerFileInstance) {
            const previousPerFileInstance = cachedPerFileInstance?.instance;
            const nextPerFileInstance = await environmentManager.perTestSetup({
                config: mergedConfig,
                stripe
            });
            cachedPerFileInstance = {
                suiteKey,
                configSignature,
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
                configSignature,
                instance: nextInstance
            };
            cachedPerFileGhostAccountOwner = null;
            cachedPerFileAuthenticatedSession = null;

            Object.assign(holder, nextInstance);
        };

        await use({
            holder,
            resolvedIsolation,
            cycle
        });
    },

    // Define options that can be set per test or describe block
    config: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    stripeEnabled: [false, {option: true}],

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

    baseURL: async ({ghostInstance}, use) => {
        await use(ghostInstance.baseUrl);
    },

    // Create user credentials only (no authentication)
    ghostAccountOwner: async ({ghostInstance, _testEnvironmentContext}, use) => {
        if (!ghostInstance.baseUrl) {
            throw new Error('baseURL is not defined');
        }

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

installModeGuardsOnce(test as unknown as {describe: Record<string, unknown>});

export {expect} from '@playwright/test';
