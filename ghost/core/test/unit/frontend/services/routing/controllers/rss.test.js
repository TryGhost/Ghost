const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const security = require('@tryghost/security');
const settingsCache = require('../../../../../../core/shared/settings-cache');
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const dataService = require('../../../../../../core/frontend/services/data');
const rssService = require('../../../../../../core/frontend/services/rss');

// Helper function to prevent unit tests
// from failing via timeout when they
// should just immediately fail
function failTest(done) {
    return function (err) {
        done(err);
    };
}

describe('Unit - services/routing/controllers/rss', function () {
    let req;
    let res;
    let fetchDataStub;
    let posts;

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

        fetchDataStub = sinon.stub();

        sinon.stub(dataService, 'fetchData').get(function () {
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

        rssService.render.callsFake(function (_res, baseUrl, data) {
            baseUrl.should.eql('/rss/');
            data.posts.should.eql(posts);
            data.title.should.eql('Ghost');
            data.description.should.eql('Ghost is cool!');
            done();
        });

        controllers.rss(req, res, failTest(done));
    });
});
