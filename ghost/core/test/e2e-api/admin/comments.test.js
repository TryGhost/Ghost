const assert = require('assert/strict');
const {
    agentProvider,
    fixtureManager,
    mockManager,
    dbUtils,
    matchers
} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyISODateTime, anyUuid, anyNumber, anyBoolean} = matchers;
const models = require('../../../core/server/models');

const membersCommentMatcher = {
    id: anyObjectId,
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

            const res = await adminApi.get(`/comments/${parent.get('id')}/`);
            res.body.comments[0].replies.length.should.eql(3);
            res.body.comments[0].replies[0].member.should.be.an.Object().with.properties('id', 'uuid', 'name', 'avatar_image');
            res.body.comments[0].replies[0].should.be.an.Object().with.properties('id', 'html', 'status', 'created_at', 'member', 'count');
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

            const res = await adminApi.get('/comments/post/' + postId + '/');
            assert.equal(res.body.comments.length, 0);
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

            const res = await adminApi.get('/comments/post/' + postId + '/');

            const deletedComment = res.body.comments[0];
            assert.equal(deletedComment.html, 'Comment 1');

            const publishedReply = res.body.comments[0].replies[0];
            assert.equal(publishedReply.html, 'Reply 1');
        });

        it('does not return deleted comments with only deleted replies', async function () {
            await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'deleted'
            });

            const res = await adminApi.get('/comments/post/' + postId + '/');
            assert.equal(res.body.comments.length, 0);
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

            const res = await adminApi.get('/comments/post/' + postId + '/');
            const comment = res.body.comments[0];
            assert.equal(comment.replies.length, 2);
            assert.notEqual(comment.replies[0].status, 'deleted');
            assert.notEqual(comment.replies[1].status, 'deleted');
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

            const res = await adminApi.get('/comments/post/' + postId + '/');
            const comment = res.body.comments[0];
            assert.equal(comment.count.replies, 2);
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

        // TODO: Should this be possible?
        it('can get a deleted comment', async function () {
            const comment = await dbFns.addComment({
                member_id: fixtureManager.get('members', 0).id,
                html: 'Comment 1',
                status: 'deleted'
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

            const res = await adminApi.get(`/comments/${parent.id}/`);
            assert.equal(res.body.comments[0].replies.length, 0);
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
            res.body.comments[0].liked.should.eql(true);
        });

        it('can get comment liked status by impersonating member via admin get by comment id read route', async function () {
            const res = await adminApi.get(`/comments/${comment.get('id')}/?impersonate_member_uuid=${fixtureManager.get('members', 1).uuid}`);
            res.body.comments[0].liked.should.eql(true);
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
            res.body.comments[0].liked.should.eql(true);
        });
    });
});
