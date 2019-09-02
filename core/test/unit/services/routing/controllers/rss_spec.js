const should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    testUtils = require('../../../../utils'),
    common = require('../../../../../server/lib/common'),
    security = require('../../../../../server/lib/security'),
    settingsCache = require('../../../../../server/services/settings/cache'),
    controllers = require('../../../../../frontend/services/routing/controllers'),
    helpers = require('../../../../../frontend/services/routing/helpers'),
    rssService = require('../../../../../frontend/services/rss');

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

        next = sinon.stub();
        fetchDataStub = sinon.stub();

        sinon.stub(helpers, 'fetchData').get(function () {
            return fetchDataStub;
        });

        sinon.stub(security.string, 'safe').returns('safe');

        sinon.stub(rssService, 'render');

        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('title').returns('Ghost');
        settingsCache.get.withArgs('description').returns('Ghost is cool!');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should fetch data and attempt to send XML', function (done) {
        fetchDataStub.withArgs({page: 1, slug: undefined}).resolves({
            posts: posts
        });

        rssService.render.callsFake(function (res, baseUrl, data) {
            baseUrl.should.eql('/rss/');
            data.posts.should.eql(posts);
            data.title.should.eql('Ghost');
            data.description.should.eql('Ghost is cool!');
            done();
        });

        controllers.rss(req, res, failTest(done));
    });
});
