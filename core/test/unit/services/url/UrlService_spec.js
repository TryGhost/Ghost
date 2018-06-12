const _ = require('lodash');
const Promise = require('bluebird');
const rewire = require('rewire');
const should = require('should');
const sinon = require('sinon');
const common = require('../../../../server/lib/common');
const Queue = require('../../../../server/services/url/Queue');
const Resources = require('../../../../server/services/url/Resources');
const UrlGenerator = require('../../../../server/services/url/UrlGenerator');
const Urls = require('../../../../server/services/url/Urls');
const UrlService = rewire('../../../../server/services/url/UrlService');
const sandbox = sinon.sandbox.create();

describe('Unit: services/url/UrlService', function () {
    let QueueStub, ResourcesStub, UrlsStub, UrlGeneratorStub, urlService;

    beforeEach(function () {
        QueueStub = sandbox.stub();
        QueueStub.returns(sandbox.createStubInstance(Queue));

        ResourcesStub = sandbox.stub();
        ResourcesStub.returns(sandbox.createStubInstance(Resources));

        UrlsStub = sandbox.stub();
        UrlsStub.returns(sandbox.createStubInstance(Urls));

        UrlGeneratorStub = sandbox.stub();
        UrlGeneratorStub.returns(sandbox.createStubInstance(UrlGenerator));

        UrlService.__set__('Queue', QueueStub);
        UrlService.__set__('Resources', ResourcesStub);
        UrlService.__set__('Urls', UrlsStub);
        UrlService.__set__('UrlGenerator', UrlGeneratorStub);

        sandbox.stub(common.events, 'on');

        urlService = new UrlService();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('instantiate', function () {
        should.exist(urlService.utils);
        should.exist(urlService.urls);
        should.exist(urlService.resources);
        should.exist(urlService.queue);

        urlService.urlGenerators.should.eql([]);
        urlService.hasFinished().should.be.false();

        urlService.queue.addListener.calledTwice.should.be.true();
        urlService.queue.addListener.args[0][0].should.eql('started');
        urlService.queue.addListener.args[1][0].should.eql('ended');

        common.events.on.calledOnce.should.be.true();
        common.events.on.args[0][0].should.eql('router.created');
    });

    it('fn: _onQueueStarted', function () {
        urlService._onQueueStarted('init');
        urlService.hasFinished().should.be.false();
    });

    it('fn: _onQueueEnded', function () {
        urlService._onQueueEnded('init');
        urlService.hasFinished().should.be.true();
    });

    it('fn: _onRouterAddedType', function () {
        urlService._onRouterAddedType({getPermalinks: sandbox.stub().returns({})});
        urlService.urlGenerators.length.should.eql(1);
    });

    describe('fn: getResource', function () {
        it('no resource for url found', function () {
            urlService.finished = false;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([]);

            try {
                urlService.getResource('/blog-post/');
                throw new Error('Expected error.');
            } catch (err) {
                (err instanceof common.errors.InternalServerError).should.be.true();
            }
        });

        it('no resource for url found', function () {
            urlService.finished = true;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([]);
            should.not.exist(urlService.getResource('/blog-post/'));
        });

        it('one resource for url found', function () {
            const resource = {x: 'y'};

            urlService.finished = true;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([{resource: resource}]);
            urlService.getResource('/blog-post/').should.eql(resource);
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
            urlService.getResource('/blog-post/').should.eql(object2.resource);
        });

        it('two resources for url found', function () {
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
            urlService.getResource('/blog-post/').should.eql(object1.resource);
        });
    });

    describe('fn: getPermalinkByUrl', function () {
        it('found', function () {
            const permalinkStub1 = sandbox.stub().returns({
                getValue: sandbox.stub().returns('/:slug/')
            });

            const permalinkStub2 = sandbox.stub().returns({
                getValue: sandbox.stub().returns('/:primary_tag/')
            });

            urlService.urlGenerators = [
                {
                    uid: 0,
                    router: {
                        getPermalinks: permalinkStub1
                    }
                },
                {
                    uid: 1,
                    router: {
                        getPermalinks: permalinkStub2
                    }
                }
            ];

            sandbox.stub(urlService, 'getResource').withArgs('/blog-post/', {returnEverything: true})
                .returns({generatorId: 1, resource: true});

            urlService.getPermalinkByUrl('/blog-post/').should.eql('/:primary_tag/');
        });

        it('found', function () {
            const permalinkStub1 = sandbox.stub().returns({
                getValue: sandbox.stub().returns('/:slug/')
            });

            const permalinkStub2 = sandbox.stub().returns({
                getValue: sandbox.stub().returns('/:primary_tag/')
            });

            urlService.urlGenerators = [
                {
                    uid: 0,
                    router: {
                        getPermalinks: permalinkStub1
                    }
                },
                {
                    uid: 1,
                    router: {
                        getPermalinks: permalinkStub2
                    }
                }
            ];

            sandbox.stub(urlService, 'getResource').withArgs('/blog-post/', {returnEverything: true})
                .returns({generatorId: 0, resource: true});

            urlService.getPermalinkByUrl('/blog-post/').should.eql('/:slug/');
        });
    });

    describe('fn: getUrlByResourceId', function () {
        it('not found', function () {
            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1).should.eql('/404/');
        });

        it('not found: absolute', function () {
            urlService.utils = sandbox.stub();
            urlService.utils.createUrl = sandbox.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {absolute: true});

            urlService.utils.createUrl.calledWith('/404/', true, undefined).should.be.true();
        });

        it('found', function () {
            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1).should.eql('/post/');
        });

        it('found: absolute', function () {
            urlService.utils = sandbox.stub();
            urlService.utils.createUrl = sandbox.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {absolute: true});
            urlService.utils.createUrl.calledWith('/post/', true, undefined).should.be.true();
        });

        it('found: absolute + secure', function () {
            urlService.utils = sandbox.stub();
            urlService.utils.createUrl = sandbox.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {absolute: true, secure: true});
            urlService.utils.createUrl.calledWith('/post/', true, true).should.be.true();
        });
    });
});
