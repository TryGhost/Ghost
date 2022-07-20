const should = require('should');
const sinon = require('sinon');
const registry = require('../../../../../core/frontend/services/routing/registry');

describe('UNIT: services/routing/registry', function () {
    let getRssUrlStub;

    beforeEach(function () {
        getRssUrlStub = sinon.stub();
    });

    afterEach(function () {
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
    });
});
