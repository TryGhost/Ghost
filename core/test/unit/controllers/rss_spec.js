var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    channelUtils = require('../../utils/channelUtils'),
    settingsCache = require('../../../server/settings/cache'),
    rssController = rewire('../../../server/controllers/rss'),
    rssService = require('../../../server/services/rss'),

    sandbox = sinon.sandbox.create();

// Helper function to prevent unit tests
// from failing via timeout when they
// should just immediately fail
function failTest(done) {
    return function (err) {
        done(err);
    };
}

describe('RSS', function () {
    describe('RSS: Controller only', function () {
        var req, res, next, getDataStub, fakeData, resetGetData, rssServiceStub;

        beforeEach(function () {
            // Minimum setup of req and res
            req = {
                params: {},
                originalUrl: '/rss/'
            };

            res = {
                locals: {
                    safeVersion: '0.6',
                    channel: {postOptions: {}}
                }
            };

            next = sandbox.stub();

            // Overwrite getData
            fakeData = {meta: {pagination: {pages: 3}}};
            getDataStub = sandbox.stub().returns(new Promise.resolve(fakeData));

            resetGetData = rssController.__set__('getData', getDataStub);

            rssServiceStub = sandbox.stub(rssService, 'render').returns(new Promise.resolve());
        });

        afterEach(function () {
            sandbox.restore();
            resetGetData();
        });

        it('should fetch data and attempt to send XML', function (done) {
            rssController(req, res, next)
                .then(function () {
                    next.called.should.be.false();

                    getDataStub.calledOnce.should.be.true();
                    getDataStub.calledWith(res.locals.channel).should.be.true();

                    rssServiceStub.calledOnce.should.be.true();
                    rssServiceStub.firstCall.args[0].should.eql(res);
                    rssServiceStub.firstCall.args[1].should.eql('/rss/');
                    rssServiceStub.firstCall.args[2].should.match(fakeData);
                    done();
                })
                .catch(done);
        });

        it('can handle paginated urls', function (done) {
            req.originalUrl = '/rss/2/';
            req.params.page = 2;

            rssController(req, res, next)
                .then(function () {
                    next.called.should.be.false();

                    getDataStub.calledOnce.should.be.true();
                    getDataStub.calledWith(res.locals.channel).should.be.true();

                    rssServiceStub.calledOnce.should.be.true();
                    rssServiceStub.firstCall.args[0].should.eql(res);
                    rssServiceStub.firstCall.args[1].should.eql('/rss/');
                    rssServiceStub.firstCall.args[2].should.match(fakeData);
                    done();
                })
                .catch(done);
        });

        it('can handle paginated urls with subdirectories', function (done) {
            req.originalUrl = '/blog/rss/2/';
            req.params.page = 2;

            rssController(req, res, next)
                .then(function () {
                    next.called.should.be.false();

                    getDataStub.calledOnce.should.be.true();
                    getDataStub.calledWith(res.locals.channel).should.be.true();

                    rssServiceStub.calledOnce.should.be.true();
                    rssServiceStub.firstCall.args[0].should.eql(res);
                    rssServiceStub.firstCall.args[1].should.eql('/blog/rss/');
                    rssServiceStub.firstCall.args[2].should.match(fakeData);
                    done();
                })
                .catch(done);
        });

        it('can handle paginated urls for channels', function (done) {
            req.originalUrl = '/tags/test/rss/2/';
            req.params.page = 2;
            req.params.slug = 'test';

            rssController(req, res, next)
                .then(function () {
                    next.called.should.be.false();

                    getDataStub.calledOnce.should.be.true();
                    getDataStub.calledWith(res.locals.channel).should.be.true();

                    rssServiceStub.calledOnce.should.be.true();
                    rssServiceStub.firstCall.args[0].should.eql(res);
                    rssServiceStub.firstCall.args[1].should.eql('/tags/test/rss/');
                    rssServiceStub.firstCall.args[2].should.match(fakeData);
                    done();
                })
                .catch(done);
        });

        it('should call next with 404 if page number too big', function (done) {
            req.originalUrl = '/rss/4/';
            req.params.page = 4;

            rssController(req, res, next)
                .then(function () {
                    next.called.should.be.true();
                    next.firstCall.args[0].statusCode.should.eql(404);

                    getDataStub.calledOnce.should.be.true();
                    getDataStub.calledWith(res.locals.channel).should.be.true();

                    rssServiceStub.called.should.be.false();
                    done();
                })
                .catch(done);
        });
    });

    // These tests check the RSS feed from controller to result
    // @TODO: test only the data generation, once we've refactored to make that easier
    describe('RSS: getData / getTitle', function () {
        var fetchDataStub, resetFetchData, getData;

        beforeEach(function () {
            fetchDataStub = sandbox.stub();
            resetFetchData = rssController.__set__('fetchData', fetchDataStub);
            getData = rssController.__get__('getData');

            sandbox.stub(settingsCache, 'get', function (key) {
                var obj = {
                    title: 'Test',
                    description: 'Some Text'
                };

                return obj[key];
            });
        });

        afterEach(function () {
            sandbox.restore();
            resetFetchData();
        });

        it('should process the data correctly for the index feed', function (done) {
            fetchDataStub.returns(new Promise.resolve({posts: [{test: 'hey'}], meta: {foo: 'you'}}));

            var channel = channelUtils.getTestChannel('index');

            getData(channel)
                .then(function (result) {
                    fetchDataStub.calledOnce.should.be.true();
                    fetchDataStub.calledWith(channel).should.be.true();

                    result.should.eql({
                        title: 'Test',
                        description: 'Some Text',
                        posts: [{test: 'hey'}],
                        meta: {foo: 'you'}
                    });
                    done();
                })
                .catch(done);
        });

        it('should process the data correctly for a tag feed', function (done) {
            fetchDataStub.returns(new Promise.resolve({posts: [{test: 'hey'}], meta: {foo: 'you'}}));

            var channel = channelUtils.getTestChannel('tag');

            getData(channel)
                .then(function (result) {
                    fetchDataStub.calledOnce.should.be.true();
                    fetchDataStub.calledWith(channel).should.be.true();

                    result.should.eql({
                        title: 'Test',
                        description: 'Some Text',
                        posts: [{test: 'hey'}],
                        meta: {foo: 'you'}
                    });
                    done();
                })
                .catch(done);
        });

        it('should process the data correctly for a tag feed WITH related data', function (done) {
            fetchDataStub.returns(new Promise.resolve({
                posts: [{test: 'hey'}],
                meta: {foo: 'you'},
                data: {tag: [{name: 'there'}]}
            }));

            var channel = channelUtils.getTestChannel('tag');

            getData(channel)
                .then(function (result) {
                    fetchDataStub.calledOnce.should.be.true();
                    fetchDataStub.calledWith(channel).should.be.true();

                    result.should.eql({
                        title: 'there - Test',
                        description: 'Some Text',
                        posts: [{test: 'hey'}],
                        meta: {foo: 'you'}
                    });
                    done();
                })
                .catch(done);
        });

        it('should process the data correctly for an author feed', function (done) {
            fetchDataStub.returns(new Promise.resolve({posts: [{test: 'hey'}], meta: {foo: 'you'}}));

            var channel = channelUtils.getTestChannel('author');

            getData(channel)
                .then(function (result) {
                    fetchDataStub.calledOnce.should.be.true();
                    fetchDataStub.calledWith(channel).should.be.true();

                    result.should.eql({
                        title: 'Test',
                        description: 'Some Text',
                        posts: [{test: 'hey'}],
                        meta: {foo: 'you'}
                    });
                    done();
                })
                .catch(done);
        });

        it('should process the data correctly for an author feed WITH related data', function (done) {
            fetchDataStub.returns(new Promise.resolve({
                posts: [{test: 'hey'}],
                meta: {foo: 'you'},
                data: {author: [{name: 'there'}]}
            }));

            var channel = channelUtils.getTestChannel('author');

            getData(channel)
                .then(function (result) {
                    fetchDataStub.calledOnce.should.be.true();
                    fetchDataStub.calledWith(channel).should.be.true();

                    result.should.eql({
                        title: 'there - Test',
                        description: 'Some Text',
                        posts: [{test: 'hey'}],
                        meta: {foo: 'you'}
                    });
                    done();
                })
                .catch(done);
        });
    });
});
