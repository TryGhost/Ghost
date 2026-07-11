import assert from 'node:assert/strict';
import sinon from 'sinon';
import type {Entry, RouterOptions} from '../../../../../../core/frontend/services/routing/controllers/entry';

const {assertExists} = require('../../../../../utils/assertions');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/config-utils');
const {deferred} = require('../../../../../utils/deferred')
const urlUtils = require('../../../../../../core/shared/url-utils');
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const dataService = require('../../../../../../core/frontend/services/data');
const EDITOR_URL = `/#/editor/post/`;

interface MockRequest {
    path: string;
    originalUrl: string;
    query: Record<string, unknown>;
    params: object;
    route: object;
    app: {get: sinon.SinonStub};
    get: sinon.SinonStub;
    accepts: sinon.SinonStub;
}

interface MockResponse {
    routerOptions: RouterOptions;
    locals: Record<string, unknown>;
    render: sinon.SinonSpy;
    redirect: sinon.SinonSpy;
    status: sinon.SinonStub;
    type: sinon.SinonStub;
    send: sinon.SinonSpy;
    set: sinon.SinonSpy;
    vary: sinon.SinonSpy;
}

describe('Unit - services/routing/controllers/entry', function () {
    let req: MockRequest;
    let res: MockResponse;
    let entryLookUpStub: sinon.SinonStub;
    let renderStub: sinon.SinonStub;
    let urlUtilsRedirect301Stub: sinon.SinonStub;
    let urlUtilsRedirectToAdminStub: sinon.SinonStub;
    let post: Entry;

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

        // A complete mock built up front so its shape is stable across the suite;
        // individual tests configure the stubs rather than adding properties.
        req = {
            path: '/',
            originalUrl: '/',
            query: {},
            params: {},
            route: {},
            app: {get: sinon.stub()},
            get: sinon.stub(),
            accepts: sinon.stub()
        };

        res = {
            routerOptions: {resourceType: 'posts'},
            locals: {},
            render: sinon.spy(),
            redirect: sinon.spy(),
            status: sinon.stub(),
            type: sinon.stub(),
            send: sinon.spy(),
            set: sinon.spy(),
            vary: sinon.spy()
        };
        res.status.returns(res);
        res.type.returns(res);
    });

    afterEach(async function () {
        sinon.restore();
        // Some tests below toggle config (e.g. admin:redirects) and restore it
        // inline from async callbacks. Restore unconditionally here too so a
        // config change can never leak into a co-scheduled file under the
        // shared module registry (isolate: false).
        await configUtils.restore();
    });

    it('resource not found', function () {
        const {promise, done} = deferred();
        req.path = '/does-not-exist/';

        entryLookUpStub.withArgs(req.path, res.routerOptions)
            .resolves(null);

        controllers.entry(req, res, function (err?: Error) {
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

            controllers.entry(req, res, function (err?: Error) {
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

            urlUtilsRedirectToAdminStub.callsFake(function (statusCode: number, _res: unknown, editorUrl: string) {
                assert.equal(statusCode, 302);
                assert.equal(editorUrl, EDITOR_URL + post.id);
                done();
            });

            controllers.entry(req, res, (err?: Error) => {
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

            controllers.entry(req, res, async (err?: Error) => {
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

            urlUtilsRedirect301Stub.callsFake(function (_res: unknown, postUrl: string) {
                assert.equal(postUrl, post.url);
                done();
            });

            controllers.entry(req, res, function (err?: Error) {
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

            urlUtilsRedirect301Stub.callsFake(function (_res: unknown, postUrl: string) {
                assert.equal(postUrl, post.url + '?query=true');
                done();
            });

            controllers.entry(req, res, function (err?: Error) {
                done(err);
            });
            return promise;
        });
    });

    describe('markdown requests (llms.txt)', function () {
        let llmsService: {isEnabled: sinon.SinonStub};

        beforeEach(function () {
            llmsService = {
                isEnabled: sinon.stub()
            };
            req.app.get.withArgs('llmsService').returns(llmsService);

            res.routerOptions.isMarkdownRequest = true;

            post.url = '/does-exist/';
            req.path = '/does-exist.md';
            req.originalUrl = req.path;
        });

        it('does not return 403 for non-public posts when the llms feature is disabled', async function () {
            post.visibility = 'paid';
            llmsService.isEnabled.returns(false);

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({entry: post});

            await controllers.entry(req, res, sinon.stub());

            sinon.assert.notCalled(res.status);
            sinon.assert.notCalled(res.send);
            sinon.assert.calledWith(res.redirect, 302, '/does-exist/');
        });

        it('redirects public posts to the canonical URL when the llms feature is disabled', async function () {
            post.visibility = 'public';
            llmsService.isEnabled.returns(false);

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({entry: post});

            await controllers.entry(req, res, sinon.stub());

            sinon.assert.notCalled(res.send);
            sinon.assert.calledWith(res.redirect, 302, '/does-exist/');
        });

        it('returns 403 for non-public posts when the llms feature is enabled', async function () {
            post.visibility = 'members';
            llmsService.isEnabled.returns(true);

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({entry: post});

            await controllers.entry(req, res, sinon.stub());

            sinon.assert.calledWith(res.status, 403);
            sinon.assert.calledWith(res.type, 'text/markdown');
            sinon.assert.calledOnce(res.send);
            sinon.assert.notCalled(res.redirect);
        });

        it('serves markdown for public posts when the llms feature is enabled', async function () {
            post.url = 'http://127.0.0.1:2369/does-exist/';
            post.visibility = 'public';
            llmsService.isEnabled.returns(true);

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({entry: post});

            await controllers.entry(req, res, sinon.stub());

            sinon.assert.calledWith(res.type, 'text/markdown');
            sinon.assert.calledOnce(res.send);
            sinon.assert.notCalled(res.redirect);
        });
    });

    describe('Accept header markdown negotiation', function () {
        let llmsService: {isEnabled: sinon.SinonStub};

        beforeEach(function () {
            llmsService = {
                isEnabled: sinon.stub()
            };
            req.app.get.withArgs('llmsService').returns(llmsService);

            req.get.withArgs('Accept').returns('text/markdown');
            req.accepts.returns('text/markdown');

            req.path = '/does-exist/';
            req.originalUrl = req.path;
            post.visibility = 'public';
        });

        it('serves markdown when the entry is public, Accept negotiates markdown and llms is enabled', async function () {
            post.url = 'http://localhost:2368/does-exist/';
            // serveMarkdown needs an absolute entry.url; keep req.path canonical
            // so the permalink-redirect guard doesn't fire first.
            req.path = urlUtils.absoluteToRelative(post.url, {withoutSubdirectory: true});
            req.originalUrl = req.path;
            llmsService.isEnabled.returns(true);

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({entry: post});

            await controllers.entry(req, res, sinon.stub());

            sinon.assert.calledWith(res.vary, 'Accept');
            sinon.assert.calledWith(res.type, 'text/markdown');
            sinon.assert.calledOnce(res.send);
            sinon.assert.notCalled(renderStub);
        });

        it('renders normally when llms is disabled', async function () {
            post.url = '/does-exist/';
            llmsService.isEnabled.returns(false);
            const renderEntry = sinon.spy();
            renderStub.returns(renderEntry);

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({entry: post});

            await controllers.entry(req, res, sinon.stub());

            sinon.assert.notCalled(res.send);
            sinon.assert.calledWith(renderEntry, post);
        });

        it('renders normally when the entry is not public', async function () {
            post.url = '/does-exist/';
            post.visibility = 'paid';
            llmsService.isEnabled.returns(true);
            const renderEntry = sinon.spy();
            renderStub.returns(renderEntry);

            entryLookUpStub.withArgs(req.path, res.routerOptions)
                .resolves({entry: post});

            await controllers.entry(req, res, sinon.stub());

            sinon.assert.notCalled(res.send);
            sinon.assert.calledWith(renderEntry, post);
        });
    });
});
