const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/configUtils');
const urlUtils = require('../../../../../../core/shared/url-utils');
const routerManager = require('../../../../../../core/frontend/services/routing/').routerManager;
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const dataService = require('../../../../../../core/frontend/services/data');
const EDITOR_URL = `/#/editor/post/`;

describe('Unit - services/routing/controllers/entry', function () {
    let req;
    let res;
    let entryLookUpStub;
    let renderStub;
    let post;

    beforeEach(function () {
        post = testUtils.DataGenerator.forKnex.createPost();
        post.url = '/does-exist/';

        entryLookUpStub = sinon.stub();
        renderStub = sinon.stub();

        sinon.stub(dataService, 'entryLookup').get(function () {
            return entryLookUpStub;
        });

        sinon.stub(renderer, 'renderEntry').get(function () {
            return renderStub;
        });

        sinon.stub(urlUtils, 'redirectToAdmin');
        sinon.stub(urlUtils, 'redirect301');
        sinon.stub(routerManager, 'getResourceById');

        req = {
            path: '/',
            params: {},
            route: {}
        };

        res = {
            routerOptions: {
                resourceType: 'posts'
            },
            render: sinon.spy(),
            redirect: sinon.spy(),
            locals: {}
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('resource not found', function (done) {
        req.path = '/does-not-exist/';

        entryLookUpStub.withArgs(req.path, res.routerOptions)
            .resolves(null);

        controllers.entry(req, res, function (err) {
            should.not.exist(err);
            done();
        });
    });

    it('resource found', function (done) {
        req.path = post.url;
        req.originalUrl = req.path;

        res.routerOptions.resourceType = 'posts';

        routerManager.getResourceById.withArgs(post.id).returns({
            config: {
                type: 'posts'
            }
        });

        entryLookUpStub.withArgs(req.path, res.routerOptions)
            .resolves({
                entry: post
            });

        controllers.entry(req, res, function () {
            done();
        }).catch(done);
    });

    describe('[edge cases] resource found', function () {
        it('isUnknownOption: true', function (done) {
            req.path = post.url;

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    isUnknownOption: true,
                    entry: post
                });

            controllers.entry(req, res, function (err) {
                should.not.exist(err);
                done();
            });
        });

        it('isEditURL: true', function (done) {
            req.path = post.url;

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    isEditURL: true,
                    entry: post
                });

            urlUtils.redirectToAdmin.callsFake(function (statusCode, _res, editorUrl) {
                statusCode.should.eql(302);
                editorUrl.should.eql(EDITOR_URL + post.id);
                done();
            });

            controllers.entry(req, res, (err) => {
                done(err);
            });
        });

        it('isEditURL: true with admin redirects disabled', function (done) {
            configUtils.set('admin:redirects', false);

            req.path = post.url;

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    isEditURL: true,
                    entry: post
                });

            urlUtils.redirectToAdmin.callsFake(async function () {
                await configUtils.restore();
                done(new Error('redirectToAdmin was called'));
            });

            controllers.entry(req, res, async (err) => {
                await configUtils.restore();
                urlUtils.redirectToAdmin.called.should.eql(false);
                should.not.exist(err);
                done(err);
            });
        });

        it('type of router !== type of resource', function (done) {
            req.path = post.url;
            res.routerOptions.resourceType = 'posts';

            routerManager.getResourceById.withArgs(post.id).returns({
                config: {
                    type: 'pages'
                }
            });

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    entry: post
                });

            controllers.entry(req, res, function (err) {
                should.not.exist(err);
                done();
            });
        });

        it('requested url !== resource url', function (done) {
            post.url = '/2017/08' + post.url;
            req.path = '/2017/07' + post.url;
            req.originalUrl = req.path;

            res.routerOptions.resourceType = 'posts';

            routerManager.getResourceById.withArgs(post.id).returns({
                config: {
                    type: 'posts'
                }
            });

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    entry: post
                });

            urlUtils.redirect301.callsFake(function (_res, postUrl) {
                postUrl.should.eql(post.url);
                done();
            });

            controllers.entry(req, res, function (err) {
                should.exist(err);
                done(err);
            });
        });

        it('requested url !== resource url: with query params', function (done) {
            post.url = '/2017/08' + post.url;
            req.path = '/2017/07' + post.url;
            req.originalUrl = req.path + '?query=true';

            res.routerOptions.resourceType = 'posts';

            routerManager.getResourceById.withArgs(post.id).returns({
                config: {
                    type: 'posts'
                }
            });

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    entry: post
                });

            urlUtils.redirect301.callsFake(function (_res, postUrl) {
                postUrl.should.eql(post.url + '?query=true');
                done();
            });

            controllers.entry(req, res, function (err) {
                done(err);
            });
        });
    });
});
