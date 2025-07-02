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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('id').which.is.a.String();
            comment.should.have.property('html', '<p>This is a test comment via Admin API</p>');
            comment.should.have.property('status', 'published');
            comment.should.have.property('member');
            comment.member.should.have.property('id', memberId);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('id').which.is.a.String();
            comment.should.have.property('html', '<p>This comment was created at a specific time</p>');
            comment.should.have.property('status', 'published');
            comment.should.have.property('created_at', customTimestamp);
            comment.should.have.property('member');
            comment.member.should.have.property('id', memberId);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const reply = response.body.comments[0];
            reply.should.have.property('id').which.is.a.String();
            reply.should.have.property('html', '<p>This is a reply via Admin API</p>');
            reply.should.have.property('status', 'published');
            reply.should.have.property('member');
            reply.member.should.have.property('id', memberId);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const reply = response.body.comments[0];
            reply.should.have.property('id').which.is.a.String();
            reply.should.have.property('html', '<p>This is a timestamped reply via Admin API</p>');
            reply.should.have.property('status', 'published');
            reply.should.have.property('created_at', customTimestamp);
            reply.should.have.property('member');
            reply.member.should.have.property('id', memberId);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('created_at');
            // The created_at should be a valid recent timestamp, not the invalid input
            const createdAt = new Date(comment.created_at);
            const now = new Date();
            const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
            // Should be created within the last few seconds
            timeDiff.should.be.lessThan(10000);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('created_at');
            // The created_at should not be the future date
            const createdAt = new Date(comment.created_at);
            const now = new Date();
            createdAt.should.not.eql(futureDate);
            // Should be created recently (within the last few seconds)
            const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
            timeDiff.should.be.lessThan(10000);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('created_at');
            // The created_at should be a valid recent timestamp
            const createdAt = new Date(comment.created_at);
            const now = new Date();
            const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
            timeDiff.should.be.lessThan(10000);
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

            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('created_at', validDate.toISOString());
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const reply = response.body.comments[0];
            reply.should.have.property('id').which.is.a.String();
            reply.should.have.property('html', '<p>This is a reply to the first reply via Admin API</p>');
            reply.should.have.property('status', 'published');
            reply.should.have.property('in_reply_to_id', firstReply.id);
            reply.should.have.property('in_reply_to_snippet', 'This is the first reply to the parent');
            reply.should.have.property('member');
            reply.member.should.have.property('id', memberId);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('id').which.is.a.String();
            comment.should.have.property('html', '<p>This is a top-level comment that incorrectly references another comment</p>');
            comment.should.have.property('status', 'published');
            // For top-level comments, in_reply_to_id should be null
            comment.should.have.property('in_reply_to_id', null);
            comment.should.have.property('in_reply_to_snippet', null);
            comment.should.have.property('member');
            comment.member.should.have.property('id', memberId);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const reply = response.body.comments[0];
            reply.should.have.property('id').which.is.a.String();
            reply.should.have.property('html', '<p>This reply has mismatched parent and in_reply_to</p>');
            reply.should.have.property('status', 'published');
            // in_reply_to should be ignored due to parent mismatch  
            reply.should.have.property('in_reply_to_id', null);
            reply.should.have.property('in_reply_to_snippet', null);
            reply.should.have.property('member');
            reply.member.should.have.property('id', memberId);
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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const comment = response.body.comments[0];
            comment.should.have.property('id').which.is.a.String();
            comment.should.have.property('html', '<p>This comment should not trigger notifications</p>');
            comment.should.have.property('status', 'published');

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
            response.body.should.have.property('comments');
            response.body.comments.should.be.an.Array().with.lengthOf(1);
            
            const reply = response.body.comments[0];
            reply.should.have.property('id').which.is.a.String();
            reply.should.have.property('html', '<p>This reply should not trigger notifications</p>');
            reply.should.have.property('status', 'published');

            // Verify NO emails were sent (internal context should prevent notifications)
            emailMockReceiver.assertSentEmailCount(0);
        });
    });
});
