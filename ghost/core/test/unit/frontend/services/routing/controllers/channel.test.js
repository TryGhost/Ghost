const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const security = require('@tryghost/security');
const themeEngine = require('../../../../../../core/frontend/services/theme-engine');
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const dataService = require('../../../../../../core/frontend/services/data');

describe('Unit - services/routing/controllers/channel', function () {
    let req;
    let res;
    let fetchDataStub;
    let renderStub;
    let posts;
    let postsPerPage;

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

        req = {
            path: '/',
            params: {},
            route: {}
        };

        res = {
            routerOptions: {},
            render: sinon.spy(),
            redirect: sinon.spy()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('no params', async function () {
        let next = sinon.stub();

        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        await controllers.channel(req, res, next);
        sinon.assert.calledOnce(themeEngine.getActive);
        sinon.assert.notCalled(security.string.safe);
        sinon.assert.calledOnce(fetchDataStub);
        sinon.assert.notCalled(next);
    });

    it('pass page param', async function () {
        let next = sinon.stub();
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

        await controllers.channel(req, res, next);
        sinon.assert.calledOnce(themeEngine.getActive);
        sinon.assert.notCalled(security.string.safe);
        sinon.assert.calledOnce(fetchDataStub);
        sinon.assert.notCalled(next);
    });

    it('update hbs engine: router defines limit', async function () {
        let next = sinon.stub();
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

        await controllers.channel(req, res, next);
        sinon.assert.calledOnce(themeEngine.getActive);
        sinon.assert.calledOnce(themeEngine.getActive().updateTemplateOptions.withArgs({data: {config: {posts_per_page: 3}}}));
        sinon.assert.notCalled(security.string.safe);
        sinon.assert.calledOnce(fetchDataStub);
        sinon.assert.notCalled(next);
    });

    it('page param too big', async function () {
        let next = sinon.stub();
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

        await controllers.channel(req, res, next);
        sinon.assert.calledOnce(themeEngine.getActive);
        sinon.assert.notCalled(security.string.safe);
        sinon.assert.calledOnce(fetchDataStub);
        sinon.assert.calledWith(next, sinon.match.instanceOf(errors.NotFoundError));
    });

    it('slug param', async function () {
        let next = sinon.stub();
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

        await controllers.channel(req, res, next);
        sinon.assert.calledOnce(themeEngine.getActive);
        sinon.assert.calledOnce(security.string.safe);
        sinon.assert.calledOnce(fetchDataStub);
        sinon.assert.notCalled(next);
    });

    it('invalid posts per page', async function () {
        let next = sinon.stub();
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

        await controllers.channel(req, res, next);
        sinon.assert.calledOnce(themeEngine.getActive);
        sinon.assert.notCalled(security.string.safe);
        sinon.assert.calledOnce(fetchDataStub);
        sinon.assert.notCalled(next);
    });
});
