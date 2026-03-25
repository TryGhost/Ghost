import baseDebug from '@tryghost/debug';
import {Browser, BrowserContext, Page, TestInfo, test as base} from '@playwright/test';
import {FakeStripeServer, StripeTestService, WebhookClient} from '@/helpers/services/stripe';
import {GhostInstance, getEnvironmentManager} from '@/helpers/environment';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {User} from '@/data-factory';
import {createContextWithAuthState} from '@/helpers/playwright/context-with-auth-state';
import type {FixtureRole} from '@/helpers/utils/fixture-cache';

const debug = baseDebug('e2e:ghost-fixture');
const STRIPE_SECRET_KEY = 'sk_test_e2eTestKey';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_e2eTestKey';
const OWNER: User = {
    name: 'Test Owner',
    email: 'owner@ghost.org',
    password: 'test@123@test',
    blogTitle: 'Test Blog'
};

type ResolvedIsolation = 'per-file' | 'per-test';
type LabsFlags = Record<string, boolean>;

export type Role = FixtureRole;

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

export interface GhostConfig {
    hostSettings__billing__enabled?: string;
    hostSettings__billing__url?: string;
    hostSettings__forceUpgrade?: string;
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
    // Selects which pre-generated authenticated storage state to load.
    role?: Role;
    // Forces per-test isolation because Ghost boots against a per-test fake Stripe server.
    stripeEnabled?: boolean;
    stripeServer?: FakeStripeServer;
    stripe?: StripeTestService;
    ghostAccountOwner: User;
    pageWithAuthenticatedUser: {
        page: Page;
        context: BrowserContext;
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

async function setupNewAuthenticatedPage(browser: Browser, backendURL: string, role: Role = 'owner') {
    debug('Setting up authenticated page for Ghost instance:', backendURL, 'with role:', role);

    const context = await createContextWithAuthState(browser, backendURL, {
        role
    });
    const page = await context.newPage();

    return {page, context};
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
    }, {
        scope: 'worker',
        auto: true
    }],

    _testEnvironmentContext: async ({config, isolation, labs, stripeEnabled, stripeServer}, use, testInfo: TestInfo) => {
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
        const mergedConfig = {...(config || {}), ...stripeConfig};
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
    role: ['owner', {option: true}],
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

    ghostAccountOwner: async ({_testEnvironmentContext}, use) => {
        _testEnvironmentContext.markResetEnvironmentBlocker('ghostAccountOwner');
        await use({...OWNER});
    },

    pageWithAuthenticatedUser: async ({browser, baseURL, role, _testEnvironmentContext}, use) => {
        if (!baseURL) {
            throw new Error('baseURL is not defined');
        }

        _testEnvironmentContext.markResetEnvironmentBlocker('pageWithAuthenticatedUser');

        const pageWithAuthenticatedUser = await setupNewAuthenticatedPage(browser, baseURL, role);
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
