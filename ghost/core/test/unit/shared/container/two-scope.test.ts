import assert from 'node:assert/strict';
import {createContainer} from '../../../../core/shared/container/container';
import {registerCoreServices} from '../../../../core/registrations';

/**
 * The DI migration's definition of done: everything registered in the
 * container must be able to run twice in one process with zero bleed.
 * Every migrated subsystem gets its isolation asserted here.
 */
describe('two scopes in one process', function () {
    const createSiteScope = (root: ReturnType<typeof createContainer>, url = 'https://site.example/', hostSettings: object = {}) => {
        return root.createScope({
            siteConfig: {
                database: {
                    client: 'better-sqlite3',
                    connection: {filename: ':memory:'}
                },
                hostSettings,
                url,
                getSiteUrl: () => url,
                getAdminUrl: () => undefined,
                getSubdir: () => '',
                assetBaseUrls: {},
                protectedSlugs: ['ghost'],
                redirectCacheMaxAge: 0,
                publicContentPath: '/tmp/ghost-test-public'
            },
            adapterPaths: ['', `${__dirname}/../../../../core/server/adapters/`],
            adapterConfig: {
                get: (key: string) => (key === 'adapters' ? {cache: {active: 'MemoryCache', linkRedirectsPublic: {}}} : undefined),
                getContentPath: () => '/tmp/ghost-test-content'
            },
            getMilestonesConfig: () => ({}),
            deploymentConfig: {get: () => undefined}
        });
    };

    it('gives each scope its own database connection', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        const knexA = scopeA.resolve('knex') as import('knex').Knex;
        const knexB = scopeB.resolve('knex') as import('knex').Knex;

        try {
            assert.notEqual(knexA, knexB);

            await knexA.raw('create table site_a_only (x integer)');
            await knexA.raw('insert into site_a_only (x) values (1)');

            const rows = await knexA.raw('select x from site_a_only');
            assert.equal(rows[0].x, 1);

            await assert.rejects(knexB.raw('select x from site_a_only'));
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own model graph bound to its own database', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        try {
            const modelsA = scopeA.resolve('models') as Record<string, {knex?: unknown}>;
            const modelsB = scopeB.resolve('models') as Record<string, {knex?: unknown}>;

            assert.ok(modelsA.Post);
            assert.notEqual(modelsA.Post, modelsB.Post);
            assert.equal(modelsA.Base.knex, scopeA.resolve('knex'));
            assert.equal(modelsB.Base.knex, scopeB.resolve('knex'));
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own event bus', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        try {
            const eventsA = scopeA.resolve('events') as import('events').EventEmitter;
            const eventsB = scopeB.resolve('events') as import('events').EventEmitter;
            let fired = 0;
            eventsA.on('settings.edited', () => {
                fired += 1;
            });

            eventsB.emit('settings.edited');
            assert.equal(fired, 0);

            eventsA.emit('settings.edited');
            assert.equal(fired, 1);
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own settings cache wired to its own event bus', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        try {
            const cacheA = scopeA.resolve('settingsCache') as any;
            const cacheB = scopeB.resolve('settingsCache') as any;
            const eventsA = scopeA.resolve('events') as any;
            const MemoryCache = require('../../../../core/server/adapters/cache/MemoryCache');

            assert.notEqual(cacheA, cacheB);

            cacheA.init(eventsA, null, [], new MemoryCache(), {});
            cacheB.init(scopeB.resolve('events'), null, [], new MemoryCache(), {});

            const settingModel = {
                get: (key: string) => (key === 'key' ? 'title' : undefined),
                toJSON: () => ({key: 'title', value: 'Site A'})
            };
            eventsA.emit('settings.edited', settingModel);

            assert.equal(cacheA.get('title'), 'Site A');
            assert.equal(cacheB.get('title'), undefined);
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own adapter instances', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        try {
            const managerA = scopeA.resolve('adapterManager') as any;
            const managerB = scopeB.resolve('adapterManager') as any;

            const cacheA = managerA.getAdapter('cache:test');
            const cacheB = managerB.getAdapter('cache:test');

            assert.equal(cacheA, managerA.getAdapter('cache:test'));
            assert.notEqual(cacheA, cacheB);

            cacheA.set('key', 'site-a');
            assert.equal(await cacheB.get('key'), undefined);
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope url utils for its own site url', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root, 'https://site-a.example/');
        const scopeB = createSiteScope(root, 'https://site-b.example/');

        try {
            const urlUtilsA = scopeA.resolve('urlUtils') as any;
            const urlUtilsB = scopeB.resolve('urlUtils') as any;

            assert.equal(urlUtilsA.urlFor('home', true), 'https://site-a.example/');
            assert.equal(urlUtilsB.urlFor('home', true), 'https://site-b.example/');
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own limit service from its own host settings', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root, 'https://site-a.example/', {
            limits: {staff: {max: 1, error: 'No more staff for you'}}
        });
        const scopeB = createSiteScope(root, 'https://site-b.example/');

        try {
            const limitsA = scopeA.resolve('limits') as any;
            const limitsB = scopeB.resolve('limits') as any;

            assert.equal(limitsA.isLimited('staff'), true);
            assert.equal(limitsB.isLimited('staff'), false);
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own domain events bus', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        try {
            const domainEventsA = scopeA.resolve('domainEvents') as any;
            const domainEventsB = scopeB.resolve('domainEvents') as any;

            class TestEvent {
                timestamp = new Date();
                data = {};
            }

            let fired = 0;
            domainEventsA.subscribe(TestEvent, () => {
                fired += 1;
            });

            domainEventsB.dispatch(new TestEvent());
            await domainEventsB.allSettled();
            assert.equal(fired, 0);

            domainEventsA.dispatch(new TestEvent());
            await domainEventsA.allSettled();
            assert.equal(fired, 1);
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('gives each scope its own service instances', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        const scopedServices = ['tiers', 'donations', 'audienceFeedback', 'linkRedirection', 'linkTracking', 'slackNotifications', 'staff', 'newsletters', 'mentions', 'milestones', 'membersEvents', 'comments', 'tagsPublic', 'postsPublic', 'invites', 'settingsHelpers', 'explore', 'emailAddress', 'customThemeSettingsCache', 'customThemeSettings', 'memberWelcomeEmails', 'emailSuppressionList', 'recommendations', 'memberAttribution'];

        try {
            for (const name of scopedServices) {
                const serviceA = scopeA.resolve(name) as object;
                const serviceB = scopeB.resolve(name) as object;

                assert.ok(serviceA, `expected ${name} to resolve`);
                assert.notEqual(serviceA, serviceB, `expected ${name} to be scope-isolated`);
            }
        } finally {
            await scopeA.dispose();
            await scopeB.dispose();
        }
    });

    it('disposing one scope leaves the other working', async function () {
        const root = createContainer();
        registerCoreServices(root);
        const scopeA = createSiteScope(root);
        const scopeB = createSiteScope(root);

        const knexA = scopeA.resolve('knex') as import('knex').Knex;
        const knexB = scopeB.resolve('knex') as import('knex').Knex;

        await scopeA.dispose();

        await assert.rejects(knexA.raw('select 1'));
        const result = await knexB.raw('select 1 as x');
        assert.equal(result[0].x, 1);

        await scopeB.dispose();
    });
});
