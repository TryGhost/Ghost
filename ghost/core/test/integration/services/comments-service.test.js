const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const commentsService = require('../../../core/server/services/comments');
const testUtils = require('../../utils');
const {mockSetting, restore: restoreMocks} = require('../../utils/e2e-framework-mock-manager');

describe('CommentsService', function () {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('default'));
    afterEach(testUtils.teardownDb);

    beforeEach(function () {
        commentsService.init();
        mockSetting('comments_enabled', 'all');
    });

    afterEach(function () {
        restoreMocks();
    });

    describe('getComments', function () {
        it('computes pinned state when requested', async function () {
            const post = await models.Post.findOne({}, testUtils.context.internal);
            const member = await models.Member.add({
                email: 'comment-service-test@example.com',
                email_disabled: false
            }, testUtils.context.internal);
            const comment = await models.Comment.add({
                html: '<p>First.</p>',
                member_id: member.id,
                post_id: post.id
            }, testUtils.context.internal);
            const hiddenComment = await models.Comment.add({
                html: '<p>Hidden.</p>',
                member_id: member.id,
                post_id: post.id
            }, testUtils.context.internal);
            const commentId = comment.id;
            const hiddenCommentId = hiddenComment.id;

            await testUtils.knex('comments').where({id: commentId}).update({
                pinned_at: new Date('2026-01-01T00:00:00.000Z')
            });
            await testUtils.knex('comments').where({id: hiddenCommentId}).update({
                pinned_at: new Date('2026-01-01T00:00:00.000Z'),
                status: 'hidden'
            });

            const adminComments = await commentsService.api.getAdminComments({
                columns: ['id', 'pinned'],
                filter: `id:'${hiddenCommentId}'`
            });
            const publicComments = await commentsService.api.getComments({
                columns: ['id', 'pinned'],
                filter: `id:'${commentId}'`
            });
            const regularComments = await commentsService.api.getComments({
                columns: ['id'],
                filter: `id:'${commentId}'`
            });

            const adminComment = adminComments.data[0];
            const publicComment = publicComments.data[0];
            const regularComment = regularComments.data[0];

            assert.equal(Boolean(adminComment.get('pinned')), true);
            assert.equal(Boolean(publicComment.get('pinned')), true);
            assert.equal(regularComment.get('pinned'), undefined);
        });
    });
});
