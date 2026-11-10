const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const commentsService = require('../../../core/server/services/comments').default;
const testUtils = require('../../utils');
const { mockSetting, restore: restoreMocks } = require('../../utils/e2e-framework-mock-manager');

describe('CommentsService', function () {
  beforeAll(testUtils.teardownDb);
  beforeEach(testUtils.setup('default'));
  afterEach(testUtils.teardownDb);

  beforeEach(async function () {
    await commentsService.init();
    mockSetting('comments_enabled', 'all');
  });

  afterEach(function () {
    restoreMocks();
  });

  async function addComment(data) {
    const post = await models.Post.findOne({}, testUtils.context.internal);
    const email = 'comment-service-test@example.com';
    const member =
      (await models.Member.findOne({ email }, testUtils.context.internal)) ||
      (await models.Member.add({ email, email_disabled: false }, testUtils.context.internal));

    return models.Comment.add(
      { html: '<p>Hello.</p>', member_id: member.id, post_id: post.id, ...data },
      testUtils.context.internal,
    );
  }

  describe('root', function () {
    it('init resolves undefined and publishes a controller bound to the api', async function () {
      const result = await commentsService.init();

      // Compare the type: a failure message that inspects the service would
      // serialise the whole model graph.
      assert.equal(typeof result, 'undefined');
      assert.equal(commentsService.service.controller.service, commentsService.service.api);
    });

    it('repeated init retains the api and the controller', async function () {
      const { api, controller } = commentsService.service;

      await commentsService.init();

      assert.equal(commentsService.service.api, api);
      assert.equal(commentsService.service.controller, controller);
    });

    it('reads the comments_enabled setting on every access and treats unknown values as off', function () {
      mockSetting('comments_enabled', 'paid');
      assert.equal(commentsService.service.api.enabled, 'paid');

      mockSetting('comments_enabled', 'sometimes');
      assert.equal(commentsService.service.api.enabled, 'off');
    });

    it('counts only published comments per post through the wired stats', async function () {
      const comment = await addComment({});
      const hiddenComment = await addComment({});
      await testUtils.knex('comments').where({ id: hiddenComment.id }).update({ status: 'hidden' });
      const postId = comment.get('post_id');

      const counts = await commentsService.service.controller.count({
        options: { ids: postId },
      });

      assert.deepEqual(counts, { [postId]: 1 });
    });
  });

  describe('getComments', function () {
    it('computes pinned state when requested', async function () {
      const post = await models.Post.findOne({}, testUtils.context.internal);
      const member = await models.Member.add(
        {
          email: 'comment-service-test@example.com',
          email_disabled: false,
        },
        testUtils.context.internal,
      );
      const comment = await models.Comment.add(
        {
          html: '<p>First.</p>',
          member_id: member.id,
          post_id: post.id,
        },
        testUtils.context.internal,
      );
      const hiddenComment = await models.Comment.add(
        {
          html: '<p>Hidden.</p>',
          member_id: member.id,
          post_id: post.id,
        },
        testUtils.context.internal,
      );
      const commentId = comment.id;
      const hiddenCommentId = hiddenComment.id;

      await testUtils
        .knex('comments')
        .where({ id: commentId })
        .update({
          pinned_at: new Date('2026-01-01T00:00:00.000Z'),
        });
      await testUtils
        .knex('comments')
        .where({ id: hiddenCommentId })
        .update({
          pinned_at: new Date('2026-01-01T00:00:00.000Z'),
          status: 'hidden',
        });

      const adminComments = await commentsService.service.api.getAdminComments({
        columns: ['id', 'pinned'],
        filter: `id:'${hiddenCommentId}'`,
      });
      const publicComments = await commentsService.service.api.getComments({
        columns: ['id', 'pinned'],
        filter: `id:'${commentId}'`,
      });
      const regularComments = await commentsService.service.api.getComments({
        columns: ['id'],
        filter: `id:'${commentId}'`,
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
