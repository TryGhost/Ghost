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
     * @property {date} [created_at]
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
                status: reply.status || 'published',
                created_at: reply.created_at || new Date()
            });
            createdReplies.push(createdReply);
        }

        return {parent, replies: createdReplies};
    }
};

describe('Admin Comments API', function () {
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

        it('Does not return deleted comments, but returns hidden comments', async function () {
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
            // check that there is no deleted comments by looping through the returned comments
            for (const comment of res.body.comments) {
                assert.notEqual(comment.status, 'deleted');
            }
        });

        it('Returns deleted comments if is has hidden or published replies', async function () {
            const post = fixtureManager.get('posts', 1);
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'deleted',
                replies: [
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 1',
                        status: 'published'
                    }
                ]
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');

            // find deleted comment
            const deletedComment = res.body.comments.find(comment => comment.status === 'deleted');

            assert.equal(deletedComment.html, 'Comment 1');

            const publishedReply = res.body.comments.find(comment => comment.id === deletedComment.id).replies?.find(reply => reply.status === 'published');

            assert.equal(publishedReply.html, 'Reply 1');
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

            const deletedComment = res.body.comments.find(comment => comment.status === 'deleted');
            assert.equal(deletedComment.html, 'Comment 1');

            const hiddenComment = res.body.comments.find(comment => comment.status === 'hidden');
            assert.equal(hiddenComment.html, 'Comment 2');
        });

        it('includes hidden replies but not deleted replies in count', async function () {
            const post = fixtureManager.get('posts', 1);
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published',
                replies: [
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 1',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 2',
                        status: 'deleted'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 3',
                        status: 'published'
                    }
                ]
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            assert.equal(item.count.replies, 2);
        });

        it('can load additional replies as an admin', async function () {
            const post = fixtureManager.get('posts', 1);
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published',
                replies: [
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 1',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 2',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 3',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 4',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 5',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 6',
                        status: 'published'
                    }
                ]
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=5&filter=${filter}`);
            assert.equal(res2.body.comments.length, 3);
        });

        it('can load additional replies and includes hidden replies as an admin', async function () {
            const post = fixtureManager.get('posts', 1);
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published',
                replies: [
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 1',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 2',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 3',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 4',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 5',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 6',
                        status: 'published'
                    }
                ]
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=5&filter=${filter}`);
            assert.equal(res2.body.comments.length, 3);
        });

        it('does not return deleted replies as an admin', async function () {
            const post = fixtureManager.get('posts', 1);
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published',
                replies: [
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 1',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 2',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 3',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 4',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 5',
                        status: 'deleted'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 6',
                        status: 'deleted'
                    }
                ]
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=5&filter=${filter}`);
            assert.equal(res2.body.comments.length, 1);
        });

        it('includes html string of replies as an admin', async function () {
            const post = fixtureManager.get('posts', 1);
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published',
                replies: [
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 1',
                        status: 'published'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 2',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 3',
                        status: 'hidden'
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 4',
                        status: 'hidden'
                    }
                ]
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=5&filter=${filter}`);
            assert.equal(res2.body.comments.length, 1);
            assert.equal(res2.body.comments[0].html, 'Reply 4');
        });

        it('Does not return deleted replies', async function () {
            const post = fixtureManager.get('posts', 1);
            await mockManager.mockLabsEnabled('commentImprovements');
            const {parent} = await dbFns.addCommentWithReplies({
                post_id: post.id,
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 2).id,
                    status: 'deleted'
                },
                {
                    member_id: fixtureManager.get('members', 3).id,
                    status: 'hidden'
                },
                {
                    member_id: fixtureManager.get('members', 4).id,
                    status: 'published'
                }
                ]
            });

            const res = await adminApi.get(`/comments/${parent.get('id')}/`);
            res.body.comments[0].replies.length.should.eql(3);

            res.body.comments[0].replies[0].member.should.be.an.Object().with.properties('id', 'uuid', 'name', 'avatar_image');

            res.body.comments[0].replies[0].should.be.an.Object().with.properties('id', 'html', 'status', 'created_at', 'member', 'count');
        });

        it('Does return published replies', async function () {
            const post = fixtureManager.get('posts', 1);
            await mockManager.mockLabsEnabled('commentImprovements');
            const {parent} = await dbFns.addCommentWithReplies({
                post_id: post.id,
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 2).id,
                    status: 'published'
                },
                {
                    member_id: fixtureManager.get('members', 3).id,
                    status: 'published'
                }
                ]
            });

            const res = await adminApi.get(`/comments/${parent.get('id')}/`);
            res.body.comments[0].replies.length.should.eql(3);
            res.body.comments[0].replies[0].member.should.be.an.Object().with.properties('id', 'uuid', 'name', 'avatar_image');
            res.body.comments[0].replies[0].should.be.an.Object().with.properties('id', 'html', 'status', 'created_at', 'member', 'count');
        });

        it('Does return published and hidden replies but not deleted', async function () {
            const post = fixtureManager.get('posts', 1);
            await mockManager.mockLabsEnabled('commentImprovements');
            const {parent} = await dbFns.addCommentWithReplies({
                post_id: post.id,
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 2).id,
                    status: 'published'
                },
                {
                    member_id: fixtureManager.get('members', 3).id,
                    status: 'published'
                },
                {
                    member_id: fixtureManager.get('members', 4).id,
                    status: 'hidden'
                },
                {
                    member_id: fixtureManager.get('members', 5).id,
                    status: 'deleted'
                }
                ]
            });
            const res = await adminApi.get(`/comments/${parent.get('id')}/`);
            res.body.comments[0].replies.length.should.eql(4);
            res.body.comments[0].replies[0].member.should.be.an.Object().with.properties('id', 'uuid', 'name', 'avatar_image');
            res.body.comments[0].replies[0].should.be.an.Object().with.properties('id', 'html', 'status', 'created_at', 'member', 'count');
        });

        it('ensure replies are always ordered from oldest to newest', async function () {
            const post = fixtureManager.get('posts', 1);
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published',
                created_at: new Date('2021-01-01'),
                replies: [
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 1',
                        status: 'published',
                        created_at: new Date('2022-01-01')
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 2',
                        status: 'published',
                        created_at: new Date('2022-01-02')
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 3',
                        status: 'hidden',
                        created_at: new Date('2022-01-03')
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 4',
                        status: 'hidden',
                        created_at: new Date('2022-01-04')
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 5',
                        status: 'published',
                        created_at: new Date('2022-01-05')
                    },
                    {
                        member_id: fixtureManager.get('members', 0).id,
                        html: 'Reply 6',
                        status: 'published',
                        created_at: new Date('2022-01-06')
                    }
                ]
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=10&filter=${filter}`);
            assert.equal(res2.body.comments.length, 3);
            assert.equal(res2.body.comments[0].html, 'Reply 4');
            assert.equal(res2.body.comments[1].html, 'Reply 5');
            assert.equal(res2.body.comments[2].html, 'Reply 6');
        });
    });
});
