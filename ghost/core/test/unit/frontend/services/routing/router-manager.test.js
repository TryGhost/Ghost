const assert = require('node:assert/strict');
const sinon = require('sinon');

const RouterManager = require('../../../../../core/frontend/services/routing/router-manager');
const registry = require('../../../../../core/frontend/services/routing/registry');

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
});
