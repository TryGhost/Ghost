const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const security = require('@tryghost/security');
const themeEngine = require('../../../../../../core/frontend/services/theme-engine');
const routerManager = require('../../../../../../core/frontend/services/routing/').routerManager;
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const dataService = require('../../../../../../core/frontend/services/data');

function failTest(done) {
    return function (err) {
        assertExists(err);
        done(err);
    };
}

describe('Unit - services/routing/controllers/collection', function () {
    let req;
    let res;
    let fetchDataStub;
    let renderStub;
    let posts;
    let postsPerPage;
    let ownsStub;

    beforeEach(function () {
        postsPerPage = 5;

        posts = [
            testUtils.DataGenerator.forKnex.createPost()
        ];

        fetchDataStub = sinon.stub();
        renderStub = sinon.stub();

        sinon.stub(dataService, 'fetchData').get(function () {
            return fetchDataStub;
        });

        sinon.stub(security.string, 'safe').returns('safe');

        sinon.stub(themeEngine, 'getActive').returns({
            updateTemplateOptions: sinon.stub(),
            config: function (key) {
                assert.equal(key, 'posts_per_page');
                return postsPerPage;
            }
        });

        sinon.stub(renderer, 'renderEntries').returns(renderStub);

        ownsStub = sinon.stub(routerManager, 'owns');
        ownsStub.withArgs('identifier', posts[0].id).returns(true);

        req = {
            path: '/',
            params: {},
            route: {}
        };

        res = {
            routerOptions: {
                identifier: 'identifier'
            },
            render: sinon.spy(),
            redirect: sinon.spy()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('no params', function (done) {
        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            sinon.assert.calledOnce(themeEngine.getActive);
            sinon.assert.notCalled(security.string.safe);
            sinon.assert.calledOnce(fetchDataStub);
            sinon.assert.calledOnce(ownsStub);
            done();
        }).catch(done);
    });

    it('pass page param', function (done) {
        req.params.page = 2;

        fetchDataStub.withArgs({page: 2, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            sinon.assert.calledOnce(themeEngine.getActive);
            sinon.assert.notCalled(security.string.safe);
            sinon.assert.calledOnce(fetchDataStub);
            sinon.assert.calledOnce(ownsStub);
            done();
        }).catch(done);
    });

    it('update hbs engine: router defines limit', function (done) {
        res.routerOptions.limit = 3;
        req.params.page = 2;

        fetchDataStub.withArgs({page: 2, slug: undefined, limit: 3}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 3
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            sinon.assert.calledOnce(themeEngine.getActive);
            sinon.assert.calledOnce(themeEngine.getActive().updateTemplateOptions.withArgs({data: {config: {posts_per_page: 3}}}));
            sinon.assert.notCalled(security.string.safe);
            sinon.assert.calledOnce(fetchDataStub);
            sinon.assert.calledOnce(ownsStub);
            done();
        }).catch(done);
    });

    it('page param too big', function (done) {
        req.params.page = 6;

        fetchDataStub.withArgs({page: 6, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, function (err) {
            assert.equal((err instanceof errors.NotFoundError), true);

            sinon.assert.calledOnce(themeEngine.getActive);
            sinon.assert.notCalled(security.string.safe);
            sinon.assert.calledOnce(fetchDataStub);
            sinon.assert.notCalled(renderStub);
            sinon.assert.notCalled(ownsStub);
            done();
        });
    });

    it('slug param', function (done) {
        req.params.slug = 'unsafe';

        fetchDataStub.withArgs({page: 1, slug: 'safe', limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            sinon.assert.calledOnce(themeEngine.getActive);
            sinon.assert.calledOnce(security.string.safe);
            sinon.assert.calledOnce(fetchDataStub);
            sinon.assert.calledOnce(ownsStub);
            done();
        }).catch(done);
    });

    it('invalid posts per page', function (done) {
        postsPerPage = -1;

        fetchDataStub.withArgs({page: 1, slug: undefined}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            sinon.assert.calledOnce(themeEngine.getActive);
            sinon.assert.notCalled(security.string.safe);
            sinon.assert.calledOnce(fetchDataStub);
            sinon.assert.calledOnce(ownsStub);
            done();
        }).catch(done);
    });

    it('should verify if post belongs to collection', function (done) {
        posts = [
            testUtils.DataGenerator.forKnex.createPost({url: '/a/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/b/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/c/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/d/'})
        ];

        res.routerOptions.filter = 'featured:true';

        ownsStub.reset();
        ownsStub.withArgs('identifier', posts[0].id).returns(false);
        ownsStub.withArgs('identifier', posts[1].id).returns(true);
        ownsStub.withArgs('identifier', posts[2].id).returns(false);
        ownsStub.withArgs('identifier', posts[3].id).returns(false);

        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                data: {
                    tag: [testUtils.DataGenerator.forKnex.createTag()]
                },
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            sinon.assert.calledOnce(themeEngine.getActive);
            sinon.assert.notCalled(security.string.safe);
            sinon.assert.calledOnce(fetchDataStub);
            sinon.assert.callCount(ownsStub, 4);
            done();
        }).catch(done);
    });
});
