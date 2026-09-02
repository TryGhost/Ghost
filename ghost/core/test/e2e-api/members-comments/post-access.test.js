const assert = require('node:assert/strict');
const sinon = require('sinon');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Comments API post access', function () {
  let anonymousAgent;
  let freeAgent;
  let tierAgent;
  let paidAgent;
  let adminAgent;
  const threads = {};

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    anonymousAgent = agents.membersAgent;
    adminAgent = agents.adminAgent;
    await fixtureManager.init('posts', 'members');
    await adminAgent.loginAsOwner();

    freeAgent = anonymousAgent.duplicate();
    tierAgent = anonymousAgent.duplicate();
    paidAgent = anonymousAgent.duplicate();
    await freeAgent.loginAs('free-reader@example.com');
    await tierAgent.loginAs('tier-reader@example.com');
    await paidAgent.loginAs('paid-reader@example.com');

    const tier = await models.Product.findOne({ type: 'paid' }, { require: true });
    const tierMember = await models.Member.findOne({ email: 'tier-reader@example.com' });
    const paidMember = await models.Member.findOne({ email: 'paid-reader@example.com' });
    await models.Member.edit(
      { status: 'comped', products: [{ id: tier.id }] },
      { id: tierMember.id },
    );
    await models.Member.edit({ status: 'paid' }, { id: paidMember.id });

    for (const visibility of ['public', 'members', 'paid', 'tiers']) {
      const post = await models.Post.add(
        {
          title: `${visibility} discussion`,
          status: 'published',
          visibility,
          ...(visibility === 'tiers' ? { tiers: [{ id: tier.id }] } : {}),
        },
        { context: { internal: true } },
      );
      const comment = await models.Comment.add({
        post_id: post.id,
        member_id: tierMember.id,
        html: `<p>${visibility} comment</p>`,
      });
      const reply = await models.Comment.add({
        post_id: post.id,
        member_id: tierMember.id,
        parent_id: comment.id,
        html: `<p>${visibility} reply</p>`,
      });
      threads[visibility] = { post, comment, reply };
    }
  });

  beforeEach(function () {
    mockManager.mockSetting('comments_enabled', 'all');
  });

  afterEach(function () {
    sinon.restore();
    mockManager.restore();
  });

  const readers = [
    ['anonymous', () => anonymousAgent, ['public']],
    ['free', () => freeAgent, ['public', 'members']],
    ['paid without the tier', () => paidAgent, ['public', 'members', 'paid']],
    ['subscribed to the tier', () => tierAgent, ['public', 'members', 'paid', 'tiers']],
  ];

  for (const [reader, getAgent, allowedVisibilities] of readers) {
    for (const visibility of ['public', 'members', 'paid', 'tiers']) {
      it(`enforces ${visibility} access for a reader who is ${reader}`, async function () {
        const { post, comment, reply } = threads[visibility];
        const allowed = allowedVisibilities.includes(visibility);
        const urls = [
          `/api/comments/post/${post.id}/?include=post,member`,
          `/api/comments/?filter=${encodeURIComponent(`post_id:'${post.id}'+status:published`)}`,
          `/api/comments/${comment.id}/?fields=id,html`,
          `/api/comments/${comment.id}/replies/?limit=1`,
          `/api/comments/${reply.id}/?fields=id,html`,
        ];

        for (const url of urls) {
          const { body } = await getAgent()
            .get(url)
            .expectStatus(allowed ? 200 : 403);
          if (allowed) {
            assert.equal(body.comments.length, 1);
            assert.match(body.comments[0].html, new RegExp(visibility));
          } else {
            assert.equal(body.comments, undefined);
            assert.equal(body.errors[0].type, 'NoPermissionError');
          }
        }
      });
    }
  }

  it('rejects unscoped and multi-post browsing', async function () {
    const publicId = threads.public.post.id;
    const paidId = threads.paid.post.id;
    for (const filter of [
      '',
      `post_id:'${publicId}',post_id:'${paidId}'`,
      `post_id:['${publicId}','${paidId}']`,
      `post_id:-'${publicId}'`,
      `(post_id:'${publicId}',status:published)+status:-deleted`,
    ]) {
      await anonymousAgent
        .get(`/api/comments/?filter=${encodeURIComponent(filter)}`)
        .expectStatus(422);
    }
  });

  it('returns a bad request for malformed legacy filters', async function () {
    for (const filter of ['post_id:', "post_id:'test'+", '(']) {
      const { body } = await anonymousAgent
        .get(`/api/comments/?filter=${encodeURIComponent(filter)}`)
        .expectStatus(400);

      assert.equal(body.errors[0].type, 'BadRequestError');
    }
  });

  it('keeps the authorized post scope when a filter also names a restricted post', async function () {
    const publicId = threads.public.post.id;
    const paidId = threads.paid.post.id;
    const filter = encodeURIComponent(`post_id:'${publicId}',post_id:'${paidId}'`);
    const { body } = await anonymousAgent
      .get(`/api/comments/post/${publicId}/?filter=${filter}`)
      .expectStatus(200);

    assert.deepEqual(
      body.comments.map((comment) => comment.id),
      [threads.public.comment.id],
    );
  });

  it('does not load the whole thread before fetching a page of replies', async function () {
    const { post, comment } = threads.public;
    await models.Comment.add({
      post_id: post.id,
      member_id: comment.get('member_id'),
      parent_id: comment.id,
      html: '<p>Another reply</p>',
    });
    const findOne = sinon.spy(models.Comment, 'findOne');

    const { body } = await anonymousAgent
      .get(`/api/comments/${comment.id}/replies/?limit=1`)
      .expectStatus(200);

    assert.equal(body.comments.length, 1);
    assert.equal(body.meta.pagination.total, 2);
    sinon.assert.notCalled(findOne);
  });

  it('allows admins to moderate tier-restricted comments without a member session', async function () {
    const { post, comment } = threads.tiers;
    for (const url of [
      `comments/post/${post.id}/`,
      `comments/${comment.id}/`,
      `comments/${comment.id}/replies/`,
    ]) {
      const { body } = await adminAgent.get(url).expectStatus(200);
      assert.equal(body.comments.length, 1);
    }
  });

  for (const [reaction, score] of [
    ['like', 1],
    ['dislike', -1],
  ]) {
    it(`rejects unauthorized ${reaction} changes before mutating the vote`, async function () {
      const { comment } = threads.paid;
      const member = await models.Member.findOne({ email: 'free-reader@example.com' });
      const voteData = { comment_id: comment.id, member_id: member.id, score };
      const url = `/api/comments/${comment.id}/${reaction}/`;

      await freeAgent.post(url).expectStatus(403);
      assert.equal(await models.CommentLike.findOne(voteData), null);

      // Simulate a vote cast while the member still had access to the post.
      const vote = await models.CommentLike.add(voteData);
      try {
        await freeAgent.delete(url).expectStatus(403);
        assert.ok(await models.CommentLike.findOne({ id: vote.id }));
      } finally {
        await models.CommentLike.destroy({ id: vote.id });
      }
    });
  }

  for (const [action, updates] of [
    ['editing', { html: '<p>Updated owner comment</p>' }],
    ['deleting', { status: 'deleted' }],
  ]) {
    it(`requires post access when ${action} an owned comment`, async function () {
      const member = await models.Member.findOne({ email: 'free-reader@example.com' });
      const { post, comment: otherComment } = threads.paid;
      // The owner no longer has access to a discussion they previously joined.
      const comment = await models.Comment.add({
        post_id: post.id,
        member_id: member.id,
        html: '<p>Owner comment</p>',
      });
      await models.Comment.add({
        post_id: post.id,
        member_id: otherComment.get('member_id'),
        parent_id: comment.id,
        html: '<p>Another member reply</p>',
      });

      await freeAgent.get(`/api/comments/${comment.id}/`).expectStatus(403);
      const { body } = await freeAgent
        .put(`/api/comments/${comment.id}/`)
        .body({ comments: [updates] })
        .expectStatus(403);

      assert.equal(body.comments, undefined);
      const unchanged = await models.Comment.findOne({ id: comment.id });
      assert.equal(unchanged.get('status'), 'published');
      assert.equal(unchanged.get('html'), '<p>Owner comment</p>');
    });
  }
});
