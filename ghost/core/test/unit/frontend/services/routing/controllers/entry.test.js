const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/config-utils');
const deferred = require('../../../../../utils/deferred');
const urlUtils = require('../../../../../../core/shared/url-utils');
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const dataService = require('../../../../../../core/frontend/services/data');
const EDITOR_URL = `/#/editor/post/`;

describe('Unit - services/routing/controllers/entry', function () {
    let req;
    let res;
    let entryLookUpStub;
    let renderStub;
    let urlUtilsRedirect301Stub;
    let urlUtilsRedirectToAdminStub;
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

        urlUtilsRedirectToAdminStub = sinon.stub(urlUtils, 'redirectToAdmin');
        urlUtilsRedirect301Stub = sinon.stub(urlUtils, 'redirect301');

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

    it('resource not found', function () {
        const {promise, done} = deferred();
        req.path = '/does-not-exist/';

        entryLookUpStub.withArgs(req.path, res.routerOptions)
            .resolves(null);

        controllers.entry(req, res, function (err) {
            assert.equal(err, undefined);
            done();
        });
        return promise;
    });

    it('resource found', function () {
        const {promise, done} = deferred();
        req.path = post.url;
        req.originalUrl = req.path;

        res.routerOptions.resourceType = 'posts';

        entryLookUpStub.withArgs(req.path, res.routerOptions)
            .resolves({
                entry: post
            });

        controllers.entry(req, res, function () {
            done();
        }).catch(done);
        return promise;
    });

    describe('[edge cases] resource found', function () {
        it('isUnknownOption: true', function () {
            const {promise, done} = deferred();
            req.path = post.url;

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    isUnknownOption: true,
                    entry: post
                });

            controllers.entry(req, res, function (err) {
                assert.equal(err, undefined);
                done();
            });
            return promise;
        });

        it('isEditURL: true', function () {
            const {promise, done} = deferred();
            req.path = post.url;

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    isEditURL: true,
                    entry: post
                });

            urlUtilsRedirectToAdminStub.callsFake(function (statusCode, _res, editorUrl) {
                assert.equal(statusCode, 302);
                assert.equal(editorUrl, EDITOR_URL + post.id);
                done();
            });

            controllers.entry(req, res, (err) => {
                done(err);
            });
            return promise;
        });

        it('isEditURL: true with admin redirects disabled', function () {
            const {promise, done} = deferred();
            configUtils.set('admin:redirects', false);

            req.path = post.url;

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    isEditURL: true,
                    entry: post
                });

            urlUtilsRedirectToAdminStub.callsFake(async function () {
                await configUtils.restore();
                done(new Error('redirectToAdmin was called'));
            });

            controllers.entry(req, res, async (err) => {
                await configUtils.restore();
                sinon.assert.notCalled(urlUtilsRedirectToAdminStub);
                assert.equal(err, undefined);
                done(err);
            });
            return promise;
        });

        it('requested url !== resource url', function () {
            const {promise, done} = deferred();
            post.url = '/2017/08' + post.url;
            req.path = '/2017/07' + post.url;
            req.originalUrl = req.path;

            res.routerOptions.resourceType = 'posts';

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    entry: post
                });

            urlUtilsRedirect301Stub.callsFake(function (_res, postUrl) {
                assert.equal(postUrl, post.url);
                done();
            });

            controllers.entry(req, res, function (err) {
                assertExists(err);
                done(err);
            });
            return promise;
        });

        it('requested url !== resource url: with query params', function () {
            const {promise, done} = deferred();
            post.url = '/2017/08' + post.url;
            req.path = '/2017/07' + post.url;
            req.originalUrl = req.path + '?query=true';

            res.routerOptions.resourceType = 'posts';

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    entry: post
                });

            urlUtilsRedirect301Stub.callsFake(function (_res, postUrl) {
                assert.equal(postUrl, post.url + '?query=true');
                done();
            });

            controllers.entry(req, res, function (err) {
                done(err);
            });
            return promise;
        });
    });
});
