const sinon = require('sinon');
const testUtils = require('../../../../../utils');
const configUtils = require('../../../../../utils/config-utils');
const api = require('../../../../../../core/frontend/services/proxy').api;
const controllers = require('../../../../../../core/frontend/services/routing/controllers');
const renderer = require('../../../../../../core/frontend/services/rendering');
const routerManager = require('../../../../../../core/frontend/services/routing/').routerManager;
const urlUtils = require('../../../../../../core/shared/url-utils');

describe('Unit - services/routing/controllers/email-post', function () {
    let renderStub;
    let req;
    let res;
    let post;
    let apiResponse;
    let emailPostReadStub;
    let routerManagerGetUrlForResourceStub;
    let urlUtilsRedirect301Stub;

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    beforeEach(function () {
        post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});

        apiResponse = {
            emailPost: [post]
        };

        req = {
            path: '/',
            params: {
                uuid: 'email-uuid-123'
            },
            route: {}
        };

        res = {
            routerOptions: {
                query: {controller: 'emailPost', resource: 'emailPost'}
            },
            locals: {
                member: null
            },
            render: sinon.spy(),
            redirect: sinon.spy(),
            set: sinon.spy()
        };

        sinon.stub(urlUtils, 'redirectToAdmin');
        urlUtilsRedirect301Stub = sinon.stub(urlUtils, 'redirect301');

        routerManagerGetUrlForResourceStub = sinon.stub(routerManager, 'getUrlForResource');

        renderStub = sinon.stub();
        sinon.stub(renderer, 'renderEntry').get(function () {
            return function () {
                return renderStub;
            };
        });

        emailPostReadStub = sinon.stub();
        emailPostReadStub.resolves(apiResponse);

        sinon.stub(api, 'emailPost').get(() => {
            return {
                read: emailPostReadStub
            };
        });
    });

    it('should render draft post', async function () {
        const next = sinon.stub();
        await controllers.email(req, res, next);

        sinon.assert.called(renderStub);
        sinon.assert.notCalled(next);
        sinon.assert.notCalled(urlUtilsRedirect301Stub);
    });

    it('should call next() when post is not found', async function () {
        apiResponse.emailPost = [];
        const next = sinon.stub();

        await controllers.email(req, res, next);

        sinon.assert.calledOnce(next);
        sinon.assert.notCalled(renderStub);
    });

    it('redirects published post to getUrlForResource (not getUrlByResourceId)', async function () {
        // Regression test: the controller previously called
        // routerManager.getUrlByResourceId(post.id, ...) which used only the id.
        // After this PR it calls routerManager.getUrlForResource(post, ...)
        // so the lazy URL facade receives full resource fields for permalink
        // template evaluation.
        post.status = 'published';
        routerManagerGetUrlForResourceStub
            .withArgs(sinon.match({id: post.id}), {withSubdirectory: true})
            .returns('/published-post-slug/');

        const next = sinon.stub();
        await controllers.email(req, res, next);

        sinon.assert.calledOnce(urlUtilsRedirect301Stub);
        sinon.assert.calledWithExactly(urlUtilsRedirect301Stub, res, '/published-post-slug/');
        sinon.assert.notCalled(renderStub);
        sinon.assert.notCalled(next);
    });

    it('passes the full post object (not just post.id) to getUrlForResource on redirect', async function () {
        // Pin the exact call shape: `getUrlForResource(post, {withSubdirectory:true})`.
        // A future change that regresses back to `getUrlByResourceId(post.id, ...)`
        // would break lazy-mode permalink evaluation.
        post.status = 'published';
        post.slug = 'my-published-post';
        routerManagerGetUrlForResourceStub.returns('/my-published-post/');

        const next = sinon.stub();
        await controllers.email(req, res, next);

        sinon.assert.calledOnce(routerManagerGetUrlForResourceStub);
        const [passedResource, passedOptions] = routerManagerGetUrlForResourceStub.firstCall.args;

        // The resource must be the post object (not just an id string)
        sinon.assert.match(passedResource, sinon.match.object);
        sinon.assert.match(passedResource, sinon.match({id: post.id, slug: 'my-published-post'}));
        sinon.assert.match(passedOptions, {withSubdirectory: true});
    });

    it('should redirect to admin when /edit option is given', async function () {
        req.params.options = 'edit';
        const next = sinon.stub();

        await controllers.email(req, res, next);

        sinon.assert.calledOnce(urlUtils.redirectToAdmin);
        sinon.assert.notCalled(renderStub);
    });

    it('should call next() for unknown options param', async function () {
        req.params.options = 'unknown';
        const next = sinon.stub();

        await controllers.email(req, res, next);

        sinon.assert.calledOnce(next);
        sinon.assert.notCalled(renderStub);
        sinon.assert.notCalled(urlUtilsRedirect301Stub);
    });
});