const assert = require('node:assert/strict');
const sinon = require('sinon');
const UrlServiceFacade = require('../../../../../core/server/services/url/url-service-facade');

describe('UrlServiceFacade', function () {
    let urlService;
    let facade;

    beforeEach(function () {
        urlService = {
            getUrlByResourceId: sinon.stub().returns('/hello-world/'),
            owns: sinon.stub().returns(true),
            getResource: sinon.stub(),
            getResourceById: sinon.stub(),
            hasFinished: sinon.stub().returns(true),
            onRouterAddedType: sinon.stub(),
            onRouterUpdated: sinon.stub()
        };
        facade = new UrlServiceFacade({urlService});
    });

    describe('getUrlForResource', function () {
        it('extracts the id from the resource and forwards options', function () {
            const url = facade.getUrlForResource({id: 'abc', type: 'posts'}, {absolute: true});

            sinon.assert.calledWith(urlService.getUrlByResourceId, 'abc', {absolute: true});
            assert.equal(url, '/hello-world/');
        });

        it('forwards an undefined options argument unchanged', function () {
            facade.getUrlForResource({id: 'abc'});

            sinon.assert.calledWith(urlService.getUrlByResourceId, 'abc', undefined);
        });
    });

    describe('ownsResource', function () {
        it('extracts the id from the resource', function () {
            const owned = facade.ownsResource('collectionRouter', {id: 'abc'});

            sinon.assert.calledWith(urlService.owns, 'collectionRouter', 'abc');
            assert.equal(owned, true);
        });
    });

    describe('resolveUrl', function () {
        it('returns null when the underlying lookup misses', async function () {
            urlService.getResource.returns(null);

            const result = await facade.resolveUrl('/missing/');

            assert.equal(result, null);
        });

        it('flattens the legacy {config, data} envelope into a Resource', async function () {
            urlService.getResource.returns({
                config: {type: 'posts'},
                data: {id: 'abc', slug: 'hello-world', title: 'Hello'}
            });

            const result = await facade.resolveUrl('/hello-world/');

            assert.deepEqual(result, {
                type: 'posts',
                id: 'abc',
                slug: 'hello-world',
                title: 'Hello'
            });
        });

        it('returns a promise (the lazy implementation will be async)', function () {
            urlService.getResource.returns(null);
            const result = facade.resolveUrl('/x/');
            assert.ok(result instanceof Promise);
        });
    });

    describe('hasFinished', function () {
        it('delegates to the underlying url service', function () {
            urlService.hasFinished.returns(false);
            assert.equal(facade.hasFinished(), false);
        });
    });

    describe('lifecycle pass-throughs', function () {
        it('forwards onRouterAddedType', function () {
            facade.onRouterAddedType('id', 'filter', 'posts', '/{slug}/');
            sinon.assert.calledWith(urlService.onRouterAddedType, 'id', 'filter', 'posts', '/{slug}/');
        });

        it('forwards onRouterUpdated', function () {
            facade.onRouterUpdated('id');
            sinon.assert.calledWith(urlService.onRouterUpdated, 'id');
        });
    });
});
