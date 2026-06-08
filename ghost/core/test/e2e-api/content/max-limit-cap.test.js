const assert = require('node:assert/strict');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const sinon = require('sinon');
const sharedMiddleware = require('../../../core/server/web/shared/middleware');

describe('Content API - Max Limit Cap', function () {
    let agent;
    let originalMiddleware;
    let middlewareSpy;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys', 'members');
        await agent.authenticate();

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
        await agent.get('posts/?limit=all')
            .expectStatus(200);

        // Verify the middleware was called
        sinon.assert.called(middlewareSpy);

        // Verify it modified the req.query param by reference
        const req = middlewareSpy.firstCall.args[0];
        assert.equal(req.query.limit, 100);
    });
});