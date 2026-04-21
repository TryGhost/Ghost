const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/config-utils');
const urlUtils = require('../../../../../../core/shared/url-utils');
const routerManager = require('../../../../../../core/frontend/services/routing/').routerManager;
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const dataService = require('../../../../../../core/frontend/services/data');
const llmsService = require('../../../../../../core/frontend/services/llms/service');
const EDITOR_URL = `/#/editor/post/`;

describe('Unit - services/routing/controllers/entry', function () {
    let req;
    let res;
    let entryLookUpStub;
    let renderStub;
    let urlUtilsRedirect301Stub;
    let routerManagerGetResourceByIdStub;
    let urlUtilsRedirectToAdminStub;
    let fetchPublicEntryStub;
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
        routerManagerGetResourceByIdStub = sinon.stub(routerManager, 'getResourceById');
        fetchPublicEntryStub = sinon.stub(llmsService, 'fetchPublicEntry');

        req = {
            path: '/',
            params: {},
            route: {},
            get: sinon.stub(),
            accepts: sinon.stub()
        };

        res = {
            routerOptions: {
                resourceType: 'posts'
            },
            render: sinon.spy(),
            redirect: sinon.spy(),
            locals: {
                member: {
                    uuid: 'member-id'
                }
            },
            send: sinon.spy(),
            type: sinon.spy()
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
            assert.equal(err, undefined);
            done();
        });
    });

    it('resource found', function (done) {
        req.path = post.url;
        req.originalUrl = req.path;

        res.routerOptions.resourceType = 'posts';

        routerManagerGetResourceByIdStub.withArgs(post.id).returns({
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
                assert.equal(err, undefined);
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

            urlUtilsRedirectToAdminStub.callsFake(function (statusCode, _res, editorUrl) {
                assert.equal(statusCode, 302);
                assert.equal(editorUrl, EDITOR_URL + post.id);
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
        });

        it('type of router !== type of resource', function (done) {
            req.path = post.url;
            res.routerOptions.resourceType = 'posts';

            routerManagerGetResourceByIdStub.withArgs(post.id).returns({
                config: {
                    type: 'pages'
                }
            });

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    entry: post
                });

            controllers.entry(req, res, function (err) {
                assert.equal(err, undefined);
                done();
            });
        });

        it('requested url !== resource url', function (done) {
            post.url = '/2017/08' + post.url;
            req.path = '/2017/07' + post.url;
            req.originalUrl = req.path;

            res.routerOptions.resourceType = 'posts';

            routerManagerGetResourceByIdStub.withArgs(post.id).returns({
                config: {
                    type: 'posts'
                }
            });

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
        });

        it('requested url !== resource url: with query params', function (done) {
            post.url = '/2017/08' + post.url;
            req.path = '/2017/07' + post.url;
            req.originalUrl = req.path + '?query=true';

            res.routerOptions.resourceType = 'posts';

            routerManagerGetResourceByIdStub.withArgs(post.id).returns({
                config: {
                    type: 'posts'
                }
            });

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
        });

        it('serves markdown when text/markdown is preferred for a public post', function (done) {
            req.path = post.url;
            req.originalUrl = req.path;
            req.get.withArgs('Accept').returns('text/markdown');
            req.accepts.returns('text/markdown');
            post.visibility = 'public';

            routerManagerGetResourceByIdStub.withArgs(post.id).returns({
                config: {
                    type: 'posts'
                }
            });

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({
                    entry: post
                });

            fetchPublicEntryStub.resolves({
                title: 'Hello world',
                url: 'https://example.com/hello-world/',
                published_at: '2026-04-14T12:00:00.000Z',
                updated_at: '2026-04-14T13:00:00.000Z',
                custom_excerpt: 'Short summary',
                visibility: 'public',
                html: '<p>Hello <strong>world</strong></p>',
                plaintext: 'Hello world'
            });

            controllers.entry(req, res, function (err) {
                done(err || new Error('next should not be called'));
            }).then(() => {
                sinon.assert.calledOnceWithExactly(fetchPublicEntryStub, 'posts', post.id);
                sinon.assert.calledOnceWithExactly(res.type, 'text/markdown');
                sinon.assert.match(res.send.firstCall.args[0], /^> ## Content Index/m);
                sinon.assert.match(res.send.firstCall.args[0], /Fetch the complete content index at: http:\/\/127\.0\.0\.1:\d+\/llms\.txt/);
                sinon.assert.match(res.send.firstCall.args[0], /^# Hello world/m);
                sinon.assert.match(res.send.firstCall.args[0], /- Published: 2026-04-14T12:00:00.000Z/);
                assert.equal(res.send.firstCall.args[0].includes('- Visibility:'), false);
                sinon.assert.match(res.send.firstCall.args[0], /Hello \*\*world\*\*/);
                sinon.assert.notCalled(renderStub);
                done();
            }).catch(done);
        });
    });
});
