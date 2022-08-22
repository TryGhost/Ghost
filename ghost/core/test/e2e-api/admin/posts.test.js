const assert = require('assert');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId} = matchers;

describe('Posts API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('Delete', function () {
        it('Can destroy a post', async function () {
            await agent
                .delete(`posts/${fixtureManager.get('posts', 0).id}/`)
                .expectStatus(204)
                .expectEmptyBody()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('Cannot delete a non-existent posts', async function () {
            // This error message from the API is not really what I would expect
            // Adding this as a guard to demonstrate how future refactoring improves the output
            await agent
                .delete('/posts/abcd1234abcd1234abcd1234/')
                .expectStatus(404)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });
});
