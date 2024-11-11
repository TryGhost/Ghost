const assert = require('assert/strict');
const {
    agentProvider,
    fixtureManager,
    mockManager
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
let postId;
const dbFns = {
    /**
     * @typedef {Object} AddCommentData
     * @property {string} [post_id=post_id]
     * @property {string} member_id
     * @property {string} [parent_id]
     * @property {string} [html='This is a comment']
     * @property {string} [status='published']
     */
    /**
     * @typedef {Object} AddCommentReplyData
     * @property {string} member_id
     * @property {string} [html='This is a reply']
     * @property {date} [created_at]
     */
    /**
     * @typedef {AddCommentData & {replies: AddCommentReplyData[]}} AddCommentWithRepliesData
     */

    /**
     * @param {AddCommentData} data
     * @returns {Promise<any>}
     */
    addComment: async (data) => {
        return await models.Comment.add({
            post_id: data.post_id || postId,
            member_id: data.member_id,
            parent_id: data.parent_id,
            html: data.html || '<p>This is a comment</p>',
            created_at: data.created_at,
            status: data.status || 'published'
        });
    },
    /**
     * @param {AddCommentWithRepliesData}  data
     * @returns {Promise<any>}
     */
    addCommentWithReplies: async (data) => {
        const {replies, ...commentData} = data;

        const parent = await dbFns.addComment(commentData);
        const createdReplies = [];

        for (const reply of replies) {
            const createdReply = await dbFns.addComment({
                post_id: parent.get('post_id'),
                member_id: reply.member_id,
                parent_id: parent.get('id'),
                html: reply.html || '<p>This is a reply</p>',
                status: reply.status || 'published'
            });
            createdReplies.push(createdReply);
        }

        return {parent, replies: createdReplies};
    }
};

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

    describe('browse', function () {
        it('Can browse comments as an admin', async function () {
            const post = fixtureManager.get('posts', 1);
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published'
            });

            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 2',
                status: 'published'
            });
            const res = await adminApi.get('/comments/post/' + post.id + '/');
            assert.equal(res.body.comments.length, 2);
        });

        it('Does show HTML of deleted and hidden comments since we are admin', async function () {
            const post = fixtureManager.get('posts', 1);
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'deleted'
            });

            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 2',
                status: 'hidden'
            });
            const res = await adminApi.get('/comments/post/' + post.id + '/');

            assert.equal(res.body.comments[0].html, 'Comment 2');

            assert.equal(res.body.comments[1].html, 'Comment 1');
        });
    });
});
