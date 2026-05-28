const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');

describe('Presence API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'posts');
    });

    describe('As Unauthorized User', function () {
        it('rejects /presence/stream', async function () {
            await agent.get('/presence/stream/').expectStatus(403);
        });

        it('rejects /presence/posts/:id/enter', async function () {
            await agent.post('/presence/posts/abc123/enter/').expectStatus(403);
        });

        it('rejects /presence/posts/:id/leave', async function () {
            await agent.post('/presence/posts/abc123/leave/').expectStatus(403);
        });
    });

    describe('As Owner', function () {
        before(async function () {
            await agent.loginAsOwner();
        });

        it('returns 404 from /presence/posts/:id/enter for a non-existent post', async function () {
            await agent
                .post('/presence/posts/non-existent-id/enter/')
                .expectStatus(404);
        });

        it('returns 204 from /presence/posts/:id/enter for a real post', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            await agent
                .post(`/presence/posts/${postId}/enter/`)
                .expectStatus(204);
        });

        it('returns 204 from /presence/posts/:id/leave regardless of state', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            await agent
                .post(`/presence/posts/${postId}/leave/`)
                .expectStatus(204);
        });

        it('returns 204 from /presence/posts/:id/leave even for a post the user never entered', async function () {
            await agent
                .post('/presence/posts/never-entered/leave/')
                .expectStatus(204);
        });
    });

    describe('As Author (non-elevated role)', function () {
        before(async function () {
            await agent.loginAsAuthor();
        });

        it('returns 204 from /presence/posts/:id/enter for a post the author owns', async function () {
            // The author fixture authors their own post; the lookup
            // via Post.findOne with the user context will succeed.
            const ownPostId = fixtureManager.get('posts', 6).id;
            await agent
                .post(`/presence/posts/${ownPostId}/enter/`)
                .expectStatus(204);
        });

        it('returns 204 from /presence/posts/:id/leave', async function () {
            const ownPostId = fixtureManager.get('posts', 6).id;
            await agent
                .post(`/presence/posts/${ownPostId}/leave/`)
                .expectStatus(204);
        });
    });
});
