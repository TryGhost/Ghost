const should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    testUtils = require('../../../../utils'),
    common = require('../../../../../server/lib/common'),
    security = require('../../../../../server/lib/security'),
    settingsCache = require('../../../../../server/services/settings/cache'),
    controllers = require('../../../../../server/services/routing/controllers'),
    helpers = require('../../../../../server/services/routing/helpers'),
    rssService = require('../../../../../server/services/rss'),
    sandbox = sinon.sandbox.create();

// Helper function to prevent unit tests
// from failing via timeout when they
// should just immediately fail
function failTest(done) {
    return function (err) {
        done(err);
    };
}

describe('Unit - services/routing/controllers/rss', function () {
    let req, res, next, fetchDataStub, posts;

    beforeEach(function () {
        posts = [
            testUtils.DataGenerator.forKnex.createPost(),
            testUtils.DataGenerator.forKnex.createPost()
        ];

        req = {
            params: {},
            originalUrl: '/rss/'
        };

        res = {
            routerOptions: {},
            locals: {
                safeVersion: '0.6'
            }
        };

        next = sandbox.stub();
        fetchDataStub = sandbox.stub();

        sandbox.stub(helpers, 'fetchData').get(function () {
            return fetchDataStub;
        });

        sandbox.stub(security.string, 'safe').returns('safe');

        sandbox.stub(rssService, 'render');

        sandbox.stub(settingsCache, 'get');
        settingsCache.get.withArgs('title').returns('Ghost');
        settingsCache.get.withArgs('description').returns('Ghost is cool!');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should fetch data and attempt to send XML', function (done) {
        fetchDataStub.withArgs({page: 1, slug: undefined}).resolves({
            posts: posts,
            meta: {
                pagination: {
                    pages: 2
                }
            }
        });

        rssService.render.callsFake(function (res, baseUrl, data) {
            baseUrl.should.eql('/rss/');
            data.posts.should.eql(posts);
            data.meta.pagination.pages.should.eql(2);
            data.title.should.eql('Ghost');
            data.description.should.eql('Ghost is cool!');
            done();
        });

        controllers.rss(req, res, failTest(done));
    });

    it('can handle paginated urls', function (done) {
        req.originalUrl = '/rss/2/';
        req.params.page = 2;

        fetchDataStub.withArgs({page: 2, slug: undefined}).resolves({
            posts: posts,
            meta: {
                pagination: {
                    pages: 2
                }
            }
        });

        rssService.render.callsFake(function (res, baseUrl, data) {
            baseUrl.should.eql('/rss/');
            data.posts.should.eql(posts);
            data.meta.pagination.pages.should.eql(2);
            data.title.should.eql('Ghost');
            data.description.should.eql('Ghost is cool!');
            done();
        });

        controllers.rss(req, res, failTest(done));
    });

    it('can handle paginated urls with subdirectories', function (done) {
        req.originalUrl = '/blog/rss/2/';
        req.params.page = 2;

        fetchDataStub.withArgs({page: 2, slug: undefined}).resolves({
            posts: posts,
            meta: {
                pagination: {
                    pages: 2
                }
            }
        });

        rssService.render.callsFake(function (res, baseUrl, data) {
            baseUrl.should.eql('/blog/rss/');
            data.posts.should.eql(posts);
            data.meta.pagination.pages.should.eql(2);
            data.title.should.eql('Ghost');
            data.description.should.eql('Ghost is cool!');
            done();
        });

        controllers.rss(req, res, failTest(done));
    });

    it('can handle paginated urls for taxonomies', function (done) {
        req.originalUrl = '/tags/test/rss/2/';
        req.params.page = 2;
        req.params.slug = 'unsafe';

        fetchDataStub.withArgs({page: 2, slug: 'safe'}).resolves({
            posts: posts,
            meta: {
                pagination: {
                    pages: 3
                }
            }
        });

        rssService.render.callsFake(function (res, baseUrl, data) {
            baseUrl.should.eql('/tags/test/rss/');
            data.posts.should.eql(posts);
            data.meta.pagination.pages.should.eql(3);
            data.title.should.eql('Ghost');
            data.description.should.eql('Ghost is cool!');
            done();
        });

        controllers.rss(req, res, failTest(done));
    });

    it('should call next with 404 if page number too big', function (done) {
        req.originalUrl = '/rss/4/';
        req.params.page = 4;

        fetchDataStub.withArgs({page: 4, slug: undefined}).resolves({
            posts: posts,
            meta: {
                pagination: {
                    pages: 3
                }
            }
        });

        controllers.rss(req, res, function (err) {
            should.exist(err);
            (err instanceof common.errors.NotFoundError).should.be.true();
            rssService.render.called.should.be.false();
            done();
        });
    });
});
