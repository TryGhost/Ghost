const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, configUtils, dbUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const sinon = require('sinon');
const settingsCache = require('../../../core/shared/settings-cache');

let membersAgent, membersAgent2, postId;
let loggedInMember, loggedInMember2;

describe('Comments Member Info endpoint', function () {
    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        membersAgent2 = membersAgent.duplicate();

        await fixtureManager.init('posts', 'members');

        postId = fixtureManager.get('posts', 0).id;
    });

    beforeEach(async function () {
        mockManager.mockMail();

        await dbUtils.truncate('comments');
        await dbUtils.truncate('comment_likes');
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
    });

    describe('when not authenticated', function () {
        it('returns 204 for unauthenticated request', async function () {
            const unauthAgent = membersAgent.duplicate();
            await unauthAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(204)
                .expectEmptyBody();
        });
    });

    describe('when authenticated', function () {
        let getStub;

        before(async function () {
            await membersAgent.loginAs('member@example.com');
            loggedInMember = await models.Member.findOne({email: 'member@example.com'}, {require: true});
            await membersAgent2.loginAs('member2@example.com');
            loggedInMember2 = await models.Member.findOne({email: 'member2@example.com'}, {require: true});
        });

        beforeEach(function () {
            getStub = sinon.stub(settingsCache, 'get');
            getStub.callsFake((key, options) => {
                if (key === 'comments_enabled') {
                    return 'all';
                }
                return getStub.wrappedMethod.call(settingsCache, key, options);
            });
        });

        it('returns member info with empty arrays when no interactions', async function () {
            const {body} = await membersAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.ok(body.member);
            assert.equal(body.member.uuid, loggedInMember.get('uuid'));
            assert.equal(body.member.name, loggedInMember.get('name'));
            assert.ok(typeof body.member.can_comment === 'boolean');
            assert.ok(typeof body.member.paid === 'boolean');
            assert.deepEqual(body.liked_comments, []);
            assert.deepEqual(body.authored_comments, []);
        });

        it('returns liked comment IDs for the post', async function () {
            const comment1 = await models.Comment.add({
                post_id: postId,
                member_id: loggedInMember2.get('id'),
                html: '<p>Comment 1</p>'
            });
            const comment2 = await models.Comment.add({
                post_id: postId,
                member_id: loggedInMember2.get('id'),
                html: '<p>Comment 2</p>'
            });

            // Like comment1 as loggedInMember
            await models.CommentLike.add({
                comment_id: comment1.get('id'),
                member_id: loggedInMember.get('id')
            });

            const {body} = await membersAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.deepEqual(body.liked_comments, [comment1.get('id')]);
            assert.ok(!body.liked_comments.includes(comment2.get('id')));
        });

        it('returns authored comment IDs for the post', async function () {
            const myComment = await models.Comment.add({
                post_id: postId,
                member_id: loggedInMember.get('id'),
                html: '<p>My comment</p>'
            });

            // Another member's comment
            await models.Comment.add({
                post_id: postId,
                member_id: loggedInMember2.get('id'),
                html: '<p>Their comment</p>'
            });

            const {body} = await membersAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.deepEqual(body.authored_comments, [myComment.get('id')]);
        });

        it('only returns interactions for the specified post', async function () {
            const otherPostId = fixtureManager.get('posts', 1).id;

            // Like a comment on target post
            const targetComment = await models.Comment.add({
                post_id: postId,
                member_id: loggedInMember2.get('id'),
                html: '<p>Target post comment</p>'
            });
            await models.CommentLike.add({
                comment_id: targetComment.get('id'),
                member_id: loggedInMember.get('id')
            });

            // Like a comment on a different post
            const otherComment = await models.Comment.add({
                post_id: otherPostId,
                member_id: loggedInMember2.get('id'),
                html: '<p>Other post comment</p>'
            });
            await models.CommentLike.add({
                comment_id: otherComment.get('id'),
                member_id: loggedInMember.get('id')
            });

            // Author a comment on the other post
            await models.Comment.add({
                post_id: otherPostId,
                member_id: loggedInMember.get('id'),
                html: '<p>My other post comment</p>'
            });

            const {body} = await membersAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.deepEqual(body.liked_comments, [targetComment.get('id')]);
            assert.deepEqual(body.authored_comments, []);
        });

        it('reflects likes and unlikes correctly', async function () {
            const comment = await models.Comment.add({
                post_id: postId,
                member_id: loggedInMember2.get('id'),
                html: '<p>Likeable comment</p>'
            });

            // Like it via API
            await membersAgent
                .post(`/api/comments/${comment.get('id')}/like/`)
                .expectStatus(204);

            let res = await membersAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.deepEqual(res.body.liked_comments, [comment.get('id')]);

            // Unlike it via API
            await membersAgent
                .delete(`/api/comments/${comment.get('id')}/like/`)
                .expectStatus(204);

            res = await membersAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.deepEqual(res.body.liked_comments, []);
        });

        it('returns different data for different members', async function () {
            const comment = await models.Comment.add({
                post_id: postId,
                member_id: loggedInMember.get('id'),
                html: '<p>Member 1 comment</p>'
            });

            // Member 2 likes it
            await models.CommentLike.add({
                comment_id: comment.get('id'),
                member_id: loggedInMember2.get('id')
            });

            // Member 1: authored, not liked
            const {body: body1} = await membersAgent
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.deepEqual(body1.authored_comments, [comment.get('id')]);
            assert.deepEqual(body1.liked_comments, []);

            // Member 2: liked, not authored
            const {body: body2} = await membersAgent2
                .get(`/api/comments/post/${postId}/member`)
                .expectStatus(200);

            assert.deepEqual(body2.authored_comments, []);
            assert.deepEqual(body2.liked_comments, [comment.get('id')]);
        });
    });
});
