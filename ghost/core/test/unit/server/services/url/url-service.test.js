const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const UrlService = require('../../../../../core/server/services/url/url-service');

describe('Unit: services/url/UrlService', function () {
    let urlService;

    beforeEach(function () {
        urlService = new UrlService();
        sinon.stub(urlService.urls, 'getByResourceId');
        sinon.stub(urlService.urls, 'getByUrl');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('instantiate', function () {
        assertExists(urlService.utils);
        assertExists(urlService.urls);
        assertExists(urlService.resources);
        assertExists(urlService.queue);

        assert.deepEqual(urlService.urlGenerators, []);
        assert.equal(urlService.hasFinished(), false);
        assert.equal(typeof urlService._onQueueStartedListener, 'function');
        assert.equal(typeof urlService._onQueueEndedListener, 'function');
    });

    it('fn: _onQueueStarted', function () {
        urlService._onQueueStarted('init');
        assert.equal(urlService.hasFinished(), false);
    });

    it('fn: _onQueueEnded', function () {
        urlService._onQueueEnded('init');
        assert.equal(urlService.hasFinished(), true);
    });

    it('fn: onRouterAddedType', function () {
        urlService.onRouterAddedType({getPermalinks: sinon.stub().returns({})});
        assert.equal(urlService.urlGenerators.length, 1);
    });

    it('fn: getResourceById', function () {
        urlService.urls.getByResourceId.withArgs('id123').returns({resource: true});
        assert.equal(urlService.getResourceById('id123'), true);

        urlService.urls.getByResourceId.withArgs('id12345').returns(null);

        assert.throws(() => {
            urlService.getResourceById('id12345');
        }, {
            code: 'URLSERVICE_RESOURCE_NOT_FOUND'
        });
    });

    describe('fn: getResource', function () {
        it('no resource for url found (throws GhostError)', function () {
            urlService.finished = false;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([]);

            try {
                urlService.getResource('/blog-post/');
                throw new Error('Expected error.');
            } catch (err) {
                assert.equal(errors.utils.isGhostError(err), true);
            }
        });

        it('no resource for url found', function () {
            urlService.finished = true;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([]);
            assert.equal(urlService.getResource('/blog-post/'), null);
        });

        it('one resource for url found', function () {
            const resource = {x: 'y'};

            urlService.finished = true;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([{resource: resource}]);
            assert.equal(urlService.getResource('/blog-post/'), resource);
        });

        it('two resources for url found', function () {
            const object1 = {generatorId: 1, resource: {a: 1}};
            const object2 = {generatorId: 0, resource: {a: 2}};

            urlService.urlGenerators = [
                {
                    uid: 0
                },
                {
                    uid: 1
                }
            ];

            urlService.finished = true;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([object1, object2]);
            assert.equal(urlService.getResource('/blog-post/'), object2.resource);
        });

        it('two resources for url found (reverse registration order)', function () {
            const object1 = {generatorId: 0, resource: {a: 1}};
            const object2 = {generatorId: 1, resource: {a: 2}};

            urlService.urlGenerators = [
                {
                    uid: 0
                },
                {
                    uid: 1
                }
            ];

            urlService.finished = true;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([object1, object2]);
            assert.equal(urlService.getResource('/blog-post/'), object1.resource);
        });
    });

    describe('fn: getPermalinkByUrl', function () {
        it('found (primary_tag)', function () {
            urlService.urlGenerators = [
                {
                    uid: 0,
                    permalink: '/:slug/'
                },
                {
                    uid: 1,
                    permalink: '/:primary_tag/'
                }
            ];

            sinon.stub(urlService, 'getResource').withArgs('/blog-post/', {returnEverything: true})
                .returns({generatorId: 1, resource: true});

            assert.equal(urlService.getPermalinkByUrl('/blog-post/'), '/:primary_tag/');
        });

        it('found (slug)', function () {
            urlService.urlGenerators = [
                {
                    uid: 0,
                    permalink: '/:slug/'
                },
                {
                    uid: 1,
                    permalink: '/:primary_tag/'
                }
            ];

            sinon.stub(urlService, 'getResource').withArgs('/blog-post/', {returnEverything: true})
                .returns({generatorId: 0, resource: true});

            assert.equal(urlService.getPermalinkByUrl('/blog-post/'), '/:slug/');
        });
    });

    describe('fn: getUrlByResourceId', function () {
        it('not found', function () {
            urlService.urls.getByResourceId.withArgs(1).returns(null);
            assert.equal(urlService.getUrlByResourceId(1), '/404/');
        });

        it('not found: absolute', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {absolute: true});

            sinon.assert.calledWith(urlService.utils.createUrl, '/404/', true);
        });

        it('found', function () {
            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            assert.equal(urlService.getUrlByResourceId(1), '/post/');
        });

        it('found: absolute', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {absolute: true});
            sinon.assert.calledWith(urlService.utils.createUrl, '/post/', true);
        });

        it('not found: withSubdirectory', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {withSubdirectory: true});
            sinon.assert.calledWith(urlService.utils.createUrl, '/404/', false);
        });

        it('not found: withSubdirectory + absolute', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {withSubdirectory: true, absolute: true});
            sinon.assert.calledWith(urlService.utils.createUrl, '/404/', true);
        });

        it('found: withSubdirectory', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {withSubdirectory: true});
            sinon.assert.calledWith(urlService.utils.createUrl, '/post/', false);
        });

        it('found: withSubdirectory + absolute', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {withSubdirectory: true, absolute: true});
            sinon.assert.calledWith(urlService.utils.createUrl, '/post/', true);
        });
    });
});
