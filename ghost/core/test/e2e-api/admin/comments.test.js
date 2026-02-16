const assert = require('node:assert/strict');
require('should');
const ObjectId = require('bson-objectid').default;
const {
    agentProvider,
    fixtureManager,
    mockManager,
    dbUtils,
    matchers
} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId, anyObjectId, anyISODateTime, anyUuid, anyNumber, anyBoolean, anyString, nullable} = matchers;
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const security = require('@tryghost/security');

const membersCommentMatcher = {
    id: anyObjectId,
    parent_id: nullable(anyObjectId),
    created_at: anyISODateTime,
    member: {
        id: anyObjectId,
        uuid: anyUuid
    },
    count: {
        likes: anyNumber
    },
    liked: anyBoolean
};

let postId;
let adminApi;
let membersApi;

const dbFns = {
    /**
     * @typedef {Object} AddCommentData
     * @property {string} [post_id=post_id]
     * @property {string} member_id
     * @property {string} [parent_id]
     * @property {string} [in_reply_to_id]
     * @property {string} [html='This is a comment']
     * @property {string} [status='published']
     * @property {Date} [created_at]
     */
    /**
     * @typedef {Object} AddCommentReplyData
     * @property {string} member_id
     * @property {string} [in_reply_to_id]
     * @property {string} [html='This is a reply']
     * @property {Date} [created_at]
     * @property {string} [status]
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
            in_reply_to_id: data.in_reply_to_id,
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
                in_reply_to_id: reply.in_reply_to_id,
                html: reply.html || '<p>This is a reply</p>',
                status: reply.status || 'published',
                created_at: reply.created_at || new Date()
            });
            createdReplies.push(createdReply);
        }

        return {parent, replies: createdReplies};
    }
};

async function getMemberComments(url, commentsMatcher = [membersCommentMatcher]) {
    return await membersApi
        .get(url)
        .expectStatus(200)
        .matchHeaderSnapshot({etag: anyEtag})
        .matchBodySnapshot({
            comments: commentsMatcher
        });
}

describe(`Admin Comments API`, function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        adminApi = agents.adminAgent;
        membersApi = agents.membersAgent;

        await fixtureManager.init('users', 'posts', 'members', 'comments');

        await adminApi.loginAsOwner();

        mockManager.mockSetting('comments_enabled', 'all');
        postId = fixtureManager.get('posts', 1).id;
    });

    beforeEach(async function () {
        // ensure we don't have data dependencies across tests
        await dbUtils.truncate('comments');
        await dbUtils.truncate('comment_likes');
        await dbUtils.truncate('comment_reports');
    });

    after(function () {
        mockManager.restore();
    });

    describe('Hide', function () {
        it('Can hide comments', async function () {
            const commentToHide = await dbFns.addComment({member_id: fixtureManager.get('members', 0).id});

            const {body: {comments: [initialState]}} = await getMemberComments(`/api/comments/${commentToHide.id}/`);

            assert.equal(initialState.status, 'published');

            const res = await adminApi.put(`comments/${commentToHide.id}/`).body({
                comments: [{
                    id: commentToHide.id,
                    status: 'hidden'
                }]
            });

            assert.equal(res.headers['x-cache-invalidate'], `/api/members/comments/post/${postId}/`);

            const {body: {comments: [afterHiding]}} = await getMemberComments(`/api/comments/${commentToHide.id}/`);

            assert.equal(afterHiding.status, 'hidden');
        });

        it('Can hide replies', async function () {
            const {parent, replies: [commentToHide]} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id
                }]
            });

            const {body: {comments: [initialState]}} = await getMemberComments(`/api/comments/${commentToHide.id}/`);

            assert.equal(initialState.status, 'published');

            const res = await adminApi.put(`comments/${commentToHide.id}/`).body({
                comments: [{
                    id: commentToHide.id,
                    status: 'hidden'
                }]
            });

            assert.equal(
                res.headers['x-cache-invalidate'],
                `/api/members/comments/post/${postId}/, /api/members/comments/${parent.id}/replies/`
            );

            const {body: {comments: [afterHiding]}} = await getMemberComments(`/api/comments/${commentToHide.id}/`);

            assert.equal(afterHiding.status, 'hidden');
        });
    });

    describe('browse by post', function () {
        it('returns comments', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published'
            });

            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 2',
                status: 'published'
            });
            const res = await adminApi.get('/comments/post/' + postId + '/');
            assert.equal(res.body.comments.length, 2);
        });

        it('returns hidden comments (with html)', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'hidden'
            });
            const res = await adminApi.get('/comments/post/' + postId + '/');

            const hiddenComment = res.body.comments[0];
            assert.equal(hiddenComment.html, 'Comment 1');
        });

        it('returns hidden replies (with html)', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    status: 'hidden'
                }]
            });

            const res = await adminApi.get(`/comments/${parent.id}/`);

            const hiddenReply = res.body.comments[0].replies[0];
            assert.equal(hiddenReply.html, '<p>This is a reply</p>');
        });

        it('returns hidden comments and hidden replies', async function () {
            await dbFns.addCommentWithReplies({
                status: 'hidden',
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    status: 'hidden'
                }]
            });

            const res = await adminApi.get('/comments/post/' + postId + '/');

            const hiddenComment = res.body.comments[0];
            assert.equal(hiddenComment.status, 'hidden');

            const hiddenReply = res.body.comments[0].replies[0];
            assert.equal(hiddenReply.status, 'hidden');
        });

        it('can load additional replies', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 2',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 3',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 4',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 5',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 6',
                    status: 'published'
                }]
            });

            const res = await adminApi.get('/comments/post/' + postId + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=5&filter=${filter}`);
            assert.equal(res2.body.comments.length, 3);
        });

        it('can load additional replies and includes hidden replies', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 2',
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 3',
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 4',
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 5',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 6',
                    status: 'published'
                }]
            });

            const res = await adminApi.get('/comments/post/' + postId + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=5&filter=${filter}`);
            assert.equal(res2.body.comments.length, 3);
        });

        it('includes html string of replies', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 2',
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 3',
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 4',
                    status: 'hidden'
                }]
            });

            const res = await adminApi.get('/comments/post/' + postId + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=5&filter=${filter}`);
            assert.equal(res2.body.comments.length, 1);
            assert.equal(res2.body.comments[0].html, 'Reply 4');
        });

        it('Does return published replies', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 2).id,
                    status: 'published'
                }, {
                    member_id: fixtureManager.get('members', 3).id,
                    status: 'published'
                }]
            });

            const replyMatcher = {
                id: anyObjectId,
                parent_id: anyObjectId,
                html: anyString,
                status: anyString,
                created_at: anyISODateTime,
                member: {
                    id: anyObjectId,
                    uuid: anyUuid,
                    name: nullable(anyString),
                    avatar_image: nullable(anyString)
                },
                count: {
                    likes: anyNumber
                }
            };

            await adminApi.get(`/comments/${parent.get('id')}/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [{
                        ...membersCommentMatcher,
                        replies: [replyMatcher, replyMatcher, replyMatcher]
                    }]
                });
        });

        it('ensure replies are always ordered from oldest to newest', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published',
                created_at: new Date('2021-01-01'),
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'published',
                    created_at: new Date('2022-01-01')
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 2',
                    status: 'published',
                    created_at: new Date('2022-01-02')
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 3',
                    status: 'hidden',
                    created_at: new Date('2022-01-03')
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 4',
                    status: 'hidden',
                    created_at: new Date('2022-01-04')
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 5',
                    status: 'published',
                    created_at: new Date('2022-01-05')
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 6',
                    status: 'published',
                    created_at: new Date('2022-01-06')
                }]
            });

            const res = await adminApi.get('/comments/post/' + postId + '/');
            const item = res.body.comments.find(cmt => parent.id === cmt.id);
            const lastReply = item.replies[item.replies.length - 1];
            const filter = encodeURIComponent(`id:>'${lastReply.id}'`);
            const res2 = await adminApi.get(`/comments/${parent.id}/replies?limit=10&filter=${filter}`);
            assert.equal(res2.body.comments.length, 3);
            assert.equal(res2.body.comments[0].html, 'Reply 4');
            assert.equal(res2.body.comments[1].html, 'Reply 5');
            assert.equal(res2.body.comments[2].html, 'Reply 6');
        });

        it('does not return deleted comments', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'deleted'
            });

            await adminApi.get('/comments/post/' + postId + '/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: []
                });
        });

        it('excludes deleted comments when all replies are also deleted', async function () {
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'deleted',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'deleted'
                }]
            });

            await adminApi.get('/comments/post/' + postId + '/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: []
                });
        });

        it('returns deleted comments if they have published replies', async function () {
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'deleted',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'published'
                }]
            });

            const replyMatcher = {
                id: anyObjectId,
                parent_id: anyObjectId,
                created_at: anyISODateTime,
                member: {
                    id: anyObjectId,
                    uuid: anyUuid
                }
            };

            await adminApi.get('/comments/post/' + postId + '/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [{
                        ...membersCommentMatcher,
                        replies: [replyMatcher]
                    }]
                });
        });

        it('does not return deleted replies', async function () {
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'deleted'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 2',
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 3',
                    status: 'published'
                }]
            });

            const replyMatcher = {
                id: anyObjectId,
                parent_id: anyObjectId,
                created_at: anyISODateTime,
                member: {
                    id: anyObjectId,
                    uuid: anyUuid
                }
            };

            // Admin sees hidden + published, but not deleted
            await adminApi.get('/comments/post/' + postId + '/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [{
                        ...membersCommentMatcher,
                        replies: [replyMatcher, replyMatcher]
                    }]
                });
        });

        it('includes hidden replies but not deleted replies in count', async function () {
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'hidden'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 2',
                    status: 'deleted'
                }, {
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 3',
                    status: 'published'
                }]
            });

            const replyMatcher = {
                id: anyObjectId,
                parent_id: anyObjectId,
                created_at: anyISODateTime,
                member: {
                    id: anyObjectId,
                    uuid: anyUuid
                }
            };

            // Admin sees hidden + published (2), but not deleted
            await adminApi.get('/comments/post/' + postId + '/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [{
                        ...membersCommentMatcher,
                        replies: [replyMatcher, replyMatcher]
                    }]
                });
        });
        it('includes in_reply_to_snippet for hidden replies', async function () {
            const post = fixtureManager.get('posts', 1);
            const {parent, replies: [inReplyTo]} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                html: 'Comment 1',
                status: 'published',
                replies: [{
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'Reply 1',
                    status: 'hidden'
                }]
            });

            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                post_id: post.id,
                parent_id: parent.id,
                in_reply_to_id: inReplyTo.id,
                html: 'Reply 2',
                status: 'published'
            });

            const res = await adminApi.get('/comments/post/' + post.id + '/');
            const comment = res.body.comments[0];
            const reply = comment.replies[1];
            assert.equal(reply.in_reply_to_snippet, 'Reply 1');
        });
    });

    describe('Reply counts', function () {
        it('returns correct count.replies and count.direct_replies for threaded comments', async function () {
            const member0 = fixtureManager.get('members', 0).id;
            const member1 = fixtureManager.get('members', 1).id;

            // Root A
            const rootA = await dbFns.addComment({member_id: member0, html: '<p>Root A</p>'});

            // Reply B to A (direct reply — in_reply_to_id is null)
            const replyB = await dbFns.addComment({
                member_id: member1,
                parent_id: rootA.get('id'),
                html: '<p>Reply B</p>'
            });

            // Reply C to B (in_reply_to_id = B)
            await dbFns.addComment({
                member_id: member0,
                parent_id: rootA.get('id'),
                in_reply_to_id: replyB.get('id'),
                html: '<p>Reply C to B</p>'
            });

            // Reply D to B (in_reply_to_id = B)
            await dbFns.addComment({
                member_id: member1,
                parent_id: rootA.get('id'),
                in_reply_to_id: replyB.get('id'),
                html: '<p>Reply D to B</p>'
            });

            // Fetch root via admin API
            const res = await adminApi.get(`/comments/post/${postId}/`);
            const rootComment = res.body.comments[0];

            // count.replies = 3 (B, C, D all have parent_id=A)
            // count.direct_replies = 1 (only B is direct: parent_id=A AND in_reply_to_id IS NULL)
            assert.equal(rootComment.count.replies, 3);
            assert.equal(rootComment.count.direct_replies, 1);

            // Child B (embedded in root's replies) should have count.direct_replies = 2
            const childB = rootComment.replies.find(r => r.id === replyB.get('id'));
            assert.equal(childB.count.direct_replies, 2);
        });

        it('admin count.replies includes hidden but not deleted', async function () {
            const member0 = fixtureManager.get('members', 0).id;

            const root = await dbFns.addComment({member_id: member0, html: '<p>Root</p>'});

            // 1 hidden, 1 deleted, 1 published — all direct replies
            await dbFns.addComment({
                member_id: member0, parent_id: root.get('id'), html: '<p>Hidden</p>', status: 'hidden'
            });
            await dbFns.addComment({
                member_id: member0, parent_id: root.get('id'), html: '<p>Deleted</p>', status: 'deleted'
            });
            await dbFns.addComment({
                member_id: member0, parent_id: root.get('id'), html: '<p>Published</p>', status: 'published'
            });

            const res = await adminApi.get(`/comments/post/${postId}/`);
            const rootComment = res.body.comments[0];

            // Admin sees hidden + published = 2, not deleted
            // count.replies = 2 (all are direct, so same as direct_replies)
            assert.equal(rootComment.count.replies, 2);
            assert.equal(rootComment.count.direct_replies, 2);
        });
    });

    describe('get by id', function () {
        it('can get a published comment', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'published'
            });

            const res = await adminApi.get(`/comments/${comment.id}/`);
            assert.equal(res.body.comments[0].html, 'Comment 1');
        });

        it('can get a hidden comment', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'hidden'
            });

            const res = await adminApi.get(`/comments/${comment.id}/`);
            assert.equal(res.body.comments[0].html, 'Comment 1');
        });

        it('includes published replies', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    html: 'Reply 1',
                    status: 'published'
                }]
            });

            const res = await adminApi.get(`/comments/${parent.id}/`);
            const reply = res.body.comments[0].replies[0];
            assert.equal(reply.html, 'Reply 1');
        });

        it('includes hidden replies', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    html: 'Reply 1',
                    status: 'hidden'
                }]
            });

            const res = await adminApi.get(`/comments/${parent.id}/`);
            const reply = res.body.comments[0].replies[0];
            assert.equal(reply.html, 'Reply 1');
        });

        it('does not include deleted replies', async function () {
            const {parent} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    html: 'Reply 1',
                    status: 'deleted'
                }]
            });

            await adminApi.get(`/comments/${parent.id}/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [{
                        ...membersCommentMatcher,
                        replies: []
                    }]
                });
        });
    });

    describe('Logged in member gets own likes via admin api', function () {
        let comment;
        let post;
        this.beforeEach(async function () {
            post = fixtureManager.get('posts', 1);
            comment = await dbFns.addComment({
                post_id: post.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await membersApi.loginAs(fixtureManager.get('members', 1).email);

            await membersApi
                .post(`/api/comments/${comment.get('id')}/like/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();
        });
        it('can get comment liked status by impersonating member via admin browse route', async function () {
            // Like the comment
            const res = await adminApi.get(`/comments/post/${post.id}/?impersonate_member_uuid=${fixtureManager.get('members', 1).uuid}`);
            assert.equal(res.body.comments[0].liked, true);
        });

        it('can get comment liked status by impersonating member via admin get by comment id read route', async function () {
            const res = await adminApi.get(`/comments/${comment.get('id')}/?impersonate_member_uuid=${fixtureManager.get('members', 1).uuid}`);
            assert.equal(res.body.comments[0].liked, true);
        });

        it('can get comment liked status by impersonating member via admin get by comment replies route', async function () {
            const {parent, replies} = await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 1).id,
                replies: [{
                    member_id: fixtureManager.get('members', 1).id
                }]
            });

            await membersApi
                .post(`/api/comments/${replies[0].id}/like/`)
                .expectStatus(204)
                .expectEmptyBody();

            const res = await adminApi.get(`/comments/${parent.get('id')}/replies/?impersonate_member_uuid=${fixtureManager.get('members', 1).uuid}`);
            assert.equal(res.body.comments[0].liked, true);
        });
    });

    describe('Add comments via Admin API', function () {
        let emailMockReceiver;

        beforeEach(async function () {
            // Set up email mocking to test notifications
            emailMockReceiver = mockManager.mockMail();
        });

        it('Can add a comment as a member via Admin API', async function () {
            // Use existing fixture data
            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 0).id;

            const commentData = {
                post_id: targetPostId,
                member_id: memberId,
                html: '<p>This is a test comment via Admin API</p>'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            // Validate response structure
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.equal(typeof comment.id, 'string');
            assert.equal(comment.html, '<p>This is a test comment via Admin API</p>');
            assert.equal(comment.status, 'published');
            assert.ok(comment.member);
            assert.equal(comment.member.id, memberId);
        });

        it('Can add a comment with custom created_at timestamp', async function () {
            // Use existing fixture data
            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 0).id;
            const customTimestamp = '2023-01-15T10:30:00.000Z';

            const commentData = {
                post_id: targetPostId,
                member_id: memberId,
                html: '<p>This comment was created at a specific time</p>',
                created_at: customTimestamp
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            // Validate response structure
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.equal(typeof comment.id, 'string');
            assert.equal(comment.html, '<p>This comment was created at a specific time</p>');
            assert.equal(comment.status, 'published');
            assert.equal(comment.created_at, customTimestamp);
            assert.ok(comment.member);
            assert.equal(comment.member.id, memberId);
        });

        it('Can add a reply to an existing comment via Admin API', async function () {
            // First create a parent comment using the helper function
            const parentComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id
            });

            // Use existing fixture data
            const memberId = fixtureManager.get('members', 1).id;

            const replyData = {
                parent_id: parentComment.id,
                member_id: memberId,
                html: '<p>This is a reply via Admin API</p>'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [replyData]})
                .expectStatus(201);

            // Validate response structure
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const reply = response.body.comments[0];
            assert.equal(typeof reply.id, 'string');
            assert.equal(reply.html, '<p>This is a reply via Admin API</p>');
            assert.equal(reply.status, 'published');
            assert.ok(reply.member);
            assert.equal(reply.member.id, memberId);
        });

        it('Can add a reply with custom created_at timestamp', async function () {
            // First create a parent comment using the helper function
            const parentComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id
            });

            // Use existing fixture data
            const memberId = fixtureManager.get('members', 1).id;
            const customTimestamp = '2023-01-15T10:30:00.000Z';

            const replyData = {
                parent_id: parentComment.id,
                member_id: memberId,
                html: '<p>This is a timestamped reply via Admin API</p>',
                created_at: customTimestamp
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [replyData]})
                .expectStatus(201);

            // Validate response structure
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const reply = response.body.comments[0];
            assert.equal(typeof reply.id, 'string');
            assert.equal(reply.html, '<p>This is a timestamped reply via Admin API</p>');
            assert.equal(reply.status, 'published');
            assert.equal(reply.created_at, customTimestamp);
            assert.ok(reply.member);
            assert.equal(reply.member.id, memberId);
        });

        it('Returns validation error for missing required fields', async function () {
            const commentData = {
                // Missing post_id/parent_id, member_id, and html
            };

            await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(400);
        });

        it('Returns validation error when neither post_id nor parent_id is provided', async function () {
            const commentData = {
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Test comment</p>'
                // Missing both post_id and parent_id
            };

            await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(422);
        });

        it('Handles invalid created_at dates gracefully', async function () {
            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 0).id;

            // Test with invalid date string
            const commentData = {
                post_id: targetPostId,
                member_id: memberId,
                html: '<p>Comment with invalid date</p>',
                created_at: 'invalid-date-string'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            // Should succeed but use current timestamp instead of invalid date
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.ok(comment.created_at);
            // The created_at should be a valid recent timestamp, not the invalid input
            const createdAt = new Date(comment.created_at);
            const now = new Date();
            const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
            // Should be created within the last few seconds
            assert.ok(timeDiff < 10000, `Expected timeDiff (${timeDiff}) to be less than 10000`);
        });

        it('Handles future dates by using current timestamp', async function () {
            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 0).id;
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);

            const commentData = {
                post_id: targetPostId,
                member_id: memberId,
                html: '<p>Comment with future date</p>',
                created_at: futureDate.toISOString()
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            // Should succeed but use current timestamp instead of future date
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.ok(comment.created_at);
            // The created_at should not be the future date
            const createdAt = new Date(comment.created_at);
            const now = new Date();
            assert.notDeepEqual(createdAt, futureDate);
            // Should be created recently (within the last few seconds)
            const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
            assert.ok(timeDiff < 10000, `Expected timeDiff (${timeDiff}) to be less than 10000`);
        });

        it('Handles non-string/non-Date created_at values gracefully', async function () {
            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 0).id;

            const commentData = {
                post_id: targetPostId,
                member_id: memberId,
                html: '<p>Comment with numeric timestamp</p>',
                created_at: 12345 // Invalid type - should be string or Date
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            // Should succeed but use current timestamp instead of invalid type
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.ok(comment.created_at);
            // The created_at should be a valid recent timestamp
            const createdAt = new Date(comment.created_at);
            const now = new Date();
            const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
            assert.ok(timeDiff < 10000, `Expected timeDiff (${timeDiff}) to be less than 10000`);
        });

        it('Works correctly with valid Date object as created_at', async function () {
            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 0).id;
            const validDate = new Date('2023-01-15T10:30:00.000Z');

            const commentData = {
                post_id: targetPostId,
                member_id: memberId,
                html: '<p>Comment with Date object</p>',
                created_at: validDate
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.equal(comment.created_at, validDate.toISOString());
        });

        it('Can set in_reply_to_id when creating a reply to a specific reply', async function () {
            // Create a parent comment first
            const parentComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>This is the parent comment</p>'
            });

            // Create a first reply to the parent
            const firstReply = await dbFns.addComment({
                member_id: fixtureManager.get('members', 1).id,
                parent_id: parentComment.id,
                html: '<p><strong>This is the first reply</strong> to the parent</p>'
            });

            // Now create a reply to the first reply using the Admin API
            const memberId = fixtureManager.get('members', 2).id;
            const replyData = {
                parent_id: parentComment.id,
                in_reply_to_id: firstReply.id,
                member_id: memberId,
                html: '<p>This is a reply to the first reply via Admin API</p>'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [replyData]})
                .expectStatus(201);

            // Validate response structure
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const reply = response.body.comments[0];
            assert.equal(typeof reply.id, 'string');
            assert.equal(reply.html, '<p>This is a reply to the first reply via Admin API</p>');
            assert.equal(reply.status, 'published');
            assert.equal(reply.in_reply_to_id, firstReply.id);
            assert.equal(reply.in_reply_to_snippet, 'This is the first reply to the parent');
            assert.ok(reply.member);
            assert.equal(reply.member.id, memberId);
        });

        it('Ignores in_reply_to_id when no parent_id is specified', async function () {
            // Create a comment to reference
            const existingComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>This is an existing comment</p>'
            });

            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 1).id;

            // Try to create a top-level comment with in_reply_to_id (should be ignored)
            const commentData = {
                post_id: targetPostId,
                in_reply_to_id: existingComment.id, // This should be ignored since no parent_id
                member_id: memberId,
                html: '<p>This is a top-level comment that incorrectly references another comment</p>'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            // Validate response structure
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.equal(typeof comment.id, 'string');
            assert.equal(comment.html, '<p>This is a top-level comment that incorrectly references another comment</p>');
            assert.equal(comment.status, 'published');
            // For top-level comments, in_reply_to_id should be null
            assert.equal(comment.in_reply_to_id, null);
            assert.equal(comment.in_reply_to_snippet, null);
            assert.ok(comment.member);
            assert.equal(comment.member.id, memberId);
        });

        it('Ignores in_reply_to_id when referenced comment has different parent', async function () {
            // Create two separate parent comments
            const parentComment1 = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>This is parent comment 1</p>'
            });

            const parentComment2 = await dbFns.addComment({
                member_id: fixtureManager.get('members', 1).id,
                html: '<p>This is parent comment 2</p>'
            });

            // Create a reply under parent comment 1
            const replyToParent1 = await dbFns.addComment({
                member_id: fixtureManager.get('members', 2).id,
                parent_id: parentComment1.id,
                html: '<p>This is a reply to parent 1</p>'
            });

            const memberId = fixtureManager.get('members', 3).id;

            // Try to create a reply under parent comment 2 but reference a reply from parent comment 1
            const replyData = {
                parent_id: parentComment2.id,
                in_reply_to_id: replyToParent1.id, // This should be ignored - different parent
                member_id: memberId,
                html: '<p>This reply has mismatched parent and in_reply_to</p>'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [replyData]})
                .expectStatus(201);

            // Validate response structure
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const reply = response.body.comments[0];
            assert.equal(typeof reply.id, 'string');
            assert.equal(reply.html, '<p>This reply has mismatched parent and in_reply_to</p>');
            assert.equal(reply.status, 'published');
            // in_reply_to should be ignored due to parent mismatch
            assert.equal(reply.in_reply_to_id, null);
            assert.equal(reply.in_reply_to_snippet, null);
            assert.ok(reply.member);
            assert.equal(reply.member.id, memberId);
        });

        it('Does not send notifications when adding comments via Admin API', async function () {
            // Create a comment that would normally trigger notifications
            const targetPostId = postId;
            const memberId = fixtureManager.get('members', 1).id;

            const commentData = {
                post_id: targetPostId,
                member_id: memberId,
                html: '<p>This comment should not trigger notifications</p>'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [commentData]})
                .expectStatus(201);

            // Validate the comment was created successfully
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const comment = response.body.comments[0];
            assert.equal(typeof comment.id, 'string');
            assert.equal(comment.html, '<p>This comment should not trigger notifications</p>');
            assert.equal(comment.status, 'published');

            // Verify NO emails were sent (internal context should prevent notifications)
            emailMockReceiver.assertSentEmailCount(0);
        });

        it('Does not send notifications when adding replies via Admin API', async function () {
            // Create a parent comment first
            const parentComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>This is the parent comment</p>'
            });

            // Clear any emails from the parent comment creation
            emailMockReceiver = mockManager.mockMail();

            // Create a reply that would normally trigger notifications
            const memberId = fixtureManager.get('members', 1).id;
            const replyData = {
                parent_id: parentComment.id,
                member_id: memberId,
                html: '<p>This reply should not trigger notifications</p>'
            };

            const response = await adminApi
                .post('comments/')
                .body({comments: [replyData]})
                .expectStatus(201);

            // Validate the reply was created successfully
            assert.ok(Array.isArray(response.body.comments));
            assert.equal(response.body.comments.length, 1);

            const reply = response.body.comments[0];
            assert.equal(typeof reply.id, 'string');
            assert.equal(reply.html, '<p>This reply should not trigger notifications</p>');
            assert.equal(reply.status, 'published');

            // Verify NO emails were sent (internal context should prevent notifications)
            emailMockReceiver.assertSentEmailCount(0);
        });
    });

    describe('Browse All', function () {
        // Matcher for root comments (includes count.replies alias)
        const commentMatcher = {
            id: anyObjectId,
            parent_id: nullable(anyObjectId),
            created_at: anyISODateTime,
            edited_at: nullable(anyISODateTime),
            member: {
                id: anyObjectId,
                uuid: anyUuid
            },
            post: {
                id: anyObjectId,
                uuid: anyUuid,
                url: anyString
            },
            count: {
                likes: anyNumber,
                replies: anyNumber,
                direct_replies: anyNumber,
                reports: anyNumber
            }
        };
        // Matcher for child comments (no count.replies — alias is root-only)
        const childCommentMatcher = {
            ...commentMatcher,
            count: {
                likes: anyNumber,
                direct_replies: anyNumber,
                reports: anyNumber
            }
        };
        const parentMatcher = {
            id: anyObjectId,
            parent_id: nullable(anyObjectId),
            in_reply_to_id: nullable(anyObjectId),
            edited_at: nullable(anyISODateTime),
            created_at: anyISODateTime
        };
        const commentMatcherWithParent = {
            ...childCommentMatcher,
            parent: parentMatcher
        };

        it('Can browse all comments across posts', async function () {
            await dbFns.addComment({
                post_id: fixtureManager.get('posts', 0).id,
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Comment on post 1</p>'
            });
            await dbFns.addComment({
                post_id: fixtureManager.get('posts', 1).id,
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Comment on post 2</p>'
            });

            await adminApi.get('/comments/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher, commentMatcher]
                });
        });

        it('Returns flat list including replies by default', async function () {
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Parent</p>',
                replies: [{member_id: fixtureManager.get('members', 1).id, html: '<p>Reply</p>'}]
            });

            // Both parent and reply appear as separate items in flat list
            await adminApi.get('/comments/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher, commentMatcherWithParent]
                });
        });

        it('Returns only top-level with include_nested=false', async function () {
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Parent</p>',
                replies: [{member_id: fixtureManager.get('members', 1).id, html: '<p>Reply</p>'}]
            });

            // Only parent returned (no nested replies in flat moderation view)
            await adminApi.get('/comments/?include_nested=false')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher]
                });
        });

        it('Includes hidden comments with full html for admin', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Hidden comment</p>',
                status: 'hidden'
            });

            await adminApi.get('/comments/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher]
                });
        });

        it('Excludes deleted comments', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Published</p>',
                status: 'published'
            });
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Deleted</p>',
                status: 'deleted'
            });

            // Only published is returned, deleted is excluded
            await adminApi.get('/comments/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher]
                });
        });

        it('Excludes deleted comments even when they have published replies', async function () {
            await dbFns.addCommentWithReplies({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Deleted parent</p>',
                status: 'deleted',
                replies: [{
                    member_id: fixtureManager.get('members', 1).id,
                    html: '<p>Published reply</p>',
                    status: 'published'
                }]
            });

            // Only the reply is returned - admin always excludes deleted comments
            await adminApi.get('/comments/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcherWithParent]
                });
        });

        it('Can filter by status', async function () {
            await dbFns.addComment({member_id: fixtureManager.get('members', 0).id, status: 'published'});
            await dbFns.addComment({member_id: fixtureManager.get('members', 0).id, status: 'hidden'});

            await adminApi.get('/comments/?filter=' + encodeURIComponent('status:hidden'))
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher]
                });
        });

        it('Can filter by member_id', async function () {
            await dbFns.addComment({member_id: fixtureManager.get('members', 0).id});
            await dbFns.addComment({member_id: fixtureManager.get('members', 1).id});

            await adminApi.get('/comments/?filter=' + encodeURIComponent(`member_id:'${fixtureManager.get('members', 0).id}'`))
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher]
                });
        });

        it('Supports pagination', async function () {
            for (let i = 0; i < 5; i++) {
                await dbFns.addComment({member_id: fixtureManager.get('members', 0).id});
            }

            await adminApi.get('/comments/?limit=2&page=1')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher, commentMatcher]
                });
        });

        it('Orders by created_at desc by default', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Older</p>',
                created_at: new Date('2023-01-01')
            });
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Newer</p>',
                created_at: new Date('2023-06-01')
            });

            await adminApi.get('/comments/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher, commentMatcher]
                });
        });

        it('Can order by created_at asc', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Older</p>',
                created_at: new Date('2023-01-01')
            });
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Newer</p>',
                created_at: new Date('2023-06-01')
            });

            await adminApi.get('/comments/?order=' + encodeURIComponent('created_at asc'))
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher, commentMatcher]
                });
        });

        it('Always includes member and post relations', async function () {
            await dbFns.addComment({member_id: fixtureManager.get('members', 0).id});

            await adminApi.get('/comments/')
                .expectStatus(200)
                .matchBodySnapshot({
                    comments: [commentMatcher]
                });
        });

        it('Includes reports count for comments with reports', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Comment with reports</p>'
            });

            // Add reports to the comment
            await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 2).id
            });

            const res = await adminApi.get('/comments/');
            assert.equal(res.body.comments[0].count.reports, 2);
        });

        it('Returns zero reports count for comments without reports', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Comment without reports</p>'
            });

            const res = await adminApi.get('/comments/');
            assert.equal(res.body.comments[0].count.reports, 0);
        });

        it('Can filter for reported comments using count.reports:>0', async function () {
            const reportedComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Reported comment</p>'
            });
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Non-reported comment</p>'
            });

            // Add a report to one comment
            await models.CommentReport.add({
                comment_id: reportedComment.id,
                member_id: fixtureManager.get('members', 1).id
            });

            const res = await adminApi.get('/comments/?filter=' + encodeURIComponent('count.reports:>0'));
            assert.equal(res.body.comments.length, 1);
            assert.equal(res.body.comments[0].html, '<p>Reported comment</p>');
        });

        it('Can filter for non-reported comments using count.reports:0', async function () {
            const reportedComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Reported comment</p>'
            });
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Non-reported comment</p>'
            });

            // Add a report to one comment
            await models.CommentReport.add({
                comment_id: reportedComment.id,
                member_id: fixtureManager.get('members', 1).id
            });

            const res = await adminApi.get('/comments/?filter=' + encodeURIComponent('count.reports:0'));
            assert.equal(res.body.comments.length, 1);
            assert.equal(res.body.comments[0].html, '<p>Non-reported comment</p>');
        });

        it('Can filter for highly reported comments using count.reports:>=2', async function () {
            const highlyReportedComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Highly reported comment</p>'
            });
            const singleReportComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Single report comment</p>'
            });
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Non-reported comment</p>'
            });

            // Add multiple reports to one comment
            await models.CommentReport.add({
                comment_id: highlyReportedComment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await models.CommentReport.add({
                comment_id: highlyReportedComment.id,
                member_id: fixtureManager.get('members', 2).id
            });
            // Add single report to another
            await models.CommentReport.add({
                comment_id: singleReportComment.id,
                member_id: fixtureManager.get('members', 1).id
            });

            const res = await adminApi.get('/comments/?filter=' + encodeURIComponent('count.reports:>=2'));
            assert.equal(res.body.comments.length, 1);
            assert.equal(res.body.comments[0].html, '<p>Highly reported comment</p>');
            assert.equal(res.body.comments[0].count.reports, 2);
        });

        it('Can combine count.reports filter with other filters', async function () {
            const reportedComment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Reported published</p>',
                status: 'published'
            });
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Non-reported published</p>',
                status: 'published'
            });

            // Add report to one comment
            await models.CommentReport.add({
                comment_id: reportedComment.id,
                member_id: fixtureManager.get('members', 1).id
            });

            const filter = encodeURIComponent('count.reports:>0+status:published');
            const res = await adminApi.get('/comments/?filter=' + filter);
            assert.equal(res.body.comments.length, 1);
            assert.equal(res.body.comments[0].html, '<p>Reported published</p>');
        });
    });

    describe('Comment Reports', function () {
        const reportMatcher = {
            id: anyObjectId,
            comment_id: anyObjectId,
            member_id: anyObjectId,
            created_at: anyISODateTime,
            updated_at: anyISODateTime,
            member: {
                id: anyObjectId,
                uuid: anyUuid,
                created_at: anyISODateTime,
                updated_at: anyISODateTime,
                transient_id: anyString,
                last_seen_at: nullable(anyISODateTime),
                last_commented_at: nullable(anyISODateTime)
            }
        };

        it('Can browse reporters for a comment', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Reported comment</p>'
            });

            // Add reports from different members
            await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 2).id
            });

            await adminApi.get(`/comments/${comment.id}/reports/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    comment_reports: [reportMatcher, reportMatcher]
                });
        });

        it('Returns empty list for comment with no reports', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Unreported comment</p>'
            });

            await adminApi.get(`/comments/${comment.id}/reports/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    comment_reports: []
                });
        });

        it('Supports pagination', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Highly reported comment</p>'
            });

            // Add reports from multiple members
            await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 2).id
            });
            await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 3).id
            });

            const res = await adminApi.get(`/comments/${comment.id}/reports/?limit=2`);
            assert.equal(res.body.comment_reports.length, 2);
            assert.equal(res.body.meta.pagination.total, 3);
            assert.equal(res.body.meta.pagination.pages, 2);
        });

        it('Orders reports by created_at desc', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Reported comment</p>'
            });

            // Add reports at different times
            const olderReport = await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await db.knex('comment_reports')
                .where('id', olderReport.id)
                .update({created_at: new Date('2023-01-01')});

            const newerReport = await models.CommentReport.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 2).id
            });
            await db.knex('comment_reports')
                .where('id', newerReport.id)
                .update({created_at: new Date('2023-06-01')});

            const res = await adminApi.get(`/comments/${comment.id}/reports/`);
            assert.equal(res.body.comment_reports.length, 2);
            // Newer report should be first
            assert.equal(res.body.comment_reports[0].member_id, fixtureManager.get('members', 2).id);
            assert.equal(res.body.comment_reports[1].member_id, fixtureManager.get('members', 1).id);
        });

        it('Returns 404 for non-existent comment', async function () {
            const fakeCommentId = '507f1f77bcf86cd799439011';

            await adminApi.get(`/comments/${fakeCommentId}/reports/`)
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });

    describe('Comment Likes', function () {
        const likeMatcher = {
            id: anyObjectId,
            comment_id: anyObjectId,
            member_id: anyObjectId,
            created_at: anyISODateTime,
            updated_at: anyISODateTime,
            member: {
                id: anyObjectId,
                uuid: anyUuid,
                created_at: anyISODateTime,
                updated_at: anyISODateTime,
                transient_id: anyString,
                last_seen_at: nullable(anyISODateTime),
                last_commented_at: nullable(anyISODateTime)
            }
        };

        it('Can browse comment likes', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Liked comment</p>'
            });

            // Add likes from different members
            await models.CommentLike.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await models.CommentLike.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 2).id
            });

            await adminApi.get(`/comments/${comment.id}/likes/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    comment_likes: [likeMatcher, likeMatcher]
                });
        });

        it('Returns empty list for comment with no likes', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Unliked comment</p>'
            });

            await adminApi.get(`/comments/${comment.id}/likes/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    comment_likes: []
                });
        });

        it('Supports pagination', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Popular comment</p>'
            });

            // Add likes from multiple members
            await models.CommentLike.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await models.CommentLike.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 2).id
            });
            await models.CommentLike.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 3).id
            });

            const res = await adminApi.get(`/comments/${comment.id}/likes/?limit=2`);
            assert.equal(res.body.comment_likes.length, 2);
            assert.equal(res.body.meta.pagination.total, 3);
            assert.equal(res.body.meta.pagination.pages, 2);
        });

        it('Orders likes by created_at desc', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Liked comment</p>'
            });

            // Add likes at different times
            const olderLike = await models.CommentLike.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 1).id
            });
            await db.knex('comment_likes')
                .where('id', olderLike.id)
                .update({created_at: new Date('2023-01-01')});

            const newerLike = await models.CommentLike.add({
                comment_id: comment.id,
                member_id: fixtureManager.get('members', 2).id
            });
            await db.knex('comment_likes')
                .where('id', newerLike.id)
                .update({created_at: new Date('2023-06-01')});

            const res = await adminApi.get(`/comments/${comment.id}/likes/`);
            assert.equal(res.body.comment_likes.length, 2);
            // Newer like should be first
            assert.equal(res.body.comment_likes[0].member_id, fixtureManager.get('members', 2).id);
            assert.equal(res.body.comment_likes[1].member_id, fixtureManager.get('members', 1).id);
        });

        it('Returns 404 for non-existent comment', async function () {
            const fakeCommentId = '507f1f77bcf86cd799439011';

            await adminApi.get(`/comments/${fakeCommentId}/likes/`)
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });

    describe('API Key Permissions', function () {
        let restrictedApiKeyId;
        let restrictedApiKeySecret;

        before(async function () {
            // Create a role with NO comment permissions for testing
            const roleId = ObjectId().toHexString();
            await db.knex('roles').insert({
                id: roleId,
                name: 'Test No Comment Permissions',
                description: 'Test role with no comment permissions',
                created_at: new Date(),
                updated_at: new Date()
            });

            // Create integration
            const integrationId = ObjectId().toHexString();
            await db.knex('integrations').insert({
                id: integrationId,
                name: 'Test No Comment Permissions Integration',
                slug: 'test-no-comment-perms',
                type: 'custom',
                created_at: new Date(),
                updated_at: new Date()
            });

            // Create API key with the restricted role (bypass model hooks)
            restrictedApiKeyId = ObjectId().toHexString();
            restrictedApiKeySecret = security.secret.create('admin');
            await db.knex('api_keys').insert({
                id: restrictedApiKeyId,
                type: 'admin',
                secret: restrictedApiKeySecret,
                role_id: roleId,
                integration_id: integrationId,
                created_at: new Date(),
                updated_at: new Date()
            });
        });

        afterEach(async function () {
            await adminApi.loginAsOwner();
        });

        it('API key without comment permissions cannot hide comments', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Comment to hide</p>',
                status: 'published'
            });

            await adminApi.useToken(restrictedApiKeyId, restrictedApiKeySecret);

            await adminApi.put(`comments/${comment.id}/`)
                .body({
                    comments: [{
                        id: comment.id,
                        status: 'hidden'
                    }]
                })
                .expectStatus(403)
                .matchBodySnapshot({
                    errors: [{
                        id: anyUuid
                    }]
                });
        });

        it('API key without comment permissions cannot browse comments', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: '<p>Test comment</p>'
            });

            await adminApi.useToken(restrictedApiKeyId, restrictedApiKeySecret);

            await adminApi.get('/comments/')
                .expectStatus(403)
                .matchBodySnapshot({
                    errors: [{
                        id: anyUuid
                    }]
                });
        });
    });
});
