const should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    registry = rewire('../../../../server/services/routing/registry'),
    sandbox = sinon.sandbox.create();

describe('UNIT: services/routing/registry', function () {
    let getRssUrlStub;

    beforeEach(function () {
        getRssUrlStub = sandbox.stub();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('fn: getRssUrl', function () {
        it('no url available', function () {
            should.not.exist(registry.getRssUrl());
        });

        it('single collection, no index collection', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sandbox.stub().returns('/podcast/rss/')
            });

            registry.getRssUrl().should.eql('/podcast/rss/');
        });

        it('single collection, no index collection, rss disabled', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sandbox.stub().returns(null)
            });

            should.not.exist(registry.getRssUrl());
        });

        it('index collection', function () {
            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'podcast',
                getRssUrl: sandbox.stub().returns('/podcast/rss/')
            });

            registry.setRouter('CollectionRouter', {
                name: 'CollectionRouter',
                routerName: 'index',
                getRssUrl: sandbox.stub().returns('/rss/')
            });

            registry.getRssUrl().should.eql('/rss/');
        });
    });
});
