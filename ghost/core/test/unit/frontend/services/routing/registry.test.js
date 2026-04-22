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
});
