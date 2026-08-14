const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
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

    describe('getRequiredRelations', function () {
        it('returns [] with no lazy backend (eager touches no resource relations)', function () {
            assert.deepEqual(facade.getRequiredRelations(), []);
        });
    });

    describe('getRequiredFields', function () {
        it('returns [] with no lazy backend (eager looks up by id, reads no fields)', function () {
            assert.deepEqual(facade.getRequiredFields('tags'), []);
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
                getRequiredRelations: sinon.stub().returns(['tags']),
                getRequiredFields: sinon.stub().returns(['visibility']),
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

        it('delegates getRequiredRelations to the lazy backend', function () {
            assert.deepEqual(lazyFacade.getRequiredRelations(), ['tags']);
            sinon.assert.calledOnce(lazyUrlService.getRequiredRelations);
        });

        it('delegates getRequiredFields to the lazy backend', function () {
            assert.deepEqual(lazyFacade.getRequiredFields('tags'), ['visibility']);
            sinon.assert.calledWith(lazyUrlService.getRequiredFields, 'tags');
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

    describe('getRoutableResources', function () {
        const flush = () => new Promise((resolve) => {
            setImmediate(resolve);
        });

        beforeEach(function () {
            urlService.resources = {
                getAllByType: sinon.stub().returns([
                    {data: {id: 'a', slug: 'one'}},
                    {data: {id: 'b', slug: 'two'}}
                ])
            };
        });

        it('returns [] when the eager cache has not initialised the type yet', async function () {
            urlService.resources.getAllByType.returns(undefined);

            assert.deepEqual(await facade.getRoutableResources('posts'), []);
        });

        it('answers from the eager cache with no lazy backend', async function () {
            const rows = await facade.getRoutableResources('posts');

            sinon.assert.calledWith(urlService.resources.getAllByType, 'posts');
            assert.deepEqual(rows, [{id: 'a', slug: 'one'}, {id: 'b', slug: 'two'}]);
        });

        it('routes to the injected fetcher in lazy mode', async function () {
            const fetchRoutableResources = sinon.stub().resolves([{id: 'c'}]);
            const lazyFacade = new UrlServiceFacade({
                urlService,
                lazyUrlService: {},
                fetchRoutableResources
            });

            const rows = await lazyFacade.getRoutableResources('posts', {columns: ['feature_image']});

            sinon.assert.calledWith(fetchRoutableResources, 'posts', {columns: ['feature_image']});
            assert.deepEqual(rows, [{id: 'c'}]);
        });

        it('throws in lazy mode without an injected fetcher rather than answering from eager', async function () {
            const lazyFacade = new UrlServiceFacade({urlService, lazyUrlService: {}});

            await assert.rejects(lazyFacade.getRoutableResources('posts'), /fetchRoutableResources/);
        });

        describe('in compare mode', function () {
            let fetchRoutableResources;
            let compareFacade;

            beforeEach(function () {
                fetchRoutableResources = sinon.stub().resolves([{id: 'a'}, {id: 'b'}]);
                compareFacade = new UrlServiceFacade({
                    urlService,
                    lazyUrlService: {},
                    compare: true,
                    fetchRoutableResources
                });
                sinon.stub(logging, 'error');
            });

            afterEach(function () {
                sinon.restore();
            });

            it('returns the eager rows and stays silent when the id sets match', async function () {
                const rows = await compareFacade.getRoutableResources('posts');
                await flush();

                assert.deepEqual(rows.map(row => row.id), ['a', 'b']);
                sinon.assert.calledOnce(fetchRoutableResources);
                sinon.assert.notCalled(logging.error);
            });

            it('logs a parity mismatch when the id sets diverge, without dumping the rows', async function () {
                fetchRoutableResources.resolves([{id: 'a'}, {id: 'c'}]);

                await compareFacade.getRoutableResources('posts');
                await flush();

                sinon.assert.calledOnce(logging.error);
                const reported = logging.error.firstCall.args[0];
                assert.equal(reported.code, 'LAZY_URL_PARITY_MISMATCH');
                assert.deepEqual(reported.errorDetails.missingFromLazy, ['b']);
                assert.deepEqual(reported.errorDetails.extraInLazy, ['c']);
                assert.equal(reported.errorDetails.eagerCount, 2);
                assert.ok(!JSON.stringify(reported.errorDetails).includes('slug'), 'row bodies must not be logged');
            });

            it('does not stack concurrent comparison walks for the same type', async function () {
                let resolveWalk;
                fetchRoutableResources.onFirstCall().returns(new Promise((resolve) => {
                    resolveWalk = () => resolve([{id: 'a'}, {id: 'b'}]);
                }));

                await compareFacade.getRoutableResources('posts');
                await compareFacade.getRoutableResources('posts');

                sinon.assert.calledOnce(fetchRoutableResources);

                resolveWalk();
                await flush();

                // Once the walk settles, the next call may compare again.
                await compareFacade.getRoutableResources('posts');
                sinon.assert.calledTwice(fetchRoutableResources);
            });

            it('logs instead of throwing when the lazy fetch fails', async function () {
                fetchRoutableResources.rejects(new Error('connection lost'));

                const rows = await compareFacade.getRoutableResources('posts');
                await flush();

                assert.equal(rows.length, 2, 'eager answer unaffected');
                sinon.assert.calledOnce(logging.error);
                assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_COMPARE_ERROR');
            });
        });
    });

    describe('getUrlForResource with skipComparison', function () {
        it('answers from eager without teeing the lazy backend', async function () {
            const lazyUrlService = {getUrlForResource: sinon.stub()};
            const compareFacade = new UrlServiceFacade({urlService, lazyUrlService, compare: true});

            const url = compareFacade.getUrlForResource({id: 'abc', type: 'posts'}, {absolute: true, skipComparison: true});

            assert.equal(url, '/hello-world/');
            await new Promise((resolve) => {
                setImmediate(resolve);
            });
            sinon.assert.notCalled(lazyUrlService.getUrlForResource);
        });
    });

    describe('compare mode (eager authoritative, lazy teed alongside)', function () {
        let lazyUrlService;
        let compareFacade;

        const flush = () => new Promise((resolve) => {
            setImmediate(resolve);
        });

        beforeEach(function () {
            lazyUrlService = {
                getUrlForResource: sinon.stub().returns('/lazy/'),
                ownsResource: sinon.stub().returns(false),
                resolveUrl: sinon.stub().resolves({type: 'posts', id: 'lazy'}),
                hasFinished: sinon.stub().returns(true),
                onRouterAddedType: sinon.stub(),
                onRouterUpdated: sinon.stub(),
                reset: sinon.stub()
            };
            compareFacade = new UrlServiceFacade({urlService, lazyUrlService, compare: true});
            sinon.stub(logging, 'error');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('isComparing() is true and isLazy() is false', function () {
            assert.equal(compareFacade.isComparing(), true);
            assert.equal(compareFacade.isLazy(), false);
        });

        it('getUrlForResource returns the eager answer, not lazy', async function () {
            const url = compareFacade.getUrlForResource({type: 'posts', id: 'a'}, {absolute: true});
            sinon.assert.calledWith(urlService.getUrlByResourceId, 'a', {absolute: true});
            assert.equal(url, '/hello-world/');
            await flush();
            sinon.assert.calledWith(lazyUrlService.getUrlForResource, {type: 'posts', id: 'a'}, {absolute: true});
        });

        it('ownsResource returns the eager answer, not lazy', async function () {
            const owned = compareFacade.ownsResource('routerA', {type: 'posts', id: 'a'});
            sinon.assert.calledWith(urlService.owns, 'routerA', 'a');
            assert.equal(owned, true);
            await flush();
            sinon.assert.calledWith(lazyUrlService.ownsResource, 'routerA', {type: 'posts', id: 'a'});
        });

        it('reports a parity mismatch to logs when the lazy forward URL differs', async function () {
            compareFacade.getUrlForResource({type: 'posts', id: 'a'});
            await flush();
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_PARITY_MISMATCH');
        });

        it('does not report when the lazy forward URL matches', async function () {
            lazyUrlService.getUrlForResource.returns('/hello-world/');
            compareFacade.getUrlForResource({type: 'posts', id: 'a'});
            await flush();
            sinon.assert.notCalled(logging.error);
        });

        it('reports a mismatch when lazy ownership differs', async function () {
            compareFacade.ownsResource('routerA', {type: 'posts', id: 'a'});
            await flush();
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_PARITY_MISMATCH');
        });

        it('swallows a lazy throw, reports it, and still returns the eager answer', async function () {
            lazyUrlService.getUrlForResource.throws(new Error('boom'));
            const url = compareFacade.getUrlForResource({type: 'posts', id: 'a'});
            assert.equal(url, '/hello-world/');
            await flush();
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_COMPARE_ERROR');
        });

        it('keeps the caller context when the lazy throw carries its own errorDetails', async function () {
            // @tryghost/errors copies the wrapped error's enumerable props over
            // the new error, so the thin-resource report's errorDetails would
            // clobber the compare context unless re-merged.
            const thinError = new errors.InternalServerError({
                message: 'Thin resource passed to LazyUrlService.getUrlForResource',
                code: 'LAZY_URL_THIN_RESOURCE',
                errorDetails: {resourceType: 'posts', missing: ['tags']}
            });
            lazyUrlService.getUrlForResource.throws(thinError);
            compareFacade.getUrlForResource({type: 'posts', id: 'a', slug: 'hello'});
            await flush();
            const report = logging.error.firstCall.args[0];
            assert.equal(report.errorDetails.resourceType, 'posts');
            assert.deepEqual(report.errorDetails.missing, ['tags']);
            assert.equal(report.errorDetails.method, 'getUrlForResource');
            assert.match(report.stack, /url-service-facade\.test\.js/);
            assert.deepEqual(report.errorDetails.resourceKeys, ['type', 'id', 'slug']);
        });

        it('replaces the report stack with the caller frames on a lazy throw', async function () {
            lazyUrlService.getUrlForResource.throws(new Error('boom'));
            compareFacade.getUrlForResource({type: 'posts', id: 'a', slug: 'hello'});
            await flush();
            const report = logging.error.firstCall.args[0];
            assert.match(report.stack, /^InternalServerError: Lazy URL service threw during comparison\n/);
            assert.match(report.stack, /url-service-facade\.test\.js/);
            assert.equal(report.errorDetails.caller, undefined);
            assert.deepEqual(report.errorDetails.resourceKeys, ['type', 'id', 'slug']);
        });

        it('replaces the report stack with the caller frames on a forward URL mismatch', async function () {
            compareFacade.getUrlForResource({type: 'posts', id: 'a', slug: 'hello'});
            await flush();
            const report = logging.error.firstCall.args[0];
            assert.match(report.stack, /^InternalServerError: URL service parity mismatch\n/);
            assert.match(report.stack, /url-service-facade\.test\.js/);
            assert.equal(report.errorDetails.caller, undefined);
            assert.deepEqual(report.errorDetails.resourceKeys, ['type', 'id', 'slug']);
        });

        it('replaces the report stack with the caller frames on an ownership mismatch', async function () {
            compareFacade.ownsResource('routerA', {type: 'posts', id: 'a', status: 'published'});
            await flush();
            const report = logging.error.firstCall.args[0];
            assert.match(report.stack, /url-service-facade\.test\.js/);
            assert.equal(report.errorDetails.caller, undefined);
            assert.deepEqual(report.errorDetails.resourceKeys, ['type', 'id', 'status']);
        });

        it('resolveUrl returns the eager answer without awaiting lazy', async function () {
            urlService.getResource.returns({config: {type: 'posts'}, data: {id: 'eager', slug: 's'}});
            lazyUrlService.resolveUrl.resolves({type: 'posts', id: 'lazy', slug: 's'});

            const result = await compareFacade.resolveUrl('/x/');

            assert.deepEqual(result, {type: 'posts', id: 'eager', slug: 's'});
            await flush();
        });

        it('reports a parity mismatch when the lazy resource differs', async function () {
            urlService.getResource.returns({config: {type: 'posts'}, data: {id: 'eager', slug: 's'}});
            lazyUrlService.resolveUrl.resolves({type: 'posts', id: 'eager', slug: 'different'});

            await compareFacade.resolveUrl('/x/');
            await flush();

            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_PARITY_MISMATCH');
        });

        it('does not report when eager and lazy resources are deep equal', async function () {
            urlService.getResource.returns({config: {type: 'posts'}, data: {id: 'eager', slug: 's'}});
            // Same fields, different key order — deep equality must treat as a match.
            lazyUrlService.resolveUrl.resolves({slug: 's', id: 'eager', type: 'posts'});

            await compareFacade.resolveUrl('/x/');
            await flush();

            sinon.assert.notCalled(logging.error);
        });

        it('does not report when both eager and lazy miss (null)', async function () {
            urlService.getResource.returns(null);
            lazyUrlService.resolveUrl.resolves(null);

            const result = await compareFacade.resolveUrl('/missing/');
            await flush();

            assert.equal(result, null);
            sinon.assert.notCalled(logging.error);
        });

        it('swallows a lazy rejection, reports it, and still returns the eager answer', async function () {
            urlService.getResource.returns({config: {type: 'posts'}, data: {id: 'eager', slug: 's'}});
            lazyUrlService.resolveUrl.rejects(new Error('boom'));

            const result = await compareFacade.resolveUrl('/x/');
            await flush();

            assert.deepEqual(result, {type: 'posts', id: 'eager', slug: 's'});
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_COMPARE_ERROR');
        });

        it('hasFinished tracks eager readiness, not the always-ready lazy backend', function () {
            urlService.hasFinished.returns(false);
            assert.equal(compareFacade.hasFinished(), false);
        });

        it('registers routers on both backends', function () {
            compareFacade.onRouterAddedType('id', 'filter', 'posts', '/{slug}/');
            sinon.assert.calledWith(urlService.onRouterAddedType, 'id', 'filter', 'posts', '/{slug}/');
            sinon.assert.calledWith(lazyUrlService.onRouterAddedType, 'id', 'filter', 'posts', '/{slug}/');
        });

        it('still registers on eager and reports when lazy onRouterAddedType throws', function () {
            lazyUrlService.onRouterAddedType.throws(new Error('boom'));
            compareFacade.onRouterAddedType('id', 'filter', 'posts', '/{slug}/');
            sinon.assert.calledWith(urlService.onRouterAddedType, 'id', 'filter', 'posts', '/{slug}/');
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_COMPARE_ERROR');
        });

        it('forwards onRouterUpdated to both backends', function () {
            compareFacade.onRouterUpdated('id');
            sinon.assert.calledWith(urlService.onRouterUpdated, 'id');
            sinon.assert.calledWith(lazyUrlService.onRouterUpdated, 'id');
        });

        it('still updates eager and reports when lazy onRouterUpdated throws', function () {
            lazyUrlService.onRouterUpdated.throws(new Error('boom'));
            compareFacade.onRouterUpdated('id');
            sinon.assert.calledWith(urlService.onRouterUpdated, 'id');
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_COMPARE_ERROR');
        });

        it('reset() clears the lazy backend', function () {
            compareFacade.reset();
            sinon.assert.calledOnce(lazyUrlService.reset);
        });

        it('swallows and reports a lazy reset() throw', function () {
            lazyUrlService.reset.throws(new Error('boom'));
            assert.doesNotThrow(() => compareFacade.reset());
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].code, 'LAZY_URL_COMPARE_ERROR');
        });
    });
});
