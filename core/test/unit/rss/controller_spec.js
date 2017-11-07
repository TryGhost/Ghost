var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    testUtils = require('../../utils'),
    channelUtils = require('../../utils/channelUtils'),
    api = require('../../../server/api'),
    settingsCache = require('../../../server/settings/cache'),
    rssController = rewire('../../../server/data/xml/rss/controller'),
    rssCache = require('../../../server/data/xml/rss/cache'),
    configUtils = require('../../utils/configUtils'),

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
        var req, res, posts, getDataStub, resetGetData, rssCacheStub;

        before(function () {
            posts = _.cloneDeep(testUtils.DataGenerator.forKnex.posts);
            posts = _.filter(posts, function filter(post) {
                return post.status === 'published' && post.page === false;
            });

            _.each(posts, function (post, i) {
                post.id = i;
                post.url = '/' + post.slug + '/';
                post.author = {name: 'Joe Bloggs'};
            });
        });

        beforeEach(function () {
            // Minimum setup of req and res
            req = {
                params: {},
                originalUrl: '/rss/'
            };

            res = {
                locals: {
                    safeVersion: '0.6',
                    channel: channelUtils.getTestChannel('index')
                },
                set: sinon.stub(),
                send: sinon.spy()
            };

            // @TODO Get rid of this! - shouldn't be set on the channel
            res.locals.channel.isRSS = true;

            // Overwrite getData
            getDataStub = sandbox.stub();

            resetGetData = rssController.__set__('getData', getDataStub);

            rssCacheStub = sandbox.stub(rssCache, 'getXML').returns(new Promise.resolve('dummyxml'));
        });

        afterEach(function () {
            sandbox.restore();
            configUtils.restore();
            resetGetData();
        });

        it('should fetch data and attempt to send XML', function (done) {
            getDataStub.returns(new Promise.resolve({
                results: {meta: {pagination: {pages: 3}}}
            }));

            res.send = function (result) {
                result.should.eql('dummyxml');
                res.set.calledOnce.should.be.true();
                res.set.calledWith('Content-Type', 'text/xml; charset=UTF-8').should.be.true();
                getDataStub.calledOnce.should.be.true();
                rssCacheStub.calledOnce.should.be.true();
                rssCacheStub.calledWith('/rss/').should.be.true();
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('can handle paginated urls', function (done) {
            getDataStub.returns(new Promise.resolve({
                results: {meta: {pagination: {pages: 3}}}
            }));

            req.originalUrl = '/rss/2/';
            req.params.page = 2;

            res.send = function (result) {
                result.should.eql('dummyxml');
                res.set.calledOnce.should.be.true();
                res.set.calledWith('Content-Type', 'text/xml; charset=UTF-8').should.be.true();
                getDataStub.calledOnce.should.be.true();
                rssCacheStub.calledOnce.should.be.true();
                rssCacheStub.calledWith('/rss/').should.be.true();
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('can handle paginated urls with subdirectories', function (done) {
            getDataStub.returns(new Promise.resolve({
                results: {meta: {pagination: {pages: 3}}}
            }));

            req.originalUrl = '/blog/rss/2/';
            req.params.page = 2;

            res.send = function (result) {
                result.should.eql('dummyxml');
                res.set.calledOnce.should.be.true();
                res.set.calledWith('Content-Type', 'text/xml; charset=UTF-8').should.be.true();
                getDataStub.calledOnce.should.be.true();
                rssCacheStub.calledOnce.should.be.true();
                rssCacheStub.calledWith('/blog/rss/').should.be.true();
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('can handle paginated urls for channels', function (done) {
            getDataStub.returns(new Promise.resolve({
                results: {meta: {pagination: {pages: 3}}}
            }));

            req.originalUrl = '/tags/test/rss/2/';
            req.params.page = 2;
            req.params.slug = 'test';

            res.send = function (result) {
                result.should.eql('dummyxml');
                res.set.calledOnce.should.be.true();
                res.set.calledWith('Content-Type', 'text/xml; charset=UTF-8').should.be.true();
                getDataStub.calledOnce.should.be.true();
                rssCacheStub.calledOnce.should.be.true();
                rssCacheStub.calledWith('/tags/test/rss/').should.be.true();
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('should call next with 404 if page number too big', function (done) {
            getDataStub.returns(new Promise.resolve({
                results: {meta: {pagination: {pages: 3}}}
            }));

            req.originalUrl = '/rss/4/';
            req.params.page = 4;

            rssController(req, res, function (err) {
                should.exist(err);
                err.statusCode.should.eql(404);
                res.send.called.should.be.false();
                done();
            });
        });
    });

    // These tests check the RSS feed from controller to result
    // @TODO: test only the data generation, once we've refactored to make that easier
    describe('RSS: data generation', function () {
        var apiBrowseStub, apiTagStub, apiUserStub, req, res;

        beforeEach(function () {
            apiBrowseStub = sandbox.stub(api.posts, 'browse', function () {
                return Promise.resolve({posts: [], meta: {pagination: {pages: 3}}});
            });

            apiTagStub = sandbox.stub(api.tags, 'read', function () {
                return Promise.resolve({tags: [{name: 'Magic'}]});
            });

            apiUserStub = sandbox.stub(api.users, 'read', function () {
                return Promise.resolve({users: [{name: 'Joe Blogs'}]});
            });

            req = {
                params: {},
                originalUrl: '/rss/'
            };

            res = {
                locals: {
                    safeVersion: '0.6'
                },
                set: sinon.stub()
            };

            sandbox.stub(settingsCache, 'get', function (key) {
                var obj = {
                    title: 'Test',
                    description: 'Some Text',
                    permalinks: '/:slug/'
                };

                return obj[key];
            });

            configUtils.set({
                url: 'http://my-ghost-blog.com'
            });
        });

        afterEach(function () {
            sandbox.restore();
            configUtils.restore();
        });

        it('should process the data correctly for the index feed', function (done) {
            // setup
            req.originalUrl = '/rss/';
            res.locals.channel = channelUtils.getTestChannel('index');
            res.locals.channel.isRSS = true;

            // test
            res.send = function send(xmlData) {
                apiBrowseStub.calledOnce.should.be.true();
                apiBrowseStub.calledWith({
                    page: 1,
                    include: 'author,tags'
                }).should.be.true();
                apiTagStub.called.should.be.false();
                apiUserStub.called.should.be.false();
                xmlData.should.match(/<channel><title><!\[CDATA\[Test\]\]><\/title>/);
                xmlData.should.match(/<atom:link href="http:\/\/my-ghost-blog.com\/rss\/" rel="self" type="application\/rss\+xml"\/>/);
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('should process the data correctly for the paginated index feed', function (done) {
            // setup
            req.originalUrl = '/rss/2/';
            req.params.page = '2';
            res.locals.channel = channelUtils.getTestChannel('index');
            res.locals.channel.isRSS = true;

            // test
            res.send = function send(xmlData) {
                apiBrowseStub.calledOnce.should.be.true();
                apiBrowseStub.calledWith({
                    page: '2',
                    include: 'author,tags'
                }).should.be.true();

                apiTagStub.called.should.be.false();
                apiUserStub.called.should.be.false();
                xmlData.should.match(/<channel><title><!\[CDATA\[Test\]\]><\/title>/);
                xmlData.should.match(/<atom:link href="http:\/\/my-ghost-blog.com\/rss\/" rel="self" type="application\/rss\+xml"\/>/);
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('should process the data correctly for a tag feed', function (done) {
            // setup
            req.originalUrl = '/tag/magic/rss/';
            req.params.slug = 'magic';
            res.locals.channel = channelUtils.getTestChannel('tag');
            res.locals.channel.isRSS = true;

            // test
            res.send = function send(xmlData) {
                apiBrowseStub.calledOnce.should.be.true();
                apiBrowseStub.calledWith({
                    page: 1,
                    filter: 'tags:\'magic\'+tags.visibility:public',
                    include: 'author,tags'
                }).should.be.true();
                apiTagStub.calledOnce.should.be.true();
                xmlData.should.match(/<channel><title><!\[CDATA\[Magic - Test\]\]><\/title>/);
                xmlData.should.match(/<atom:link href="http:\/\/my-ghost-blog.com\/tag\/magic\/rss\/" rel="self" type="application\/rss\+xml"\/>/);
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('should process the data correctly for a paginated tag feed', function (done) {
            // setup
            req.originalUrl = '/tag/magic/rss/2/';
            req.params.slug = 'magic';
            req.params.page = '2';
            res.locals.channel = channelUtils.getTestChannel('tag');
            res.locals.channel.isRSS = true;

            // test
            res.send = function send(xmlData) {
                apiBrowseStub.calledOnce.should.be.true();
                apiBrowseStub.calledWith({
                    page: '2',
                    filter: 'tags:\'magic\'+tags.visibility:public',
                    include: 'author,tags'
                }).should.be.true();

                apiTagStub.calledOnce.should.be.true();
                xmlData.should.match(/<channel><title><!\[CDATA\[Magic - Test\]\]><\/title>/);
                xmlData.should.match(/<atom:link href="http:\/\/my-ghost-blog.com\/tag\/magic\/rss\/" rel="self" type="application\/rss\+xml"\/>/);
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('should process the data correctly for an author feed', function (done) {
            req.originalUrl = '/author/joe/rss/';
            req.params.slug = 'joe';
            res.locals.channel = channelUtils.getTestChannel('author');
            res.locals.channel.isRSS = true;

            // test
            res.send = function send(xmlData) {
                apiBrowseStub.calledOnce.should.be.true();
                apiBrowseStub.calledWith({page: 1, filter: 'author:\'joe\'', include: 'author,tags'}).should.be.true();
                apiUserStub.calledOnce.should.be.true();
                xmlData.should.match(/<channel><title><!\[CDATA\[Joe Blogs - Test\]\]><\/title>/);
                xmlData.should.match(/<atom:link href="http:\/\/my-ghost-blog.com\/author\/joe\/rss\/" rel="self" type="application\/rss\+xml"\/>/);
                done();
            };

            rssController(req, res, failTest(done));
        });

        it('should process the data correctly for a paginated author feed', function (done) {
            req.originalUrl = '/author/joe/rss/2/';
            req.params.slug = 'joe';
            req.params.page = '2';
            res.locals.channel = channelUtils.getTestChannel('author');
            res.locals.channel.isRSS = true;

            // test
            res.send = function send(xmlData) {
                apiBrowseStub.calledOnce.should.be.true();
                apiBrowseStub.calledWith({page: '2', filter: 'author:\'joe\'', include: 'author,tags'}).should.be.true();
                apiUserStub.calledOnce.should.be.true();
                xmlData.should.match(/<channel><title><!\[CDATA\[Joe Blogs - Test\]\]><\/title>/);
                xmlData.should.match(/<atom:link href="http:\/\/my-ghost-blog.com\/author\/joe\/rss\/" rel="self" type="application\/rss\+xml"\/>/);
                done();
            };

            rssController(req, res, failTest(done));
        });
    });
});
