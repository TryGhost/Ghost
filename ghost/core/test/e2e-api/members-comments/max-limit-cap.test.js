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

    before(async function () {
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

    after(function () {
        // Restore the original middleware
        sharedMiddleware.maxLimitCap[0] = originalMiddleware;
    });

    it('should call maxLimitCap middleware when browsing posts', async function () {
        // Make a request to the posts endpoint
        await agent.get(`/api/comments/post/${postId}/?limit=all`)
            .expectStatus(200);

        // Verify the middleware was called
        assert.equal(middlewareSpy.called, true);

        // Verify it modified the req.query param by reference
        const req = middlewareSpy.firstCall.args[0];
        assert.equal(req.query.limit, 100);
    });
});