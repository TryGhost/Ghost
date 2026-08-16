const assert = require('node:assert/strict');
const sinon = require('sinon');

const RouterManager = require('../../../../../core/frontend/services/routing/router-manager');
const registry = require('../../../../../core/frontend/services/routing/registry');
const routingEvents = require('../../../../../core/frontend/services/routing/events');

// The routers RouterManager mounts unconditionally (previews, unsubscribe,
// static pages, apps); only the settings-driven ones are asserted on here.
const emptySettings = {routes: [], collections: [], taxonomies: {}};

describe('UNIT: services/routing/RouterManager', function () {
    let routerManager;
    let urlService;

    beforeEach(function () {
        routerManager = new RouterManager({registry});
        urlService = {onRouterAddedType: sinon.stub(), onRouterUpdated: sinon.stub()};
    });

    afterEach(function () {
        registry.resetAllRouters();
        registry.resetAllRoutes();
        sinon.restore();
    });

    const start = routeSettings => routerManager.init({routeSettings, urlService});

    describe('taxonomies', function () {
        it('mounts a router per entry in the domain taxonomies map', function () {
            start({...emptySettings, taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}});

            const taxonomyRouters = registry.getAllRoutes()
                .filter(({from}) => from === 'Taxonomy')
                .map(({route}) => route);

            assert.ok(taxonomyRouters.includes('/tag/:slug/'), 'tag taxonomy is mounted');
            assert.ok(taxonomyRouters.includes('/author/:slug/'), 'author taxonomy is mounted');
        });

        it('mounts nothing when the taxonomies map is empty', function () {
            start(emptySettings);

            assert.deepEqual(registry.getAllRoutes().filter(({from}) => from === 'Taxonomy'), []);
        });

        it('mounts only the taxonomies that are present', function () {
            start({...emptySettings, taxonomies: {tag: '/categories/{slug}/'}});

            const taxonomyRouters = registry.getAllRoutes()
                .filter(({from}) => from === 'Taxonomy')
                .map(({route}) => route);

            assert.ok(taxonomyRouters.includes('/categories/:slug/'));
            assert.ok(!taxonomyRouters.some(route => route.includes('author')));
        });
    });

    describe('domain events', function () {
        let registered;
        let resetsBeforeEachRegistration;
        let resetCount;
        let onRegistered;
        let onReset;

        // Fails the assertion rather than throwing a TypeError when the router
        // never registered, which is the more likely regression.
        const eventFor = (type) => {
            const event = registered.find(candidate => candidate.type === type);
            assert.ok(event, `${type} emitted RouteRegistered`);
            return event;
        };

        beforeEach(function () {
            registered = [];
            resetsBeforeEachRegistration = [];
            resetCount = 0;
            onRegistered = (event) => {
                registered.push(event);
                resetsBeforeEachRegistration.push(resetCount);
            };
            onReset = () => {
                resetCount += 1;
            };
            routingEvents.on('RouteRegistered', onRegistered);
            routingEvents.on('RoutesReset', onReset);
        });

        afterEach(function () {
            routingEvents.off('RouteRegistered', onRegistered);
            routingEvents.off('RoutesReset', onReset);
        });

        it('emits RoutesReset once per init, before any router registers', function () {
            start({...emptySettings, taxonomies: {tag: '/tag/{slug}/'}});

            assert.equal(resetCount, 1);
            // The sitemap empties its recorded entries on RoutesReset and
            // refills them from the registrations that follow; a router
            // registering before the reset would be dropped.
            assert.deepEqual([...new Set(resetsBeforeEachRegistration)], [1]);
        });

        it('emits RouteRegistered with the domain path, router type and identifier', function () {
            start({
                ...emptySettings,
                routes: [{path: '/about/', type: 'template', contentType: 'page', templates: ['about']}]
            });

            const event = eventFor('StaticRoutesRouter');

            assert.equal(event.path, '/about/', 'carries the domain path, not an absolute URL');
            assert.equal(typeof event.id, 'string');
            assert.ok(event.id.length > 0, 'carries the router identifier');
        });

        it('emits a null path for routers that have no index route', function () {
            start({...emptySettings, taxonomies: {tag: '/tag/{slug}/'}});

            // StaticPagesRouter has no route at all and the taxonomy router has
            // no index route (/tag/ does not exist), so neither can report a path.
            for (const type of ['StaticPagesRouter', 'Taxonomy']) {
                assert.equal(eventFor(type).path, null, type);
            }
        });

        it('carries data only — never an Express router instance', function () {
            start({
                ...emptySettings,
                collections: [{path: '/', permalink: '/{slug}/', templates: [], data: {}}]
            });

            assert.ok(registered.length > 0, 'sanity: routers registered');
            for (const event of registered) {
                assert.deepEqual(Object.keys(event).sort(), ['id', 'path', 'type'], event.type);
                assert.ok(event.path === null || typeof event.path === 'string', event.type);
            }
        });
    });
});
