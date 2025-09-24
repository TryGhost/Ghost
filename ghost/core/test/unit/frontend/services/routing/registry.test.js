const should = require('should');
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
            should.not.exist(registry.getRssUrl());
        });

        it('single collection, no index collection', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns('/podcast/rss/')
            });

            registry.getRssUrl().should.eql('/podcast/rss/');
        });

        it('single collection, no index collection, rss disabled', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sinon.stub().returns(null)
            });

            should.not.exist(registry.getRssUrl());
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

            registry.getRssUrl().should.eql('/rss/');
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

            // Should return the first collection's RSS URL
            registry.getRssUrl().should.eql('/blog/rss/');
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

            // Should return the podcast RSS URL since blog has RSS disabled
            registry.getRssUrl().should.eql('/podcast/rss/');
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

            // Should return null if all collections have RSS disabled
            should.not.exist(registry.getRssUrl());
        });
    });
});
