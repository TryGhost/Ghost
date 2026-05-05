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

    describe('lazy mode (lazyUrlService backend)', function () {
        let lazyUrlService;
        let lazyFacade;

        beforeEach(function () {
            lazyUrlService = {
                getUrlForResource: sinon.stub().returns('/lazy/'),
                ownsResource: sinon.stub().returns(true),
                resolveUrl: sinon.stub().resolves({type: 'posts', id: 'p1'}),
                hasFinished: sinon.stub().returns(true),
                onRouterAddedType: sinon.stub(),
                onRouterUpdated: sinon.stub(),
                reset: sinon.stub()
            };
            lazyFacade = new UrlServiceFacade({urlService, lazyUrlService});
        });

        it('isLazy() reports true', function () {
            assert.equal(lazyFacade.isLazy(), true);
        });

        it('routes getUrlForResource through the lazy backend', function () {
            const url = lazyFacade.getUrlForResource({type: 'posts', id: 'a'}, {absolute: true});
            sinon.assert.calledWith(lazyUrlService.getUrlForResource, {type: 'posts', id: 'a'}, {absolute: true});
            sinon.assert.notCalled(urlService.getUrlByResourceId);
            assert.equal(url, '/lazy/');
        });

        it('routes ownsResource through the lazy backend', function () {
            lazyFacade.ownsResource('routerA', {type: 'posts', id: 'a'});
            sinon.assert.calledWith(lazyUrlService.ownsResource, 'routerA', {type: 'posts', id: 'a'});
            sinon.assert.notCalled(urlService.owns);
        });

        it('returns the lazy backend resource directly from resolveUrl', async function () {
            const result = await lazyFacade.resolveUrl('/x/');
            sinon.assert.calledWith(lazyUrlService.resolveUrl, '/x/');
            sinon.assert.notCalled(urlService.getResource);
            assert.deepEqual(result, {type: 'posts', id: 'p1'});
        });

        it('forwards lifecycle hooks to the lazy backend', function () {
            lazyFacade.onRouterAddedType('id', 'filter', 'posts', '/{slug}/');
            lazyFacade.onRouterUpdated('id');
            sinon.assert.calledWith(lazyUrlService.onRouterAddedType, 'id', 'filter', 'posts', '/{slug}/');
            sinon.assert.calledWith(lazyUrlService.onRouterUpdated, 'id');
            sinon.assert.notCalled(urlService.onRouterAddedType);
            sinon.assert.notCalled(urlService.onRouterUpdated);
        });

        it('reset() drops registered router configs on the lazy backend', function () {
            lazyFacade.reset();
            sinon.assert.calledOnce(lazyUrlService.reset);
        });
    });
});
