const assert = require('node:assert/strict');
const sinon = require('sinon');
const registry = require('../../../../../core/frontend/services/routing/registry');

describe('UNIT: services/routing/registry', function () {
    beforeEach(function () {
        registry.clearAllRouters();
        registry.resetAllRoutes();
    });

    afterEach(function () {
        registry.clearAllRouters();
        registry.resetAllRoutes();
        sinon.restore();
    });

    describe('fn: getRssUrl', function () {
        it('no url available', function () {
            assert.equal(registry.getRssUrl(), null);
        });

        it('single collection, no index collection', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns('/podcast/rss/')
            });

            assert.equal(registry.getRssUrl(), '/podcast/rss/');
        });

        it('single collection, no index collection, rss disabled', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns(null)
            });

            assert.equal(registry.getRssUrl(), null);
        });

        it('index collection', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns('/podcast/rss/')
            });

            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'index',
                getRssUrl: sinon.stub().returns('/rss/')
            });

            assert.equal(registry.getRssUrl(), '/rss/');
        });

        it('multiple collections without index collection', function () {
            registry.setRouter('CollectionRouter-blog', {
                name: 'CollectionRouter',
                routerName: 'blog',
                getRssUrl: sinon.stub().returns('/blog/rss/')
            });

            registry.setRouter('CollectionRouter-podcast', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns('/podcast/rss/')
            });

            assert.equal(registry.getRssUrl(), '/blog/rss/');
        });

        it('multiple collections without index, first has RSS disabled', function () {
            registry.setRouter('CollectionRouter-blog', {
                name: 'CollectionRouter',
                routerName: 'blog',
                getRssUrl: sinon.stub().returns(null)
            });

            registry.setRouter('CollectionRouter-podcast', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns('/podcast/rss/')
            });

            assert.equal(registry.getRssUrl(), '/podcast/rss/');
        });

        it('multiple collections without index, all have RSS disabled', function () {
            registry.setRouter('CollectionRouter-blog', {
                name: 'CollectionRouter',
                routerName: 'blog',
                getRssUrl: sinon.stub().returns(null)
            });

            registry.setRouter('CollectionRouter-podcast', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns(null)
            });

            assert.equal(registry.getRssUrl(), null);
        });
    });

    describe('class shape', function () {
        it('is exported as a Registry class instance, not a bare object literal', function () {
            assert.equal(registry.constructor.name, 'Registry');
        });

        it('is a singleton — repeated requires share one instance', function () {
            const again = require('../../../../../core/frontend/services/routing/registry');
            assert.equal(again, registry);
        });
    });

    describe('fn: routes', function () {
        it('records routes with their originating router name', function () {
            registry.setRoute('CollectionRouter', '/');
            registry.setRoute('StaticRoutesRouter', '/about/');

            assert.deepEqual(registry.getAllRoutes(), [
                {route: '/', from: 'CollectionRouter'},
                {route: '/about/', from: 'StaticRoutesRouter'}
            ]);
        });

        it('getAllRoutes returns a defensive copy', function () {
            registry.setRoute('CollectionRouter', '/');

            const first = registry.getAllRoutes();
            first.push({route: '/injected/', from: 'x'});

            assert.equal(registry.getAllRoutes().length, 1);
        });

        it('resetAllRoutes empties the routes', function () {
            registry.setRoute('CollectionRouter', '/');
            registry.resetAllRoutes();

            assert.deepEqual(registry.getAllRoutes(), []);
        });
    });

    describe('fn: routers', function () {
        it('sets and gets a router by key', function () {
            const router = {name: 'CollectionRouter'};
            registry.setRouter('collectionRouter', router);

            assert.equal(registry.getRouter('collectionRouter'), router);
        });

        it('getRouterByName finds a router by its internal name', function () {
            const router = {name: 'CollectionRouter'};
            registry.setRouter('collectionRouter', router);

            assert.equal(registry.getRouterByName('CollectionRouter'), router);
        });

        it('getRouterByName returns undefined when no router matches', function () {
            assert.equal(registry.getRouterByName('Nope'), undefined);
        });

        it('resetAllRouters calls reset() on routers that support it and clears them', function () {
            const resettable = {name: 'A', reset: sinon.stub()};
            const plain = {name: 'B'};
            registry.setRouter('a', resettable);
            registry.setRouter('b', plain);

            registry.resetAllRouters();

            assert.equal(resettable.reset.calledOnce, true);
            assert.equal(registry.getRouter('a'), undefined);
            assert.equal(registry.getRouter('b'), undefined);
        });

        it('clearAllRouters drops all routers without calling reset()', function () {
            const resettable = {name: 'A', reset: sinon.stub()};
            registry.setRouter('a', resettable);

            registry.clearAllRouters();

            assert.equal(resettable.reset.called, false);
            assert.equal(registry.getRouter('a'), undefined);
        });
    });
});
