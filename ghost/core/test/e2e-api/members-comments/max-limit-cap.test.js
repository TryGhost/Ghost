const assert = require('node:assert/strict');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const sinon = require('sinon');
const settingsCache = require('../../../core/shared/settings-cache');
const sharedMiddleware = require('../../../core/server/web/shared/middleware');

describe('Comments API - Max Limit Cap', function () {
    let agent;
    let postId;
    let originalMiddleware;
    let middlewareSpy;

    beforeAll(async function () {
        agent = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('posts', 'members');
        postId = fixtureManager.get('posts', 0).id;

        const getStub = sinon.stub(settingsCache, 'get');
        getStub.callsFake((key, options) => {
            if (key === 'comments_enabled') {
                return 'all';
            }
            return getStub.wrappedMethod.call(settingsCache, key, options);
        });

        // Save the original middleware and create a spy
        originalMiddleware = sharedMiddleware.maxLimitCap[0];
        middlewareSpy = sinon.spy(originalMiddleware);

        // Replace the middleware with our spy
        sharedMiddleware.maxLimitCap[0] = middlewareSpy;
    });

    afterAll(function () {
        // Restore the original middleware
        sharedMiddleware.maxLimitCap[0] = originalMiddleware;
        // beforeAll stubs settingsCache.get directly (not via mockManager), and
        // there is no global sinon.restore() in the shared boot (isolate:false).
        // Without this the stub leaks into the next file: the first later file to
        // (re)stub settingsCache.get — e.g. any mockManager.mockMailgun/mockSetting
        // — throws "Attempted to wrap get which is already wrapped". (PLA-173)
        sinon.restore();
    });

    it('should call maxLimitCap middleware when browsing posts', async function () {
        // Make a request to the posts endpoint
        await agent.get(`/api/comments/post/${postId}/?limit=all`)
            .expectStatus(200);

        // Verify the middleware was called
        sinon.assert.called(middlewareSpy);

        // Verify it modified the req.query param by reference
        const req = middlewareSpy.firstCall.args[0];
        assert.equal(req.query.limit, 100);
    });
});