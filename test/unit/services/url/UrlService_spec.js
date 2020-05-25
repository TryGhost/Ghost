const errors = require('@tryghost/errors');
const _ = require('lodash');
const Promise = require('bluebird');
const rewire = require('rewire');
const should = require('should');
const sinon = require('sinon');
const {events} = require('../../../../core/server/lib/common');
const Queue = require('../../../../core/frontend/services/url/Queue');
const Resources = require('../../../../core/frontend/services/url/Resources');
const UrlGenerator = require('../../../../core/frontend/services/url/UrlGenerator');
const Urls = require('../../../../core/frontend/services/url/Urls');
const UrlService = rewire('../../../../core/frontend/services/url/UrlService');

describe('Unit: services/url/UrlService', function () {
    let QueueStub;
    let ResourcesStub;
    let UrlsStub;
    let UrlGeneratorStub;
    let urlService;

    beforeEach(function () {
        QueueStub = sinon.stub();
        QueueStub.returns(sinon.createStubInstance(Queue));

        ResourcesStub = sinon.stub();
        ResourcesStub.returns(sinon.createStubInstance(Resources));

        UrlsStub = sinon.stub();
        UrlsStub.returns(sinon.createStubInstance(Urls));

        UrlGeneratorStub = sinon.stub();
        UrlGeneratorStub.returns(sinon.createStubInstance(UrlGenerator));

        UrlService.__set__('Queue', QueueStub);
        UrlService.__set__('Resources', ResourcesStub);
        UrlService.__set__('Urls', UrlsStub);
        UrlService.__set__('UrlGenerator', UrlGeneratorStub);

        sinon.stub(events, 'on');

        urlService = new UrlService();
    });

    afterEach(function () {
        sinon.restore();
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

        events.on.calledTwice.should.be.true();
        events.on.args[0][0].should.eql('router.created');
        events.on.args[1][0].should.eql('services.themes.api.changed');
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
        urlService._onRouterAddedType({getPermalinks: sinon.stub().returns({})});
        urlService.urlGenerators.length.should.eql(1);
    });

    it('fn: getResourceById', function (done) {
        urlService.urls.getByResourceId.withArgs('id123').returns({resource: true});
        urlService.getResourceById('id123').should.eql(true);

        urlService.urls.getByResourceId.withArgs('id12345').returns(null);

        try {
            urlService.getResourceById('id12345').should.eql(true);
            done(new Error('expected error'));
        } catch (err) {
            should.exist(err);
            err.code.should.eql('URLSERVICE_RESOURCE_NOT_FOUND');
            done();
        }
    });

    describe('fn: getResource', function () {
        it('no resource for url found', function () {
            urlService.finished = false;
            urlService.urls.getByUrl.withArgs('/blog-post/').returns([]);

            try {
                urlService.getResource('/blog-post/');
                throw new Error('Expected error.');
            } catch (err) {
                (err instanceof errors.InternalServerError).should.be.true();
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
            const permalinkStub1 = sinon.stub().returns({
                getValue: sinon.stub().returns('/:slug/')
            });

            const permalinkStub2 = sinon.stub().returns({
                getValue: sinon.stub().returns('/:primary_tag/')
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

            sinon.stub(urlService, 'getResource').withArgs('/blog-post/', {returnEverything: true})
                .returns({generatorId: 1, resource: true});

            urlService.getPermalinkByUrl('/blog-post/').should.eql('/:primary_tag/');
        });

        it('found', function () {
            const permalinkStub1 = sinon.stub().returns({
                getValue: sinon.stub().returns('/:slug/')
            });

            const permalinkStub2 = sinon.stub().returns({
                getValue: sinon.stub().returns('/:primary_tag/')
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

            sinon.stub(urlService, 'getResource').withArgs('/blog-post/', {returnEverything: true})
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
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {absolute: true});

            urlService.utils.createUrl.calledWith('/404/', true, undefined).should.be.true();
        });

        it('found', function () {
            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1).should.eql('/post/');
        });

        it('found: absolute', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {absolute: true});
            urlService.utils.createUrl.calledWith('/post/', true, undefined).should.be.true();
        });

        it('found: absolute + secure', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {absolute: true, secure: true});
            urlService.utils.createUrl.calledWith('/post/', true, true).should.be.true();
        });

        it('not found: withSubdirectory', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {withSubdirectory: true});
            urlService.utils.createUrl.calledWith('/404/', false, undefined).should.be.true();
        });

        it('not found: withSubdirectory + secure', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {withSubdirectory: true, secure: true});
            urlService.utils.createUrl.calledWith('/404/', false, true).should.be.true();
        });

        it('not found: withSubdirectory + secure + absolute', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns(null);
            urlService.getUrlByResourceId(1, {withSubdirectory: true, secure: true, absolute: true});
            urlService.utils.createUrl.calledWith('/404/', true, true).should.be.true();
        });

        it('found: withSubdirectory', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {withSubdirectory: true});
            urlService.utils.createUrl.calledWith('/post/', false, undefined).should.be.true();
        });

        it('found: withSubdirectory + secure', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {withSubdirectory: true, secure: true});
            urlService.utils.createUrl.calledWith('/post/', false, true).should.be.true();
        });

        it('found: withSubdirectory + secure + absolute', function () {
            urlService.utils = sinon.stub();
            urlService.utils.createUrl = sinon.stub();

            urlService.urls.getByResourceId.withArgs(1).returns({url: '/post/'});
            urlService.getUrlByResourceId(1, {withSubdirectory: true, secure: true, absolute: true});
            urlService.utils.createUrl.calledWith('/post/', true, true).should.be.true();
        });
    });
});
