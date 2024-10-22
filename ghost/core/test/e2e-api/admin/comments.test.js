const assert = require('assert/strict');
const {
    agentProvider,
    fixtureManager,
    mockManager
} = require('../../utils/e2e-framework');

describe('Comments API', function () {
    let adminApi;
    let membersApi;

    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        adminApi = agents.adminAgent;
        membersApi = agents.membersAgent;
        await fixtureManager.init('users', 'posts', 'members', 'comments');
        await adminApi.loginAsOwner();
        mockManager.mockSetting('comments_enabled', 'all');
    });

    after(function () {
        mockManager.restore();
    });

    describe('Hide', function () {
        it('Can hide comments', async function () {
            const commentToHide = fixtureManager.get('comments', 0);

            const {body: {comments: [initialState]}} = await membersApi.get(`/api/comments/${commentToHide.id}/`);

            assert.equal(initialState.status, 'published');

            const res = await adminApi.put(`comments/${commentToHide.id}/`).body({
                comments: [{
                    id: commentToHide.id,
                    status: 'hidden'
                }]
            });

            assert.equal(res.headers['x-cache-invalidate'], '/api/members/comments/post/618ba1ffbe2896088840a6df/');

            const {body: {comments: [afterHiding]}} = await membersApi.get(`/api/comments/${commentToHide.id}/`);

            assert.equal(afterHiding.status, 'hidden');

            // Cleanup
            await adminApi.put(`comments/${commentToHide.id}/`).body({
                comments: [{
                    id: commentToHide.id,
                    status: 'published'
                }]
            });
        });

        it('Can hide replies', async function () {
            const commentToHide = fixtureManager.get('comments', 1);

            const {body: {comments: [initialState]}} = await membersApi.get(`/api/comments/${commentToHide.id}/`);

            assert.equal(initialState.status, 'published');

            const res = await adminApi.put(`comments/${commentToHide.id}/`).body({
                comments: [{
                    id: commentToHide.id,
                    status: 'hidden'
                }]
            });

            assert.equal(
                res.headers['x-cache-invalidate'],
                '/api/members/comments/post/618ba1ffbe2896088840a6df/, /api/members/comments/6195c6a1e792de832cd08144/replies/'
            );

            const {body: {comments: [afterHiding]}} = await membersApi.get(`/api/comments/${commentToHide.id}/`);

            assert.equal(afterHiding.status, 'hidden');

            // Cleanup
            await adminApi.put(`comments/${commentToHide.id}/`).body({
                comments: [{
                    id: commentToHide.id,
                    status: 'published'
                }]
            });
        });
    });
});
